import 'server-only'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateCreditScore } from './score-engine'
import { calculateDre }        from '@/services/dre/calculator'
import { getLastPeriods }      from '@/lib/utils'
import type { DreEntry }       from '@/types/database.types'
import type { MonthlySnapshot, ScoreResult } from './score-engine'

// ─── Buscar score atual ───────────────────────────────────────────

export async function getCurrentScore(): Promise<{
  score: ScoreResult
  savedAt: string | null
} | null> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  // Score persistido
  const { data: savedScore } = await supabase
    .from('credit_scores')
    .select('*')
    .eq('owner_id', profile.id)
    .eq('is_current', true)
    .maybeSingle()

  // Calcular sempre em tempo real também (mais fresco)
  const liveScore = await calculateLiveScore(profile.id)

  if (!liveScore) return null

  return {
    score:   liveScore,
    savedAt: savedScore?.calculated_at ?? null,
  }
}

// ─── Calcular score em tempo real ────────────────────────────────

export async function calculateLiveScore(ownerId: string): Promise<ScoreResult | null> {
  const supabase = await createClient()

  // Buscar 12 meses de histórico DRE
  const periods = getLastPeriods(12)

  const { data: entries } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('owner_id', ownerId)
    .in('period', periods)
    .order('period', { ascending: false })

  if (!entries || entries.length === 0) return null

  // Montar snapshots mensais
  const snapshots: MonthlySnapshot[] = periods
    .map((period) => {
      const periodEntries = (entries as DreEntry[]).filter((e) => e.period === period)
      if (periodEntries.length === 0) return null

      const dre = calculateDre(periodEntries, period)

      return {
        period,
        receitaTotal:    dre.totalReceita,
        custoTotal:      dre.totalCusto,
        resultadoOp:     dre.resultadoOperacional,
        margemOp:        dre.margemOperacional,
        custoKm:         dre.custoPerKm,
        kmTotal:         dre.kmTotal,
        contractsActive: 0,   // Preenchido abaixo
        hasCardData:     false,
      } satisfies MonthlySnapshot
    })
    .filter((s): s is MonthlySnapshot => s !== null)

  if (snapshots.length === 0) return null

  // Histórico de contratos no marketplace
  const { data: candidatures } = await supabase
    .from('candidatures')
    .select('id, status')
    .eq('candidate_id', ownerId)

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('score')
    .eq('evaluated_id', ownerId)

  const avgEval = evaluations && evaluations.length > 0
    ? evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length
    : 0

  const contractsHistory = {
    totalContracts:     candidatures?.length ?? 0,
    closedContracts:    candidatures?.filter((c) => c.status === 'confirmada').length ?? 0,
    avgEvaluationScore: avgEval,
    totalEvaluations:   evaluations?.length ?? 0,
  }

  return calculateCreditScore({ ownerId, snapshots, contractsHistory })
}

// ─── Persistir score calculado ────────────────────────────────────

export async function persistScore(ownerId: string, result: ScoreResult): Promise<string | null> {
  const admin = createAdminClient()
  const periods = getLastPeriods(12)

  // Buscar score anterior para calcular variação
  const { data: previous } = await admin
    .from('credit_scores')
    .select('score')
    .eq('owner_id', ownerId)
    .eq('is_current', true)
    .maybeSingle()

  const { data: inserted, error } = await admin
    .from('credit_scores')
    .insert({
      owner_id:                      ownerId,
      score:                         result.score,
      tier:                          result.tier,
      is_eligible:                   result.isEligible,
      period_start:                  periods[periods.length - 1] ?? '',
      period_end:                    periods[0] ?? '',
      months_of_data:                result.monthsOfData,
      driver_receita_estabilidade:   result.drivers.receitaEstabilidade,
      driver_margem_operacional:     result.drivers.margemOperacional,
      driver_regularidade_contratos: result.drivers.regularidadeContratos,
      driver_historico_pagamentos:   result.drivers.historicoPagamentos,
      driver_custo_km_tendencia:     result.drivers.custoKmTendencia,
      driver_sazonalidade:           result.drivers.sazonalidade,
      receita_media_mensal:          result.receitaMediaMensal,
      margem_media_percent:          result.margemMediaPercent,
      custo_km_medio:                result.custoKmMedio,
      contratos_ativos:              0,
      meses_positivos:               result.mesesPositivos,
      limite_sugerido:               result.limiteSugerido,
      score_anterior:                previous?.score ?? null,
      variacao_score:                previous ? result.score - previous.score : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[persistScore]', error.message)
    return null
  }

  // Auditoria
  await admin.from('audit_events').insert({
    user_id:       null,
    action:        'credit_score_calculated',
    resource_type: 'credit_score',
    resource_id:   inserted.id,
    metadata: {
      owner_id:     ownerId,
      score:        result.score,
      tier:         result.tier,
      is_eligible:  result.isEligible,
      months:       result.monthsOfData,
      limite:       result.limiteSugerido,
    },
  })

  return inserted.id
}

// ─── Consolidar snapshot mensal ───────────────────────────────────

/**
 * Consolida os dados de um mês em financial_snapshots.
 * Chamado mensalmente por um cron job ou ao fechar um período.
 */
export async function consolidateMonthlySnapshot(
  ownerId: string,
  period:  string
): Promise<void> {
  const supabase = await createClient()

  // DRE do período
  const { data: entries } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('period', period)

  if (!entries || entries.length === 0) return

  const dre = calculateDre(entries as DreEntry[], period)

  // Transações do cartão no período
  const { data: txns } = await supabase
    .from('banking_transactions')
    .select('amount')
    .eq('owner_id', ownerId)
    .eq('dre_period', period)
    .eq('status', 'liquidada')

  const totalCardSpend = (txns ?? []).reduce((s, t) => s + Number(t.amount), 0)

  // Contratos ativos no período
  const { count: contractsActive } = await supabase
    .from('candidatures')
    .select('id', { count: 'exact' })
    .eq('candidate_id', ownerId)
    .eq('status', 'confirmada')

  // Upsert do snapshot
  await supabase
    .from('financial_snapshots')
    .upsert({
      owner_id:         ownerId,
      period,
      receita_total:    dre.totalReceita,
      custo_fixo_total: dre.totalCustoFixo,
      custo_var_total:  dre.totalCustoVariavel,
      resultado_op:     dre.resultadoOperacional,
      margem_op:        dre.margemOperacional,
      custo_km:         dre.custoPerKm,
      km_total:         dre.kmTotal,
      total_card_spend: totalCardSpend,
      card_txn_count:   txns?.length ?? 0,
      contracts_active: contractsActive ?? 0,
      has_dre_data:     entries.length > 0,
      has_card_data:    (txns?.length ?? 0) > 0,
    }, {
      onConflict: 'owner_id,period',
    })
}
