/**
 * credit-calc.ts — Cálculos de crédito puros (sem server-only)
 * Seguro para usar em Client Components e Server Components.
 *
 * ATENÇÃO: Não adicionar imports de serviços Supabase aqui.
 */

import { formatBRL } from './utils'

// ─── Taxas de antecipação por faixa de score ─────────────────────

const MONTHLY_RATES: Array<{ min: number; rate: number }> = [
  { min: 850, rate: 0.018 },  // 1.8%/mês — excelente
  { min: 750, rate: 0.022 },  // 2.2%/mês — muito bom
  { min: 650, rate: 0.028 },  // 2.8%/mês — bom
  { min: 500, rate: 0.035 },  // 3.5%/mês — regular
  { min: 0,   rate: 0.045 },  // 4.5%/mês — baixo/fallback
]

/**
 * Calcula a taxa e valores de antecipação de recebíveis.
 * Usada no cliente (AntecipacaoClient) e no servidor (anticipate/route.ts).
 */
export function calculateAnticipationFee(params: {
  score:           number
  daysAnticipated: number
  amount:          number
}): {
  feeRate:    number
  feeAmount:  number
  netAmount:  number
  dailyRate:  number
  breakdown:  string
} {
  const { score, daysAnticipated, amount } = params

  const entry      = MONTHLY_RATES.find((r) => score >= r.min) ?? MONTHLY_RATES[MONTHLY_RATES.length - 1]!
  const monthlyRate = entry.rate
  const days        = Math.max(1, daysAnticipated)

  const dailyRate   = monthlyRate / 30
  const feeRate     = dailyRate * days
  const feeAmount   = Math.round(amount * feeRate * 100) / 100
  const netAmount   = Math.round((amount - feeAmount) * 100) / 100

  return {
    feeRate,
    feeAmount,
    netAmount,
    dailyRate,
    breakdown: [
      `Valor bruto: ${formatBRL(amount)}`,
      `Taxa: ${(monthlyRate * 100).toFixed(1)}%/mês × ${days} dias`,
      `Desconto: ${formatBRL(feeAmount)}`,
      `Valor líquido: ${formatBRL(netAmount)}`,
    ].join(' · '),
  }
}

// ─── Multiplicadores de score (usados no LimitWidget client-side) ──

export const SCORE_MULTIPLIER_LABELS: Array<{
  min:        number
  multiplier: number
  label:      string
}> = [
  { min: 850, multiplier: 6.0, label: '6× (score excelente)' },
  { min: 750, multiplier: 5.0, label: '5× (score muito bom)' },
  { min: 650, multiplier: 4.0, label: '4× (score bom)'      },
  { min: 500, multiplier: 3.0, label: '3× (score regular)'  },
  { min: 300, multiplier: 2.0, label: '2× (score baixo)'    },
]

export function getScoreMultiplier(score: number): number {
  return SCORE_MULTIPLIER_LABELS.find((m) => score >= m.min)?.multiplier ?? 2.0
}
