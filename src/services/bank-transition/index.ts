import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Tipos ────────────────────────────────────────────────────────

export interface TransitionReadiness {
  phase:              'baas' | 'pre_transicao' | 'migracao' | 'banco_proprio'
  activeUsers:        number
  threshold:          number   // 50.000 usuários (master.md)
  progressPercent:    number   // 0–100
  isThresholdReached: boolean
  monthlyRevenue:     number
  cardVolume:         number
  recommendation:     string
  nextMilestone:      string
  // Checklist para licença BC
  checklistBC: Array<{
    item:      string
    status:    'pendente' | 'em_andamento' | 'concluido'
    required:  boolean
  }>
}

// ─── Avaliação de prontidão para transição ───────────────────────

/**
 * Avalia se o produto atingiu os thresholds para iniciar
 * o processo de Banco Próprio junto ao Banco Central.
 *
 * Regra crítica do master.md:
 * "Transição para Banco Próprio só se threshold de escala atingido
 *  — nunca antecipar por ambição regulatória."
 * Threshold: 50K–100K usuários ativos
 */
export async function evaluateTransitionReadiness(): Promise<TransitionReadiness> {
  const admin = createAdminClient()

  // Métricas atuais
  const { count: activeUsers } = await admin
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('is_active', true)
    .eq('role', 'caminhoneiro')

  const { data: cardData } = await admin
    .from('credit_cards')
    .select('id', { count: 'exact' })
    .eq('status', 'ativo')

  // Receita estimada dos últimos 30 dias
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const { data: txnData } = await admin
    .from('banking_transactions')
    .select('amount')
    .eq('status', 'liquidada')
    .gte('transacted_at', thirtyDaysAgo)

  const cardVolume     = (txnData ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const monthlyRevenue = cardVolume * 0.012  // Estimativa: ~1.2% de interchange

  const users          = activeUsers ?? 0
  const threshold      = 50_000
  const progress       = Math.min(100, Math.round((users / threshold) * 100))
  const thresholdReached = users >= threshold

  // Determinar fase
  let phase: TransitionReadiness['phase'] = 'baas'
  if (thresholdReached)      phase = 'pre_transicao'

  // Checklist para licença BC (Resolução CMN 4.656/2018 — Instituição de Pagamento)
  const checklistBC: TransitionReadiness['checklistBC'] = [
    { item: 'Threshold de 50.000 usuários ativos atingido',                 status: thresholdReached ? 'concluido' : 'pendente', required: true  },
    { item: 'Histórico de dados financeiros proprietários (mín. 24 meses)', status: 'pendente',                                  required: true  },
    { item: 'Relatório de risco e compliance (LGPD + Bacen)',               status: 'pendente',                                  required: true  },
    { item: 'Capital mínimo para IP (R$ 1 milhão)',                         status: 'pendente',                                  required: true  },
    { item: 'Estrutura de governança e diretores aprovados BC',             status: 'pendente',                                  required: true  },
    { item: 'Sistema de prevenção à lavagem de dinheiro (PLD-FT)',          status: 'pendente',                                  required: true  },
    { item: 'Auditor externo independente contratado',                      status: 'pendente',                                  required: true  },
    { item: 'Plano de migração sem fricção aos usuários BaaS',              status: 'em_andamento',                              required: true  },
    { item: 'Parceria com correspondente bancário para transição',          status: 'pendente',                                  required: false },
    { item: 'Dossiê de solicitação ao Banco Central enviado',               status: 'pendente',                                  required: true  },
  ]

  const recommendation = thresholdReached
    ? 'Threshold atingido. Iniciar consulta jurídica para processo de licença junto ao Banco Central (Resolução CMN 4.656/2018).'
    : `Faltam ${(threshold - users).toLocaleString('pt-BR')} usuários para o threshold de avaliação. Foco em crescimento da base.`

  const nextMilestone = thresholdReached
    ? 'Contratar escritório jurídico especializado em licença BC'
    : `Alcançar ${Math.ceil(users / 10_000) * 10_000} usuários ativos`

  // Registrar avaliação no log
  await admin.from('bank_transition_log').insert({
    phase,
    milestone:         'avaliacao_automatica',
    description:       `Avaliação automática de prontidão. Usuários: ${users}/${threshold}`,
    active_users:      users,
    monthly_revenue:   monthlyRevenue,
    card_volume:       cardVolume,
    threshold_target:  threshold,
    threshold_reached: thresholdReached,
  }).catch(() => {/* não bloquear se log falhar */})

  return {
    phase,
    activeUsers:        users,
    threshold,
    progressPercent:    progress,
    isThresholdReached: thresholdReached,
    monthlyRevenue,
    cardVolume,
    recommendation,
    nextMilestone,
    checklistBC,
  }
}
