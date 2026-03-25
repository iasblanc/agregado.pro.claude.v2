import { calcLimiteSugerido } from './score-engine'
import { formatBRL }          from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────

export interface ContractContext {
  contractId:    string
  contractValue: number          // Valor do contrato (por viagem/mês)
  routeKm:       number
  durationMonths: number | null
  paymentType:   string          // por_viagem | por_km | por_tonelada
}

export interface DreContext {
  period:         string
  resultadoOp:    number
  margemOp:       number         // 0–1
  receitaMedia:   number         // Média dos últimos 3 meses
  custoPerKm:     number
  mesesPositivos: number
  totalMeses:     number
}

export interface LimitCalculationResult {
  limiteTotal:       number
  limiteBase:        number       // Calculado só pelo DRE
  limiteContrato:    number       // Calculado pelo contrato ativo
  limiteEfetivo:     number       // = min(limiteBase, limiteContrato)
  scoreFactor:       number       // Multiplicador do score (2×–6×)
  contractFactor:    number       // Fator do contrato (0.3–1.0 do valor mensal)
  breakdown:         LimitBreakdown
  canIssueCard:      boolean
  blockReasons:      string[]
}

export interface LimitBreakdown {
  // Para transparência — caminhoneiro vê exatamente como foi calculado
  steps: Array<{ label: string; value: string; isPositive?: boolean }>
  summary: string
}

// ─── Constantes ───────────────────────────────────────────────────

const MIN_MONTHS_FOR_CARD = 3      // Mínimo de histórico para emitir cartão
const MIN_SCORE_FOR_CARD  = 400    // Score mínimo para emissão
const MIN_MARGIN_FOR_CARD = 0.05   // Margem mínima (5%)
const MAX_CREDIT_PHASE4   = 200_000 // Teto Phase 4

// Multiplicadores por score (idênticos ao score-engine)
const SCORE_MULTIPLIERS: Array<{ min: number; multiplier: number; label: string }> = [
  { min: 850, multiplier: 6.0, label: '6× (score excelente)' },
  { min: 750, multiplier: 5.0, label: '5× (score muito bom)' },
  { min: 650, multiplier: 4.0, label: '4× (score bom)'      },
  { min: 500, multiplier: 3.0, label: '3× (score regular)'  },
  { min: 300, multiplier: 2.0, label: '2× (score baixo)'    },
]

// ─── Calculadora principal ────────────────────────────────────────

/**
 * Calcula o limite do cartão de crédito vinculado ao contrato ativo.
 *
 * Regras críticas do master.md:
 * - Limite calculado sobre resultado real do negócio — não declaratório
 * - Cartão sempre vinculado a contrato ativo
 * - Limite dinâmico — expande conforme desempenho operacional
 * - Caminhoneiro sempre vê como o limite é calculado
 */
export function calculateCardLimit(params: {
  score:    number
  dre:      DreContext
  contract: ContractContext
}): LimitCalculationResult {
  const { score, dre, contract } = params
  const blockReasons: string[] = []

  // ─── Verificações de bloqueio ─────────────────────────────────

  if (dre.totalMeses < MIN_MONTHS_FOR_CARD) {
    blockReasons.push(`Histórico insuficiente: ${dre.totalMeses} de ${MIN_MONTHS_FOR_CARD} meses necessários.`)
  }

  if (score < MIN_SCORE_FOR_CARD) {
    blockReasons.push(`Score ${score} abaixo do mínimo de ${MIN_SCORE_FOR_CARD}.`)
  }

  if (dre.margemOp < MIN_MARGIN_FOR_CARD) {
    blockReasons.push(`Margem operacional de ${(dre.margemOp * 100).toFixed(1)}% abaixo do mínimo de ${(MIN_MARGIN_FOR_CARD * 100).toFixed(0)}%.`)
  }

  if (dre.resultadoOp <= 0) {
    blockReasons.push('Resultado operacional negativo. Regularize antes de solicitar crédito.')
  }

  // ─── Score multiplier ─────────────────────────────────────────

  const scoreEntry  = SCORE_MULTIPLIERS.find((m) => score >= m.min) ?? SCORE_MULTIPLIERS[SCORE_MULTIPLIERS.length - 1]!
  const scoreFactor = scoreEntry.multiplier

  // ─── Limite base (pelo DRE — usando score engine) ─────────────

  const limiteBase = calcLimiteSugerido(dre.receitaMedia, dre.margemOp, score)

  // ─── Limite pelo contrato ativo ───────────────────────────────

  // Capacidade de pagamento mensal via retenção no contrato
  // Máximo seguro: 30% do valor mensal do contrato
  const valorMensalContrato = estimateMonthlyContractValue(contract)
  const contractFactor      = 0.30   // 30% do valor mensal disponível para crédito
  const limiteContrato      = Math.round(valorMensalContrato * contractFactor * scoreFactor / 100) * 100

  // Limite efetivo: menor entre DRE e contrato (mais conservador)
  const limiteEfetivo = Math.min(
    limiteBase,
    limiteContrato,
    MAX_CREDIT_PHASE4
  )

  const limiteTotal = blockReasons.length > 0 ? 0 : limiteEfetivo

  // ─── Breakdown transparente ────────────────────────────────────

  const lucroMensal = dre.receitaMedia * dre.margemOp
  const steps = [
    {
      label:      'Lucro operacional médio (receita × margem)',
      value:      formatBRL(lucroMensal),
      isPositive: lucroMensal > 0,
    },
    {
      label:      `Multiplicador do score ${score} pts (${scoreEntry.label})`,
      value:      `× ${scoreFactor}`,
    },
    {
      label:      'Limite base pelo DRE',
      value:      formatBRL(limiteBase),
      isPositive: true,
    },
    {
      label:      `Capacidade pelo contrato ativo (${(contractFactor * 100).toFixed(0)}% de ${formatBRL(valorMensalContrato)}/mês × ${scoreFactor}×)`,
      value:      formatBRL(limiteContrato),
    },
    {
      label:      'Limite efetivo (menor entre DRE e contrato)',
      value:      formatBRL(limiteEfetivo),
      isPositive: limiteEfetivo > 0,
    },
  ]

  if (blockReasons.length > 0) {
    steps.push({
      label:      'Status: bloqueado',
      value:      'R$ 0,00',
      isPositive: false,
    })
  }

  return {
    limiteTotal,
    limiteBase,
    limiteContrato,
    limiteEfetivo,
    scoreFactor,
    contractFactor,
    breakdown: {
      steps,
      summary: blockReasons.length > 0
        ? `Cartão não disponível: ${blockReasons[0]}`
        : `Limite de ${formatBRL(limiteTotal)} baseado no seu DRE real e contrato ativo.`,
    },
    canIssueCard: blockReasons.length === 0 && limiteTotal > 0,
    blockReasons,
  }
}

