import 'server-only'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateCardLimit } from './limit-calculator'
import { calculateLiveScore } from './index'
import { calculateDre }       from '@/services/dre/calculator'
import { getCurrentPeriod, getLastPeriods } from '@/lib/utils'
import type { DreEntry }     from '@/types/database.types'

// ─── Buscar cartão atual ──────────────────────────────────────────

export async function getCurrentCard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  const { data: card } = await supabase
    .from('credit_cards')
    .select(`
      *,
      contracts:active_contract_id (
        id, title, route_origin, route_destination,
        contract_value, route_km, status
      )
    `)
    .eq('owner_id', profile.id)
    .in('status', ['ativo', 'aprovado', 'em_analise', 'solicitado', 'sem_contrato'])
    .maybeSingle()

  return card
}

// ─── Solicitar cartão ──────────────────────────────────────────────

export async function requestCard(params: {
  contractId:    string
  candidatureId: string
}): Promise<{ success: boolean; cardId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') {
    return { success: false, error: 'Apenas caminhoneiros podem solicitar cartão de crédito' }
  }

  // Verificar se já tem cartão ativo
  const { data: existing } = await supabase
    .from('credit_cards')
    .select('id, status')
    .eq('owner_id', profile.id)
    .in('status', ['ativo', 'aprovado', 'em_analise', 'solicitado'])
    .maybeSingle()

  if (existing) {
    return { success: false, error: `Você já possui um cartão (status: ${existing.status})` }
  }

  // Verificar contrato ativo
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, status, contract_value, route_km, payment_type, duration_months')
    .eq('id', params.contractId)
    .eq('status', 'fechado')
    .single()

  if (!contract) {
    return { success: false, error: 'Contrato não encontrado ou não está fechado' }
  }

  // Calcular score e limite
  const scoreResult = await calculateLiveScore(profile.id)
  if (!scoreResult || !scoreResult.isEligible) {
    return { success: false, error: 'Score insuficiente. Mínimo de 3 meses de histórico necessário.' }
  }

  // DRE dos últimos 3 meses
  const periods = getLastPeriods(3)
  const { data: entries } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('owner_id', profile.id)
    .in('period', periods)

  const dreAtual = calculateDre((entries ?? []) as DreEntry[], getCurrentPeriod())

  const limitResult = calculateCardLimit({
    score: scoreResult.score,
    dre: {
      period:         getCurrentPeriod(),
      resultadoOp:    dreAtual.resultadoOperacional,
      margemOp:       dreAtual.margemOperacional,
      receitaMedia:   scoreResult.receitaMediaMensal,
      custoPerKm:     dreAtual.custoPerKm,
      mesesPositivos: scoreResult.mesesPositivos,
      totalMeses:     scoreResult.monthsOfData,
    },
    contract: {
      contractId:     contract.id,
      contractValue:  Number(contract.contract_value),
      routeKm:        Number(contract.route_km),
      durationMonths: contract.duration_months,
      paymentType:    contract.payment_type,
    },
  })

  if (!limitResult.canIssueCard) {
    return {
      success: false,
      error: limitResult.blockReasons[0] ?? 'Critérios não atendidos para emissão do cartão',
    }
  }

  // Criar solicitação
  const { data: card, error: insertErr } = await supabase
    .from('credit_cards')
    .insert({
      owner_id:              profile.id,
      active_contract_id:    params.contractId,
      candidature_id:        params.candidatureId,
      status:                'solicitado',
      limite_total:          limitResult.limiteTotal,
      limite_disponivel:     limitResult.limiteTotal,
      limite_utilizado:      0,
      score_aprovacao:       scoreResult.score,
      score_tier_aprovacao:  scoreResult.tier,
      dre_periodo_referencia: getCurrentPeriod(),
      dre_resultado_ref:     dreAtual.resultadoOperacional,
      dre_margem_ref:        dreAtual.margemOperacional,
    })
    .select('id')
    .single()

  if (insertErr || !card) {
    return { success: false, error: 'Erro ao criar solicitação' }
  }

  // Log do limite inicial
  const admin = createAdminClient()
  await admin.from('credit_limit_events').insert({
    card_id:         card.id,
    owner_id:        profile.id,
    limite_anterior: 0,
    limite_novo:     limitResult.limiteTotal,
    reason:          'emissao_inicial',
    reason_detail:   `Score ${scoreResult.score} · DRE ${getCurrentPeriod()}`,
    dre_resultado:   dreAtual.resultadoOperacional,
    dre_margem:      dreAtual.margemOperacional,
    score_atual:     scoreResult.score,
  })

  // Auditoria
  await admin.from('audit_events').insert({
    user_id:       user.id,
    action:        'credit_card_requested',
    resource_type: 'credit_card',
    resource_id:   card.id,
    metadata: {
      score:           scoreResult.score,
      limite:          limitResult.limiteTotal,
      contract_id:     params.contractId,
      dre_periodo:     getCurrentPeriod(),
    },
  })

  return { success: true, cardId: card.id }
}

