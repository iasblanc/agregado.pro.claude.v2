import 'server-only'

// ─── Tipos ────────────────────────────────────────────────────────

export type LoyaltyTier = 'bronze' | 'prata' | 'ouro' | 'platina'
export type EventType   = 'lancamento_dre' | 'transacao_cartao' | 'contrato_fechado' |
                          'avaliacao_positiva' | 'score_melhorado' | 'meta_km_mensal' |
                          'pagamento_pontual' | 'indicacao' | 'aniversario_plataforma'

export interface LoyaltyMetrics {
  monthsActive:        number
  monthsPositive:      number   // Meses com resultado operacional > 0
  contractsClosed:     number
  kmAccumulated:       number
  avgScoreLast6m:      number | null
  totalCardSpend:      number
}

export interface TierResult {
  tier:             LoyaltyTier
  pointsMultiplier: number   // Multiplicador de pontos para este tier
  nextTier:         LoyaltyTier | null
  progressToNext:   number   // 0–100%
  missingFor:       string   // O que falta para subir de tier
}

export interface PointsAward {
  eventType:    EventType
  basePoints:   number
  multiplier:   number     // Do tier atual
  totalPoints:  number
  description:  string
}

// ─── Tabela de pontos por evento ──────────────────────────────────

const POINTS_PER_EVENT: Record<EventType, number> = {
  lancamento_dre:         5,    // Lançamento manual no DRE
  transacao_cartao:       2,    // Por real gasto no cartão (R$1 = 2 pts)
  contrato_fechado:       200,  // Contrato novo fechado
  avaliacao_positiva:     50,   // Avaliação 4+ estrelas
  score_melhorado:        150,  // Subiu de tier de score
  meta_km_mensal:         100,  // Atingiu meta de km no mês
  pagamento_pontual:      80,   // Fatura do cartão paga no vencimento
  indicacao:              500,  // Indicação convertida
  aniversario_plataforma: 300,  // 1 ano de uso
}

// Multiplicadores por tier
const TIER_MULTIPLIERS: Record<LoyaltyTier, number> = {
  bronze:  1.0,
  prata:   1.5,
  ouro:    2.0,
  platina: 3.0,
}

// Cor e label de cada tier
export const TIER_CONFIG: Record<LoyaltyTier, {
  label:      string
  color:      string
  bgColor:    string
  borderColor: string
  icon:       string
  description: string
}> = {
  bronze: {
    label:       'Bronze',
    color:       '#92400E',
    bgColor:     '#FEF3C7',
    borderColor: '#FDE68A',
    icon:        '🥉',
    description: 'Bem-vindo ao Clube Agregado.Pro',
  },
  prata: {
    label:       'Prata',
    color:       '#374151',
    bgColor:     '#F3F4F6',
    borderColor: '#D1D5DB',
    icon:        '🥈',
    description: 'Operação regular reconhecida',
  },
  ouro: {
    label:       'Ouro',
    color:       '#92400E',
    bgColor:     '#FFFBEB',
    borderColor: '#FDE68A',
    icon:        '🥇',
    description: 'Gestão financeira exemplar',
  },
  platina: {
    label:       'Platina',
    color:       '#1A1915',
    bgColor:     '#F5F2EC',
    borderColor: '#2D2B26',
    icon:        '💎',
    description: 'Elite do caminhoneiro agregado',
  },
}

// ─── Critérios de tier ────────────────────────────────────────────

/**
 * Regras de tier baseadas no flywheel econômico do master.md.
 *
 * Critérios progressivos que refletem:
 * 1. Tempo de uso e engajamento
 * 2. Saúde financeira (meses positivos)
 * 3. Atividade no marketplace (contratos)
 * 4. Score proprietário
 */
