import { NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/score — calcula o score do caminhoneiro a partir do DRE real
 * e persiste na tabela credit_scores
 */
export async function POST() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro')
    return NextResponse.json({ error: 'Apenas caminhoneiros' }, { status: 403 })

  // Buscar lançamentos dos últimos 6 meses
  const { data: entries } = await admin.from('dre_entries')
    .select('period, entry_type, amount, km_reference')
    .eq('owner_id', profile.id)
    .order('period', { ascending: false })
    .limit(500)

  if (!entries || entries.length === 0)
    return NextResponse.json({ error: 'Sem dados suficientes para calcular o score', code: 'NO_DATA' }, { status: 422 })

  // Agrupar por período
  const byPeriod: Record<string, typeof entries> = {}
  for (const e of entries) {
    if (!byPeriod[e.period]) byPeriod[e.period] = []
    byPeriod[e.period].push(e)
  }

  const periods = Object.keys(byPeriod).sort().reverse().slice(0, 6)
  if (periods.length < 1)
    return NextResponse.json({ error: 'Sem dados suficientes', code: 'NO_DATA' }, { status: 422 })

  // Calcular snapshot por período
  type Snapshot = { period: string; receita: number; custo: number; resultado: number; margem: number | null; km: number }
  const snapshots: Snapshot[] = periods.map(p => {
    const pe = byPeriod[p]
    const receita  = pe.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const custo    = pe.filter(e => e.entry_type !== 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const km       = pe.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
    const resultado = receita - custo
    const margem    = receita > 0 ? (resultado / receita) * 100 : null
    return { period: p, receita, custo, resultado, margem, km }
  })

  const mesesPositivos = snapshots.filter(s => s.resultado > 0).length
  const receitaMedia   = snapshots.reduce((s, m) => s + m.receita, 0) / snapshots.length
  const margemMedia    = snapshots.filter(s => s.margem !== null).reduce((s, m) => s + (m.margem ?? 0), 0)
    / (snapshots.filter(s => s.margem !== null).length || 1)
  const totalKm        = snapshots.reduce((s, m) => s + m.km, 0)
  const totalCusto     = snapshots.reduce((s, m) => s + m.custo, 0)
  const custoKmMedio   = totalKm > 0 ? totalCusto / totalKm : null

  // Algoritmo de score (0-1000)
  let score = 0

  // 1. Estabilidade de receita (0-250)
  if (receitaMedia > 0) {
    const variacoes = snapshots.map(s => Math.abs(s.receita - receitaMedia) / receitaMedia)
    const coefVar = variacoes.reduce((s, v) => s + v, 0) / variacoes.length
    score += Math.round(250 * Math.max(0, 1 - coefVar * 2))
  }

  // 2. Margem operacional (0-250)
  if (margemMedia >= 20)     score += 250
  else if (margemMedia >= 15) score += 200
  else if (margemMedia >= 10) score += 150
  else if (margemMedia >= 5)  score += 80
  else if (margemMedia >= 0)  score += 30

  // 3. Meses positivos (0-200)
  score += Math.round((mesesPositivos / snapshots.length) * 200)

  // 4. Volume de dados (0-150) — mais meses = mais confiável
  score += Math.round((periods.length / 6) * 150)

  // 5. Tendência (0-150) — último mês vs média
  const ultimoMes = snapshots[0]
  if (ultimoMes && receitaMedia > 0) {
    const tendencia = (ultimoMes.resultado - (receitaMedia - snapshots[0].custo)) / receitaMedia
    score += Math.round(150 * Math.max(0, Math.min(1, 0.5 + tendencia)))
  }

  score = Math.max(0, Math.min(1000, score))

  // Tier
  const tier =
    score >= 800 ? 'excelente' :
    score >= 650 ? 'muito_bom' :
    score >= 500 ? 'bom' :
    score >= 350 ? 'regular' :
    score >= 200 ? 'baixo' : 'insuficiente'

  const isEligible = score >= 350 && periods.length >= 2

  // Limite sugerido (30% da receita média mensal, máx R$50k)
  const limiteSugerido = isEligible ? Math.min(receitaMedia * 0.3, 50000) : 0

  // Marcar score anterior como não-atual
  await admin.from('credit_scores').update({ is_current: false }).eq('owner_id', profile.id)

  // Salvar novo score
  const { data: saved, error } = await admin.from('credit_scores').insert({
    owner_id:                    profile.id,
    score,
    tier,
    is_eligible:                 isEligible,
    period_start:                periods[periods.length - 1],
    period_end:                  periods[0],
    months_of_data:              periods.length,
    driver_receita_estabilidade: Math.round(score * 0.25),
    driver_margem_operacional:   Math.round(score * 0.25),
    driver_regularidade_contratos: Math.round(score * 0.20),
    driver_historico_pagamentos: Math.round(score * 0.15),
    driver_custo_km_tendencia:   Math.round(score * 0.15),
    receita_media_mensal:        receitaMedia,
    margem_media_percent:        margemMedia,
    custo_km_medio:              custoKmMedio,
    meses_positivos:             mesesPositivos,
    limite_sugerido:             limiteSugerido,
    is_current:                  true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: saved, score, tier, isEligible, limiteSugerido })
}

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const { data: score } = await admin.from('credit_scores')
    .select('*').eq('owner_id', profile.id).eq('is_current', true).maybeSingle()

  return NextResponse.json({ data: score })
}