// ─── Recalcular limite ─────────────────────────────────────────────

export async function recalculateLimit(
  cardId:  string,
  reason:  string
): Promise<{ success: boolean; newLimit?: number; error?: string }> {
  const admin = createAdminClient()

  const { data: card } = await admin
    .from('credit_cards')
    .select('*, contracts:active_contract_id(*)')
    .eq('id', cardId)
    .single()

  if (!card) return { success: false, error: 'Cartão não encontrado' }

  const scoreResult = await calculateLiveScore(card.owner_id)
  if (!scoreResult) return { success: false, error: 'Não foi possível calcular o score' }

  const periods = getLastPeriods(3)
  const { data: entries } = await admin
    .from('dre_entries')
    .select('*')
    .eq('owner_id', card.owner_id)
    .in('period', periods)

  const dre = calculateDre((entries ?? []) as DreEntry[], getCurrentPeriod())
  const contract = card.contracts as any

  if (!contract) return { success: false, error: 'Contrato ativo não encontrado' }

  const limitResult = calculateCardLimit({
    score: scoreResult.score,
    dre: {
      period:         getCurrentPeriod(),
      resultadoOp:    dre.resultadoOperacional,
      margemOp:       dre.margemOperacional,
      receitaMedia:   scoreResult.receitaMediaMensal,
      custoPerKm:     dre.custoPerKm,
      mesesPositivos: scoreResult.mesesPositivos,
      totalMeses:     scoreResult.monthsOfData,
    },
    contract: {
      contractId:     contract.id,
      contractValue:  Number(contract.contract_value),
      routeKm:        Number(contract.route_km),
      durationMonths: contract.duration_months,
      paymentType:    contract.payment_type,
    },
  })

  const limiteAnterior = Number(card.limite_total)
  const limiteNovo     = limitResult.limiteTotal

  // Atualizar cartão
  await admin
    .from('credit_cards')
    .update({
      limite_total:          limiteNovo,
      limite_disponivel:     Math.max(0, limiteNovo - Number(card.limite_utilizado)),
      score_aprovacao:       scoreResult.score,
      dre_periodo_referencia: getCurrentPeriod(),
      dre_resultado_ref:     dre.resultadoOperacional,
      dre_margem_ref:        dre.margemOperacional,
    })
    .eq('id', cardId)

  // Log do evento
  await admin.from('credit_limit_events').insert({
    card_id:         cardId,
    owner_id:        card.owner_id,
    limite_anterior: limiteAnterior,
    limite_novo:     limiteNovo,
    reason:          reason as any,
    reason_detail:   `Score ${scoreResult.score} · DRE ${getCurrentPeriod()}`,
    dre_resultado:   dre.resultadoOperacional,
    dre_margem:      dre.margemOperacional,
    score_atual:     scoreResult.score,
  })

  return { success: true, newLimit: limiteNovo }
}
