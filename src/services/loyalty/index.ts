import 'server-only'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  calculateTier,
  calculatePoints,
  BENEFITS_CATALOG,
  type LoyaltyMetrics,
  type EventType,
  type LoyaltyTier,
} from './engine'
import { getLastPeriods }    from '@/lib/utils'

// ─── Buscar ou criar conta de fidelidade ─────────────────────────

export async function getOrCreateLoyaltyAccount(ownerId: string) {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('loyalty_accounts')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (existing) return existing

  // Criar conta nova
  const { data: created, error } = await admin
    .from('loyalty_accounts')
    .insert({ owner_id: ownerId })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar conta de fidelidade: ${error.message}`)
  return created
}

// ─── Buscar conta do usuário autenticado ─────────────────────────

export async function getMyLoyaltyAccount() {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  const { data: account } = await supabase
    .from('loyalty_accounts')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle()

  if (!account) return null

  // Buscar histórico recente de eventos
  const { data: recentEvents } = await supabase
    .from('loyalty_events')
    .select('*')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Buscar resgates ativos
  const { data: activeRedemptions } = await supabase
    .from('loyalty_redemptions')
    .select('*')
    .eq('account_id', account.id)
    .in('status', ['aprovado', 'pendente'])
    .order('created_at', { ascending: false })

  return { account, recentEvents: recentEvents ?? [], activeRedemptions: activeRedemptions ?? [] }
}

// ─── Premiar pontos por evento ────────────────────────────────────

export async function awardPoints(params: {
  ownerId:      string
  eventType:    EventType
  referenceId?: string
  referenceType?: string
  context?:     { cardAmount?: number; kmRodados?: number }
}): Promise<{ pointsEarned: number; newTotal: number } | null> {
  const admin = createAdminClient()

  // Buscar ou criar conta
  const account = await getOrCreateLoyaltyAccount(params.ownerId)

  // Calcular pontos
  const award = calculatePoints(
    params.eventType,
    account.tier as LoyaltyTier,
    params.context
  )

  if (award.totalPoints === 0) return null

  // Inserir evento
  await admin.from('loyalty_events').insert({
    account_id:     account.id,
    owner_id:       params.ownerId,
    event_type:     params.eventType,
    points_earned:  award.totalPoints,
    reference_id:   params.referenceId   ?? null,
    reference_type: params.referenceType ?? null,
    description:    award.description,
  })

  // Atualizar totais da conta
  const { data: updated } = await admin
    .from('loyalty_accounts')
    .update({
      points_total:     account.points_total     + award.totalPoints,
      points_available: account.points_available + award.totalPoints,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', account.id)
    .select('points_total')
    .single()

  return {
    pointsEarned: award.totalPoints,
    newTotal:     updated?.points_total ?? 0,
  }
}

// ─── Recalcular e atualizar tier ──────────────────────────────────

export async function recalculateTier(ownerId: string): Promise<LoyaltyTier | null> {
  const admin    = createAdminClient()
  const supabase = await createClient()

  const account = await getOrCreateLoyaltyAccount(ownerId)

  // Coletar métricas
  const periods = getLastPeriods(12)

  const { data: snapshots } = await supabase
    .from('financial_snapshots')
    .select('is_positive, contracts_active')
    .eq('owner_id', ownerId)
    .in('period', periods)

  const { data: scoreHistory } = await supabase
    .from('credit_scores')
    .select('score')
    .eq('owner_id', ownerId)
    .order('calculated_at', { ascending: false })
    .limit(6)

  const { data: contracts } = await supabase
    .from('candidatures')
    .select('id')
    .eq('candidate_id', ownerId)
    .eq('status', 'confirmada')

  const avgScore = scoreHistory && scoreHistory.length > 0
    ? scoreHistory.reduce((s, h) => s + h.score, 0) / scoreHistory.length
    : null

  const metrics: LoyaltyMetrics = {
    monthsActive:       snapshots?.length ?? 0,
    monthsPositive:     snapshots?.filter((s) => s.is_positive).length ?? 0,
    contractsClosed:    contracts?.length ?? 0,
    kmAccumulated:      Number(account.km_total_accumulated),
    avgScoreLast6m:     avgScore ? Math.round(avgScore) : null,
    totalCardSpend:     Number(account.total_card_spend),
  }

  const tierResult  = calculateTier(metrics)
  const tierChanged = tierResult.tier !== account.tier

  // Atualizar conta
  await admin.from('loyalty_accounts').update({
    tier:            tierResult.tier,
    tier_updated_at: tierChanged ? new Date().toISOString() : account.tier_updated_at,
    months_active:   metrics.monthsActive,
    months_positive: metrics.monthsPositive,
    contracts_closed: metrics.contractsClosed,
    avg_score_last_6m: metrics.avgScoreLast6m,
    next_tier_review:  new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  }).eq('id', account.id)

  // Se subiu de tier, premiar com pontos
  if (tierChanged && tierResult.tier !== 'bronze') {
    await awardPoints({
      ownerId,
      eventType: 'score_melhorado',
      context:   {},
    })
  }

  return tierResult.tier
}

// ─── Resgatar benefício ───────────────────────────────────────────

export async function redeemBenefit(params: {
  ownerId:   string
  benefitId: string
}): Promise<{ success: boolean; code?: string; error?: string }> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return { success: false, error: 'Perfil não encontrado' }

  const benefit = BENEFITS_CATALOG.find((b) => b.id === params.benefitId)
  if (!benefit) return { success: false, error: 'Benefício não encontrado' }

  const account = await getOrCreateLoyaltyAccount(profile.id)

  // Verificar tier
  const tierOrder: LoyaltyTier[] = ['bronze', 'prata', 'ouro', 'platina']
  const accountTierIdx = tierOrder.indexOf(account.tier as LoyaltyTier)
  const minTierIdx     = tierOrder.indexOf(benefit.minTier)

  if (accountTierIdx < minTierIdx) {
    return { success: false, error: `Benefício disponível apenas para membros ${benefit.minTier} ou superior` }
  }

  if (account.points_available < benefit.pointsCost) {
    return {
      success: false,
      error: `Pontos insuficientes: você tem ${account.points_available}, necessário ${benefit.pointsCost}`,
    }
  }

  // Gerar código de resgate
  const code = `AGP-${benefit.id.toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  // Inserir resgate
  const admin = createAdminClient()
  const { data: redemption, error } = await admin
    .from('loyalty_redemptions')
    .insert({
      account_id:     account.id,
      owner_id:       profile.id,
      benefit_id:     benefit.id,
      benefit_name:   benefit.name,
      points_cost:    benefit.pointsCost,
      status:         'aprovado',
      code,
      partner_id:     benefit.partnerId ?? null,
    })
    .select('id')
    .single()

  if (error || !redemption) return { success: false, error: 'Erro ao resgatar benefício' }

  // Deduzir pontos
  await admin.from('loyalty_accounts').update({
    points_available: account.points_available - benefit.pointsCost,
    points_used:      account.points_used + benefit.pointsCost,
  }).eq('id', account.id)

  // Auditoria
  await admin.from('audit_events').insert({
    user_id:       user.id,
    action:        'loyalty_benefit_redeemed',
    resource_type: 'loyalty_redemption',
    resource_id:   redemption.id,
    metadata:      { benefit_id: benefit.id, points_cost: benefit.pointsCost, code },
  })

  return { success: true, code }
}
