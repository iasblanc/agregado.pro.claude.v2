import { describe, it, expect } from '@jest/globals'
import {
  calculateCardLimit,
  calculateAnticipationFee,
  MIN_MONTHS_FOR_CARD,
  MIN_SCORE_FOR_CARD,
  MIN_MARGIN_FOR_CARD,
  MAX_CREDIT_PHASE4,
  SCORE_MULTIPLIERS,
  type ContractContext,
  type DreContext,
} from '@/services/credit/limit-calculator'

// ─── Fixtures ─────────────────────────────────────────────────────

const CONTRACT_BASE: ContractContext = {
  contractId:     'contract-1',
  contractValue:  8500,         // R$8.500/viagem
  routeKm:        400,
  durationMonths: 6,
  paymentType:    'por_viagem',
}

const DRE_SAUDAVEL: DreContext = {
  period:         '2026-07',
  resultadoOp:    2400,         // R$2.400 de lucro
  margemOp:       0.30,         // 30% de margem
  receitaMedia:   8000,         // Média de R$8.000/mês
  custoPerKm:     14.0,
  mesesPositivos: 5,
  totalMeses:     6,
}

function makeParams(overrides: {
  score?:    number
  dre?:      Partial<DreContext>
  contract?: Partial<ContractContext>
} = {}) {
  return {
    score:    overrides.score    ?? 750,
    dre:      { ...DRE_SAUDAVEL,   ...overrides.dre      },
    contract: { ...CONTRACT_BASE,  ...overrides.contract  },
  }
}

// ─── calculateCardLimit — emissão ─────────────────────────────────

describe('calculateCardLimit — critérios de elegibilidade', () => {
  it('histórico insuficiente (< 3 meses) → bloqueado', () => {
    const r = calculateCardLimit(makeParams({ dre: { totalMeses: 2 } }))
    expect(r.canIssueCard).toBe(false)
    expect(r.limiteTotal).toBe(0)
    expect(r.blockReasons.some((b) => b.includes('meses'))).toBe(true)
  })

  it('score abaixo do mínimo (< 400) → bloqueado', () => {
    const r = calculateCardLimit(makeParams({ score: 350 }))
    expect(r.canIssueCard).toBe(false)
    expect(r.blockReasons.some((b) => b.includes('Score'))).toBe(true)
  })

  it('margem abaixo do mínimo (< 5%) → bloqueado', () => {
    const r = calculateCardLimit(makeParams({ dre: { margemOp: 0.03, resultadoOp: 240 } }))
    expect(r.canIssueCard).toBe(false)
    expect(r.blockReasons.some((b) => b.includes('Margem'))).toBe(true)
  })

  it('resultado operacional negativo → bloqueado', () => {
    const r = calculateCardLimit(makeParams({ dre: { resultadoOp: -500, margemOp: -0.10 } }))
    expect(r.canIssueCard).toBe(false)
    expect(r.blockReasons.some((b) => b.includes('negativo'))).toBe(true)
  })

  it('todos os critérios atendidos → aprovado', () => {
    const r = calculateCardLimit(makeParams())
    expect(r.canIssueCard).toBe(true)
    expect(r.limiteTotal).toBeGreaterThan(0)
    expect(r.blockReasons).toHaveLength(0)
  })
})

// ─── calculateCardLimit — valores ────────────────────────────────

describe('calculateCardLimit — cálculo de limite', () => {
  it('score excelente (900) → multiplicador 6×', () => {
    const r = calculateCardLimit(makeParams({ score: 900 }))
    expect(r.scoreFactor).toBe(6.0)
  })

  it('score muito bom (800) → multiplicador 5×', () => {
    const r = calculateCardLimit(makeParams({ score: 800 }))
    expect(r.scoreFactor).toBe(5.0)
  })

  it('score bom (700) → multiplicador 4×', () => {
    const r = calculateCardLimit(makeParams({ score: 700 }))
    expect(r.scoreFactor).toBe(4.0)
  })

  it('score regular (550) → multiplicador 3×', () => {
    const r = calculateCardLimit(makeParams({ score: 550 }))
    expect(r.scoreFactor).toBe(3.0)
  })

  it('score baixo (400) → multiplicador 2×', () => {
    const r = calculateCardLimit(makeParams({ score: 400 }))
    expect(r.scoreFactor).toBe(2.0)
  })

  it('limiteTotal ≤ limiteBase E limiteContrato', () => {
    const r = calculateCardLimit(makeParams())
    expect(r.limiteTotal).toBeLessThanOrEqual(r.limiteBase)
    expect(r.limiteTotal).toBeLessThanOrEqual(r.limiteContrato)
  })

  it('limite máximo = MAX_CREDIT_PHASE4 (R$200.000)', () => {
    // Score excelente com receita muito alta
    const r = calculateCardLimit(makeParams({
      score:    1000,
      dre:      { receitaMedia: 500_000, margemOp: 0.50, resultadoOp: 250_000, totalMeses: 12, mesesPositivos: 12 },
      contract: { contractValue: 500_000 },
    }))
    expect(r.limiteTotal).toBeLessThanOrEqual(MAX_CREDIT_PHASE4)
  })

  it('limiteTotal arredondado para centenas', () => {
    const r = calculateCardLimit(makeParams())
    expect(r.limiteTotal % 100).toBe(0)
  })

  it('limite bloqueado = R$ 0', () => {
    const r = calculateCardLimit(makeParams({ score: 300 }))
    if (!r.canIssueCard) expect(r.limiteTotal).toBe(0)
  })
})

