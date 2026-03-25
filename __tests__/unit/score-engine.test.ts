import { describe, it, expect } from '@jest/globals'
import {
  calculateCreditScore,
  calcLimiteSugerido,
  DRIVER_WEIGHTS,
  MIN_MONTHS_ELIGIBLE,
  IDEAL_MONTHS,
  type MonthlySnapshot,
  type ScoreInput,
} from '@/services/credit/score-engine'

// ─── Fixtures ─────────────────────────────────────────────────────

function snap(overrides: Partial<MonthlySnapshot> = {}): MonthlySnapshot {
  return {
    period:          '2026-05',
    receitaTotal:    8000,
    custoTotal:      5600,
    resultadoOp:     2400,
    margemOp:        0.30,
    custoKm:         14.0,
    kmTotal:         400,
    contractsActive: 1,
    hasCardData:     true,
    ...overrides,
  }
}

function makeInput(overrides: {
  months?: number
  snapData?: Partial<MonthlySnapshot>
  contracts?: Partial<ScoreInput['contractsHistory']>
} = {}): ScoreInput {
  const months = overrides.months ?? 6
  const snapshots = Array.from({ length: months }, (_, i) =>
    snap({
      ...overrides.snapData,
      period: `2026-${String(6 - i).padStart(2, '0')}`,
    })
  )
  return {
    ownerId:  'owner-1',
    snapshots,
    contractsHistory: {
      totalContracts:     12,
      closedContracts:    10,
      avgEvaluationScore: 4.5,
      totalEvaluations:   8,
      ...overrides.contracts,
    },
  }
}

// ─── Elegibilidade ────────────────────────────────────────────────

describe('Elegibilidade — mínimo de histórico', () => {
  it('0 meses → inelegível', () => {
    const r = calculateCreditScore({ ownerId: 'x', snapshots: [], contractsHistory: { totalContracts: 0, closedContracts: 0, avgEvaluationScore: 0, totalEvaluations: 0 } })
    expect(r.isEligible).toBe(false)
    expect(r.score).toBe(0)
    expect(r.tier).toBe('insuficiente')
  })

  it('1 mês → inelegível', () => {
    const r = calculateCreditScore({ ownerId: 'x', snapshots: [snap()], contractsHistory: { totalContracts: 0, closedContracts: 0, avgEvaluationScore: 0, totalEvaluations: 0 } })
    expect(r.isEligible).toBe(false)
  })

  it('2 meses → inelegível', () => {
    const r = calculateCreditScore({ ownerId: 'x', snapshots: [snap(), snap({ period: '2026-04' })], contractsHistory: { totalContracts: 0, closedContracts: 0, avgEvaluationScore: 0, totalEvaluations: 0 } })
    expect(r.isEligible).toBe(false)
  })

  it(`${MIN_MONTHS_ELIGIBLE} meses → elegível`, () => {
    const r = calculateCreditScore(makeInput({ months: MIN_MONTHS_ELIGIBLE }))
    expect(r.isEligible).toBe(true)
    expect(r.score).toBeGreaterThan(300)
  })

  it('12 meses → score máximo (bônus de dados completo)', () => {
    const r12 = calculateCreditScore(makeInput({ months: 12 }))
    const r6  = calculateCreditScore(makeInput({ months: 6  }))
    expect(r12.score).toBeGreaterThan(r6.score)
  })
})

// ─── Faixas de score ──────────────────────────────────────────────

describe('Faixas de score — tiers corretos', () => {
  it('negócio excelente → tier muito_bom ou excelente', () => {
    const r = calculateCreditScore(makeInput({
      months: 12,
      snapData: { margemOp: 0.35, receitaTotal: 15000, resultadoOp: 5250 },
      contracts: { avgEvaluationScore: 5, totalEvaluations: 20, closedContracts: 18, totalContracts: 20 },
    }))
    expect(['muito_bom', 'excelente']).toContain(r.tier)
    expect(r.score).toBeGreaterThanOrEqual(750)
  })

  it('negócio com margem zero → score baixo', () => {
    const r = calculateCreditScore(makeInput({
      months: 3,
      snapData: { margemOp: 0, resultadoOp: 0 },
      contracts: { totalContracts: 0, closedContracts: 0, avgEvaluationScore: 0, totalEvaluations: 0 },
    }))
    expect(r.score).toBeLessThan(600)
  })

  it('meses negativos penalizam score', () => {
    const positivo = makeInput({ months: 6, snapData: { margemOp: 0.20, resultadoOp: 1600 } })
    const negativo = makeInput({
      months: 6,
      snapData: { margemOp: -0.10, resultadoOp: -800 },
    })
    const rPos = calculateCreditScore(positivo)
    const rNeg = calculateCreditScore(negativo)
    expect(rPos.score).toBeGreaterThan(rNeg.score)
  })
})

// ─── Drivers individuais ──────────────────────────────────────────

describe('Driver: receitaEstabilidade', () => {
  it('receita estável → driver alto', () => {
    // Todas as receitas iguais = CV zero
    const r = calculateCreditScore(makeInput({ months: 6, snapData: { receitaTotal: 8000 } }))
    expect(r.drivers.receitaEstabilidade).toBeGreaterThanOrEqual(80)
  })

  it('receita muito variável → driver baixo', () => {
    const input = makeInput({ months: 4 })
    // Variação extrema: alternando valores
    input.snapshots[0]!.receitaTotal = 15000
    input.snapshots[1]!.receitaTotal = 1000
    input.snapshots[2]!.receitaTotal = 14000
    input.snapshots[3]!.receitaTotal = 900
    const r = calculateCreditScore(input)
    expect(r.drivers.receitaEstabilidade).toBeLessThan(50)
  })
})