// ─── Calcular valor mensal do contrato ────────────────────────────

function estimateMonthlyContractValue(contract: ContractContext): number {
  const { contractValue, paymentType, durationMonths } = contract

  switch (paymentType) {
    case 'por_viagem':
      // Estimar 4 viagens/mês (padrão semanal)
      return contractValue * 4
    case 'por_km':
      // Valor por km × km estimados/mês
      return contractValue * contract.routeKm * 4
    default:
      // Valor já é mensal ou desconhecido
      return contractValue
  }
}

// ─── Calcular taxa de antecipação ─────────────────────────────────

/**
 * Taxa de antecipação de recebíveis baseada no score e prazo.
 * Melhores scores = taxas menores (benefício do histórico).
 *
 * Regra do master.md: antecipação com desconto sobre recebíveis.
 */
export function calculateAnticipationFee(params: {
  score:           number
  daysAnticipated: number  // Dias antecipados
  amount:          number  // Valor a antecipar
}): {
  feeRate:    number    // Taxa ao mês (ex: 0.025 = 2.5%)
  feeAmount:  number    // Valor cobrado
  netAmount:  number    // Líquido recebido
  dailyRate:  number    // Taxa diária efetiva
  breakdown:  string    // Explicação para o usuário
} {
  const { score, daysAnticipated, amount } = params

  // Taxa mensal base por faixa de score
  let monthlyRate: number
  if (score >= 850)      monthlyRate = 0.018  // 1.8%/mês para score excelente
  else if (score >= 750) monthlyRate = 0.022  // 2.2%/mês
  else if (score >= 650) monthlyRate = 0.028  // 2.8%/mês
  else if (score >= 500) monthlyRate = 0.035  // 3.5%/mês
  else                   monthlyRate = 0.045  // 4.5%/mês score baixo

  // Converter para taxa diária e aplicar ao prazo
  const dailyRate   = monthlyRate / 30
  const feeRate     = dailyRate * daysAnticipated
  const feeAmount   = Math.round(amount * feeRate * 100) / 100
  const netAmount   = Math.round((amount - feeAmount) * 100) / 100

  return {
    feeRate,
    feeAmount,
    netAmount,
    dailyRate,
    breakdown: [
      `Valor bruto: ${formatBRL(amount)}`,
      `Taxa: ${(monthlyRate * 100).toFixed(1)}%/mês × ${daysAnticipated} dias`,
      `Desconto: ${formatBRL(feeAmount)}`,
      `Valor líquido: ${formatBRL(netAmount)}`,
    ].join(' · '),
  }
}

// ─── Exportações ──────────────────────────────────────────────────

export {
  MIN_MONTHS_FOR_CARD,
  MIN_SCORE_FOR_CARD,
  MIN_MARGIN_FOR_CARD,
  MAX_CREDIT_PHASE4,
  SCORE_MULTIPLIERS,
}