export function calculateTier(metrics: LoyaltyMetrics): TierResult {
  const { monthsActive, monthsPositive, contractsClosed, avgScoreLast6m } = metrics

  let tier: LoyaltyTier = 'bronze'
  let progressToNext    = 0
  let missingFor        = ''

  // ─── PLATINA: top 5% da base ─────────────────────────────────
  const platinaCriteria = {
    monthsActive:   12,
    monthsPositive: 10,   // 10 de 12 meses positivos
    contracts:      8,
    score:          750,   // muito_bom+
  }

  if (
    monthsActive   >= platinaCriteria.monthsActive &&
    monthsPositive >= platinaCriteria.monthsPositive &&
    contractsClosed >= platinaCriteria.contracts &&
    (avgScoreLast6m ?? 0) >= platinaCriteria.score
  ) {
    return {
      tier:             'platina',
      pointsMultiplier: TIER_MULTIPLIERS.platina,
      nextTier:         null,
      progressToNext:   100,
      missingFor:       'Você está no tier máximo! Continue mantendo a excelência.',
    }
  }

  // ─── OURO ─────────────────────────────────────────────────────
  const ouroCriteria = {
    monthsActive:   6,
    monthsPositive: 5,
    contracts:      3,
    score:          650,   // bom+
  }

  if (
    monthsActive   >= ouroCriteria.monthsActive &&
    monthsPositive >= ouroCriteria.monthsPositive &&
    contractsClosed >= ouroCriteria.contracts &&
    (avgScoreLast6m ?? 0) >= ouroCriteria.score
  ) {
    tier = 'ouro'
    // Progresso para Platina
    const scores = [
      monthsActive   / platinaCriteria.monthsActive,
      monthsPositive / platinaCriteria.monthsPositive,
      contractsClosed / platinaCriteria.contracts,
      ((avgScoreLast6m ?? 0) - ouroCriteria.score) / (platinaCriteria.score - ouroCriteria.score),
    ]
    progressToNext = Math.round(Math.min(99, mean(scores) * 100))

    const missing: string[] = []
    if (monthsActive   < platinaCriteria.monthsActive)   missing.push(`${platinaCriteria.monthsActive - monthsActive} meses`)
    if (monthsPositive < platinaCriteria.monthsPositive) missing.push(`${platinaCriteria.monthsPositive - monthsPositive} meses positivos`)
    if (contractsClosed < platinaCriteria.contracts)     missing.push(`${platinaCriteria.contracts - contractsClosed} contratos`)
    if ((avgScoreLast6m ?? 0) < platinaCriteria.score)   missing.push(`score ${platinaCriteria.score}+`)
    missingFor = missing.length > 0 ? `Para Platina: ${missing.join(', ')}.` : ''
  }

  // ─── PRATA ─────────────────────────────────────────────────────
  else if (monthsActive >= 3 && monthsPositive >= 2 && contractsClosed >= 1) {
    tier = 'prata'
    const scores = [
      monthsActive   / ouroCriteria.monthsActive,
      monthsPositive / ouroCriteria.monthsPositive,
      contractsClosed / ouroCriteria.contracts,
    ]
    progressToNext = Math.round(Math.min(99, mean(scores) * 100))

    const missing: string[] = []
    if (monthsActive   < ouroCriteria.monthsActive)   missing.push(`${ouroCriteria.monthsActive - monthsActive} meses`)
    if (monthsPositive < ouroCriteria.monthsPositive) missing.push(`${ouroCriteria.monthsPositive - monthsPositive} meses positivos`)
    if (contractsClosed < ouroCriteria.contracts)     missing.push(`${ouroCriteria.contracts - contractsClosed} contratos`)
    if ((avgScoreLast6m ?? 0) < ouroCriteria.score)   missing.push(`score ${ouroCriteria.score}+`)
    missingFor = missing.length > 0 ? `Para Ouro: ${missing.join(', ')}.` : ''
  }

  // ─── BRONZE (padrão) ───────────────────────────────────────────
  else {
    tier = 'bronze'
    const scores = [
      Math.min(1, monthsActive / 3),
      Math.min(1, monthsPositive / 2),
      Math.min(1, contractsClosed / 1),
    ]
    progressToNext = Math.round(Math.min(99, mean(scores) * 100))

    const missing: string[] = []
    if (monthsActive   < 3) missing.push(`${3 - monthsActive} meses`)
    if (monthsPositive < 2) missing.push(`${2 - monthsPositive} meses positivos`)
    if (contractsClosed < 1) missing.push('1 contrato fechado')
    missingFor = missing.length > 0 ? `Para Prata: ${missing.join(', ')}.` : ''
  }

  return {
    tier,
    pointsMultiplier: TIER_MULTIPLIERS[tier],
    nextTier:         getNextTier(tier),
    progressToNext,
    missingFor,
  }
}

// ─── Calcular pontos para um evento ──────────────────────────────

/**
 * Calcula os pontos ganhos por um evento específico.
 *
 * Regra do master.md:
 * "Critérios de pontuação automáticos baseados em:
 *  tempo de uso, contratos ativos, histórico financeiro saudável,
 *  volume de km rodado, uso das ferramentas do sistema."
 */
export function calculatePoints(
  eventType:    EventType,
  tier:         LoyaltyTier,
  context?: {
    cardAmount?: number    // Para transacao_cartao: pontos por R$ gasto
    kmRodados?:  number    // Para meta_km_mensal
  }
): PointsAward {
  const multiplier = TIER_MULTIPLIERS[tier]
  let basePoints   = POINTS_PER_EVENT[eventType]

  // Eventos com pontos variáveis
  if (eventType === 'transacao_cartao' && context?.cardAmount) {
    // R$1 = 2 pontos base (o multiplicador do tier é aplicado depois)
    basePoints = Math.floor(context.cardAmount * 2)
  }

  if (eventType === 'meta_km_mensal' && context?.kmRodados) {
    // Bônus extra por km acima de 2000
    const bonus = context.kmRodados > 2000 ? Math.floor((context.kmRodados - 2000) / 100) * 10 : 0
    basePoints  = POINTS_PER_EVENT.meta_km_mensal + bonus
  }

  const totalPoints = Math.round(basePoints * multiplier)

  const descriptions: Record<EventType, string> = {
    lancamento_dre:         'Lançamento registrado no DRE',
    transacao_cartao:       `Compra no cartão — ${context?.cardAmount ? `R$ ${context.cardAmount.toFixed(2)}` : ''}`,
    contrato_fechado:       'Contrato fechado no marketplace',
    avaliacao_positiva:     'Avaliação positiva recebida',
    score_melhorado:        'Score de crédito melhorou de tier',
    meta_km_mensal:         `Meta de km atingida — ${context?.kmRodados?.toLocaleString('pt-BR')} km`,
    pagamento_pontual:      'Fatura do cartão paga no vencimento',
    indicacao:              'Indicação convertida em usuário ativo',
    aniversario_plataforma: 'Aniversário na plataforma!',
  }

  return {
    eventType,
    basePoints,
    multiplier,
    totalPoints,
    description: descriptions[eventType],
  }
}

