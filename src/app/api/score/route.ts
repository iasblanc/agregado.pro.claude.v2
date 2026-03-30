import { NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles').select('id, role').eq('user_id', user.id).single()

    if (profileError || !profile)
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    if (profile.role !== 'caminhoneiro')
      return NextResponse.json({ error: 'Apenas caminhoneiros' }, { status: 403 })

    // Buscar todos os lançamentos
    const { data: entries, error: dreError } = await admin.from('dre_entries')
      .select('period, entry_type, amount, km_reference')
      .eq('owner_id', profile.id)
      .order('period', { ascending: false })
      .limit(500)

    if (dreError) return NextResponse.json({ error: dreError.message }, { status: 500 })

    if (!entries || entries.length === 0)
      return NextResponse.json({ error: 'Sem lançamentos no DRE', code: 'NO_DATA' }, { status: 422 })

    // Agrupar por período
    const byPeriod: Record<string, typeof entries> = {}
    for (const e of entries) {
      if (!byPeriod[e.period]) byPeriod[e.period] = []
      byPeriod[e.period].push(e)
    }

    const periods = Object.keys(byPeriod).sort().reverse().slice(0, 6)

    // Calcular snapshot por período
    const snapshots = periods.map(p => {
      const pe = byPeriod[p]
      const receita   = pe.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.amount), 0)
      const custo     = pe.filter(e => e.entry_type !== 'receita').reduce((s, e) => s + Number(e.amount), 0)
      const km        = pe.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
      const resultado = receita - custo
      const margem    = receita > 0 ? (resultado / receita) * 100 : 0
      return { period: p, receita, custo, resultado, margem, km }
    })

    const mesesPositivos = snapshots.filter(s => s.resultado > 0).length
    const receitaMedia   = snapshots.reduce((s, m) => s + m.receita, 0) / snapshots.length
    const margemMedia    = snapshots.reduce((s, m) => s + m.margem, 0) / snapshots.length
    const totalKm        = snapshots.reduce((s, m) => s + m.km, 0)
    const totalCusto     = snapshots.reduce((s, m) => s + m.custo, 0)
    const custoKmMedio   = totalKm > 0 ? totalCusto / totalKm : null

    // Algoritmo de score (0-1000)
    let score = 0
    let d1 = 0, d2 = 0, d3 = 0, d4 = 0, d5 = 0

    // 1. Estabilidade de receita (0-250)
    if (receitaMedia > 0 && snapshots.length > 1) {
      const variacoes = snapshots.map(s => Math.abs(s.receita - receitaMedia) / receitaMedia)
      const coefVar   = variacoes.reduce((s, v) => s + v, 0) / variacoes.length
      d1 = Math.round(250 * Math.max(0, 1 - coefVar * 2))
    } else if (snapshots.length === 1) {
      d1 = 125 // metade com apenas 1 mês
    }
    score += d1

    // 2. Margem operacional (0-250)
    if (margemMedia >= 20)      d2 = 250
    else if (margemMedia >= 15) d2 = 200
    else if (margemMedia >= 10) d2 = 150
    else if (margemMedia >= 5)  d2 = 80
    else if (margemMedia >= 0)  d2 = 30
    score += d2

    // 3. Meses positivos (0-200)
    d3 = Math.round((mesesPositivos / snapshots.length) * 200)
    score += d3

    // 4. Volume de dados (0-150)
    d4 = Math.round((periods.length / 6) * 150)
    score += d4

    // 5. Tendência (0-150)
    const ultimoMes = snapshots[0]
    if (ultimoMes && receitaMedia > 0) {
      const tendencia = ultimoMes.margem / 100  // normalizado 0-1
      d5 = Math.round(150 * Math.max(0, Math.min(1, tendencia * 1.5)))
    }
    score += d5

    score = Math.max(0, Math.min(1000, score))

    const tier =
      score >= 800 ? 'excelente' :
      score >= 650 ? 'muito_bom' :
      score >= 500 ? 'bom' :
      score >= 350 ? 'regular' :
      score >= 200 ? 'baixo' : 'insuficiente'

    const isEligible    = score >= 350 && periods.length >= 2
    const limiteSugerido = isEligible ? Math.min(receitaMedia * 0.3, 50000) : 0

    // Marcar score anterior como não-atual (silenciosamente)
    await admin.from('credit_scores')
      .update({ is_current: false })
      .eq('owner_id', profile.id)
      .eq('is_current', true)

    // Inserir novo score
    const { data: saved, error: insertError } = await admin.from('credit_scores').insert({
      owner_id:                      profile.id,
      score,
      tier,
      is_eligible:                   isEligible,
      period_start:                  periods[periods.length - 1],
      period_end:                    periods[0],
      months_of_data:                periods.length,
      driver_receita_estabilidade:   d1,
      driver_margem_operacional:     d2,
      driver_regularidade_contratos: d3,
      driver_historico_pagamentos:   d4,
      driver_custo_km_tendencia:     d5,
      driver_sazonalidade:           0,
      receita_media_mensal:          receitaMedia,
      margem_media_percent:          margemMedia,
      custo_km_medio:                custoKmMedio,
      meses_positivos:               mesesPositivos,
      limite_sugerido:               limiteSugerido,
      is_current:                    true,
      calculated_at:                 new Date().toISOString(),
      expires_at:                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()

    if (insertError) {
      console.error('[SCORE INSERT]', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ data: saved, score, tier, isEligible, limiteSugerido })
  } catch (err) {
    console.error('[SCORE ERROR]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
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