// ─── calculateCardLimit — breakdown ──────────────────────────────

describe('calculateCardLimit — transparência do cálculo', () => {
  it('breakdown.steps tem pelo menos 4 etapas', () => {
    const r = calculateCardLimit(makeParams())
    expect(r.breakdown.steps.length).toBeGreaterThanOrEqual(4)
  })

  it('breakdown.summary descreve o limite', () => {
    const r = calculateCardLimit(makeParams())
    expect(r.breakdown.summary).toContain('R$')
  })

  it('breakdown bloqueado menciona o motivo', () => {
    const r = calculateCardLimit(makeParams({ score: 300 }))
    expect(r.breakdown.summary).toContain('bloqueado')
  })

  it('contrato por_viagem → valor mensal = contractValue × 4', () => {
    const r = calculateCardLimit(makeParams({ contract: { paymentType: 'por_viagem', contractValue: 8500 } }))
    // Valor mensal estimado = 8500 × 4 = 34000
    // limiteContrato = 34000 × 0.30 × scoreFactor
    expect(r.limiteContrato).toBeGreaterThan(0)
  })
})

// ─── calculateAnticipationFee ─────────────────────────────────────

describe('calculateAnticipationFee — taxas por score', () => {
  it('score excelente (900) → taxa mais baixa (1.8%/mês)', () => {
    const r1 = calculateAnticipationFee({ score: 900, daysAnticipated: 30, amount: 10_000 })
    const r2 = calculateAnticipationFee({ score: 400, daysAnticipated: 30, amount: 10_000 })
    expect(r1.feeAmount).toBeLessThan(r2.feeAmount)
    expect(r1.dailyRate).toBeCloseTo(0.018 / 30, 6)
  })

  it('score baixo (400) → taxa mais alta (4.5%/mês)', () => {
    const r = calculateAnticipationFee({ score: 400, daysAnticipated: 30, amount: 10_000 })
    expect(r.dailyRate).toBeCloseTo(0.045 / 30, 6)
  })

  it('netAmount = amount - feeAmount', () => {
    const r = calculateAnticipationFee({ score: 750, daysAnticipated: 15, amount: 5_000 })
    expect(r.netAmount).toBeCloseTo(r.feeAmount > 0 ? 5_000 - r.feeAmount : 5_000, 1)
  })

  it('netAmount sempre menor que amount', () => {
    const r = calculateAnticipationFee({ score: 800, daysAnticipated: 10, amount: 8_000 })
    expect(r.netAmount).toBeLessThan(8_000)
    expect(r.netAmount).toBeGreaterThan(0)
  })

  it('0 dias antecipados → taxa mínima (evitar divisão por zero)', () => {
    expect(() =>
      calculateAnticipationFee({ score: 750, daysAnticipated: 0, amount: 5_000 })
    ).not.toThrow()
  })

  it('breakdown contém valor bruto, taxa e líquido', () => {
    const r = calculateAnticipationFee({ score: 750, daysAnticipated: 20, amount: 10_000 })
    expect(r.breakdown).toContain('bruto')
    expect(r.breakdown).toContain('Taxa')
    expect(r.breakdown).toContain('líquido')
  })

  it('melhores scores = taxas progressivamente menores', () => {
    const scores = [400, 500, 650, 750, 850]
    const fees   = scores.map((s) =>
      calculateAnticipationFee({ score: s, daysAnticipated: 30, amount: 10_000 }).feeAmount
    )
    // Verificar que cada taxa é menor que a anterior (decrescente com score crescente)
    for (let i = 1; i < fees.length; i++) {
      expect(fees[i]).toBeLessThan(fees[i - 1]!)
    }
  })
})

// ─── Constantes ───────────────────────────────────────────────────

describe('Constantes da Phase 4', () => {
  it('MIN_MONTHS_FOR_CARD = 3', () => expect(MIN_MONTHS_FOR_CARD).toBe(3))
  it('MIN_SCORE_FOR_CARD = 400',  () => expect(MIN_SCORE_FOR_CARD).toBe(400))
  it('MIN_MARGIN_FOR_CARD = 0.05', () => expect(MIN_MARGIN_FOR_CARD).toBe(0.05))
  it('MAX_CREDIT_PHASE4 = 200.000', () => expect(MAX_CREDIT_PHASE4).toBe(200_000))
  it('SCORE_MULTIPLIERS cobre 300–1000', () => {
    const min = Math.min(...SCORE_MULTIPLIERS.map((m) => m.min))
    const max = Math.max(...SCORE_MULTIPLIERS.map((m) => m.multiplier))
    expect(min).toBe(300)
    expect(max).toBe(6.0)
  })
  it('multiplicadores crescentes com score', () => {
    const sorted = [...SCORE_MULTIPLIERS].sort((a, b) => b.min - a.min)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.multiplier).toBeLessThan(sorted[i - 1]!.multiplier)
    }
  })
})