// ─── Catálogo de benefícios ───────────────────────────────────────

export interface Benefit {
  id:           string
  name:         string
  description:  string
  category:     string
  pointsCost:   number
  minTier:      LoyaltyTier
  valueDisplay: string    // "5% desconto" | "R$ 15 off" | etc.
  icon:         string
  partnerId?:   string
}

export const BENEFITS_CATALOG: Benefit[] = [
  // Combustível
  {
    id: 'diesel-5pct', name: 'Desconto Diesel 5%', category: 'combustivel',
    description: '5% de desconto no próximo abastecimento em postos conveniados',
    pointsCost: 500, minTier: 'bronze', valueDisplay: '5% off', icon: '⛽',
    partnerId: 'br-distribuidora',
  },
  {
    id: 'diesel-8pct', name: 'Super Desconto Diesel 8%', category: 'combustivel',
    description: '8% de desconto em postos BR e Ipiranga conveniados',
    pointsCost: 1200, minTier: 'prata', valueDisplay: '8% off', icon: '⛽',
    partnerId: 'ipiranga-frotas',
  },
  // Manutenção
  {
    id: 'manutencao-100', name: 'Voucher Manutenção R$100', category: 'manutencao',
    description: 'R$100 em serviços de manutenção preventiva em oficinas credenciadas',
    pointsCost: 800, minTier: 'bronze', valueDisplay: 'R$ 100', icon: '🔧',
  },
  {
    id: 'pecas-randon-10pct', name: 'Peças Randon 10%', category: 'manutencao',
    description: '10% de desconto em peças Randon para implementos',
    pointsCost: 1500, minTier: 'prata', valueDisplay: '10% off', icon: '⚙️',
    partnerId: 'randon-pecas',
  },
  // Crédito
  {
    id: 'credito-taxa-reducao', name: 'Redução de Taxa de Crédito', category: 'credito',
    description: '0.5% de redução na taxa de antecipação de recebíveis por 3 meses',
    pointsCost: 2000, minTier: 'ouro', valueDisplay: '-0.5% taxa', icon: '💰',
  },
  {
    id: 'limite-bonus', name: 'Bônus de Limite +10%', category: 'credito',
    description: 'Aumento temporário de 10% no limite do cartão por 30 dias',
    pointsCost: 3000, minTier: 'ouro', valueDisplay: '+10% limite', icon: '💳',
  },
  // Seguro
  {
    id: 'seguro-carga-15pct', name: 'Desconto Seguro de Carga 15%', category: 'seguro',
    description: '15% no seguro de carga para a próxima viagem',
    pointsCost: 1000, minTier: 'bronze', valueDisplay: '15% off', icon: '🛡️',
    partnerId: 'porto-seguro-carga',
  },
  // Marketplace
  {
    id: 'destaque-candidatura', name: 'Candidatura em Destaque', category: 'marketplace',
    description: 'Sua candidatura aparece em destaque para a transportadora por 7 dias',
    pointsCost: 600, minTier: 'bronze', valueDisplay: 'Destaque 7 dias', icon: '⭐',
  },
  {
    id: 'acesso-antecipado', name: 'Acesso Antecipado a Contratos', category: 'marketplace',
    description: 'Veja e candidate-se a novos contratos 24h antes dos membros Bronze',
    pointsCost: 2500, minTier: 'prata', valueDisplay: '+24h acesso', icon: '🚀',
  },
  // Exclusivos Platina
  {
    id: 'gerente-conta', name: 'Gerente de Conta Dedicado', category: 'premium',
    description: 'Acesso a gerente de conta para suporte prioritário por 1 mês',
    pointsCost: 5000, minTier: 'platina', valueDisplay: 'Suporte VIP', icon: '🎯',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length
}

function getNextTier(tier: LoyaltyTier): LoyaltyTier | null {
  const order: LoyaltyTier[] = ['bronze', 'prata', 'ouro', 'platina']
  const idx = order.indexOf(tier)
  return idx < order.length - 1 ? order[idx + 1]! : null
}

export { TIER_MULTIPLIERS, POINTS_PER_EVENT }