describe('Driver: margemOperacional', () => {
  it('margem de 30% → driver alto', () => {
    const r = calculateCreditScore(makeInput({ months: 6, snapData: { margemOp: 0.30 } }))
    expect(r.drivers.margemOperacional).toBeGreaterThan(60)
  })

  it('margem negativa → driver próximo de zero', () => {
    const r = calculateCreditScore(makeInput({ months: 3, snapData: { margemOp: -0.20, resultadoOp: -1600 } }))
    expect(r.drivers.margemOperacional).toBeLessThan(20)
  })
})

describe('Driver: historicoPagamentos', () => {
  it('5 estrelas com muitas avaliações → driver máximo', () => {
    const r = calculateCreditScore(makeInput({
      months: 6,
      contracts: { avgEvaluationScore: 5, totalEvaluations: 20, totalContracts: 20, closedContracts: 18 },
    }))
    expect(r.drivers.historicoPagamentos).toBe(100)
  })

  it('sem avaliações (novato) → driver neutro 50', () => {
    const r = calculateCreditScore(makeInput({
      months: 3,
      contracts: { avgEvaluationScore: 0, totalEvaluations: 0, totalContracts: 0, closedContracts: 0 },
    }))
    expect(r.drivers.historicoPagamentos).toBe(50)
  })

  it('avaliação ruim (2/5) → driver baixo', () => {
    const r = calculateCreditScore(makeInput({
      months: 6,
      contracts: { avgEvaluationScore: 2, totalEvaluations: 5, totalContracts: 5, closedContracts: 3 },
    }))
    expect(r.drivers.historicoPagamentos).toBeLessThan(50)
  })
})

describe('Driver: custoKmTendencia', () => {
  it('custo/km caindo 15% → driver 100', () => {
    const input = makeInput({ months: 6 })
    // Primeiros meses: custo alto
    input.snapshots.slice(0, 3).forEach((s) => { s.custoKm = 18 })
    // Últimos meses: custo caindo
    input.snapshots.slice(3).forEach((s)  => { s.custoKm = 14 })
    const r = calculateCreditScore(input)
    expect(r.drivers.custoKmTendencia).toBeGreaterThanOrEqual(85)
  })

  it('custo/km subindo 20% → driver baixo', () => {
    const input = makeInput({ months: 6 })
    input.snapshots.slice(0, 3).forEach((s) => { s.custoKm = 12 })
    input.snapshots.slice(3).forEach((s)  => { s.custoKm = 16 })
    const r = calculateCreditScore(input)
    expect(r.drivers.custoKmTendencia).toBeLessThan(40)
  })
})

// ─── calcLimiteSugerido ───────────────────────────────────────────

describe('calcLimiteSugerido', () => {
  it('score excelente (900) → multiplicador 6×', () => {
    const lucroMensal = 2400  // R$8k receita × 30% margem
    const limite = calcLimiteSugerido(8000, 0.30, 900)
    expect(limite).toBeCloseTo(lucroMensal * 6, -3)
  })

  it('score bom (700) → multiplicador 4×', () => {
    const limite = calcLimiteSugerido(8000, 0.30, 700)
    expect(limite).toBeCloseTo(2400 * 4, -3)
  })

  it('margem zero → limite zero', () => {
    const limite = calcLimiteSugerido(8000, 0, 800)
    expect(limite).toBe(0)
  })

  it('limite mínimo R$1.000', () => {
    const limite = calcLimiteSugerido(500, 0.10, 300)
    expect(limite).toBeGreaterThanOrEqual(1000)
  })

  it('limite máximo R$150.000 na Phase 3', () => {
    const limite = calcLimiteSugerido(200_000, 0.50, 1000)
    expect(limite).toBeLessThanOrEqual(150_000)
  })

  it('resultado arredondado para centenas', () => {
    const limite = calcLimiteSugerido(7500, 0.25, 700)
    expect(limite % 100).toBe(0)
  })
})

// ─── Pesos dos drivers ────────────────────────────────────────────

describe('DRIVER_WEIGHTS — soma = 100', () => {
  it('soma de todos os pesos = 100', () => {
    const total = Object.values(DRIVER_WEIGHTS).reduce((s, v) => s + v, 0)
    expect(total).toBe(100)
  })

  it('receita e margem têm maior peso (25% cada)', () => {
    expect(DRIVER_WEIGHTS.receitaEstabilidade).toBe(25)
    expect(DRIVER_WEIGHTS.margemOperacional).toBe(25)
  })
})

// ─── Explicação (transparência) ────────────────────────────────────

describe('Explicação — transparência do score', () => {
  it('score elegível → explicação com summary', () => {
    const r = calculateCreditScore(makeInput({ months: 6 }))
    expect(r.explanation.summary).toContain(String(r.score))
    expect(r.explanation.summary).toContain('meses')
  })

  it('score inelegível → nextSteps sugere ação concreta', () => {
    const r = calculateCreditScore(makeInput({ months: 2 }))
    expect(r.explanation.nextSteps.length).toBeGreaterThan(0)
    const text = r.explanation.nextSteps.join(' ')
    expect(text).toMatch(/mês|DRE|cartão/i)
  })

  it('driver excelente → mainStrength preenchido', () => {
    const r = calculateCreditScore(makeInput({
      months: 6,
      snapData: { receitaTotal: 10000, margemOp: 0.40 },
      contracts: { avgEvaluationScore: 5, totalEvaluations: 15, totalContracts: 15, closedContracts: 14 },
    }))
    expect(r.explanation.mainStrength).not.toBeNull()
  })
})
