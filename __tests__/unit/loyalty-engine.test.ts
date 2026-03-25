import { describe, it, expect } from '@jest/globals'
import {
  calculateTier,
  calculatePoints,
  BENEFITS_CATALOG,
  TIER_MULTIPLIERS,
  POINTS_PER_EVENT,
  TIER_CONFIG,
  type LoyaltyMetrics,
  type LoyaltyTier,
} from '@/services/loyalty/engine'

// ─── Fixture base ─────────────────────────────────────────────────

function metrics(overrides: Partial<LoyaltyMetrics> = {}): LoyaltyMetrics {
  return {
    monthsActive:     6,
    monthsPositive:   5,
    contractsClosed:  4,
    kmAccumulated:    8000,
    avgScoreLast6m:   700,
    totalCardSpend:   30000,
    ...overrides,
  }
}

// ─── calculateTier ────────────────────────────────────────────────

describe('calculateTier — progressão de tiers', () => {
  it('recém-chegado (0 meses) → bronze', () => {
    const r = calculateTier(metrics({ monthsActive: 0, monthsPositive: 0, contractsClosed: 0 }))
    expect(r.tier).toBe('bronze')
  })

  it('3 meses, 2 positivos, 1 contrato → prata', () => {
    const r = calculateTier(metrics({ monthsActive: 3, monthsPositive: 2, contractsClosed: 1, avgScoreLast6m: 0 }))
    expect(r.tier).toBe('prata')
  })

  it('6 meses, 5 positivos, 3 contratos, score 650 → ouro', () => {
    const r = calculateTier(metrics({ monthsActive: 6, monthsPositive: 5, contractsClosed: 3, avgScoreLast6m: 650 }))
    expect(r.tier).toBe('ouro')
  })

  it('12 meses, 10 positivos, 8 contratos, score 750 → platina', () => {
    const r = calculateTier(metrics({ monthsActive: 12, monthsPositive: 10, contractsClosed: 8, avgScoreLast6m: 750 }))
    expect(r.tier).toBe('platina')
  })

  it('falta 1 mês para ouro → ainda prata', () => {
    const r = calculateTier(metrics({ monthsActive: 5, monthsPositive: 4, contractsClosed: 2, avgScoreLast6m: 640 }))
    expect(r.tier).toBe('prata')
  })

  it('falta score para platina → ouro', () => {
    const r = calculateTier(metrics({ monthsActive: 12, monthsPositive: 10, contractsClosed: 8, avgScoreLast6m: 700 }))
    expect(r.tier).toBe('ouro')  // Score 700 < 750 exigido para platina
  })
})

describe('calculateTier — progresso e próximo tier', () => {
  it('bronze tem próximo tier = prata', () => {
    const r = calculateTier(metrics({ monthsActive: 1, monthsPositive: 0, contractsClosed: 0 }))
    expect(r.nextTier).toBe('prata')
    expect(r.tier).toBe('bronze')
  })

  it('platina não tem próximo tier', () => {
    const r = calculateTier(metrics({ monthsActive: 12, monthsPositive: 10, contractsClosed: 8, avgScoreLast6m: 750 }))
    expect(r.nextTier).toBeNull()
    expect(r.progressToNext).toBe(100)
  })

  it('progressToNext entre 0 e 99 quando não está no topo', () => {
    const r = calculateTier(metrics({ monthsActive: 2, monthsPositive: 1, contractsClosed: 0 }))
    expect(r.progressToNext).toBeGreaterThanOrEqual(0)
    expect(r.progressToNext).toBeLessThanOrEqual(99)
  })

  it('missingFor não vazio quando faltam critérios', () => {
    const r = calculateTier(metrics({ monthsActive: 1, monthsPositive: 0, contractsClosed: 0 }))
    expect(r.missingFor.length).toBeGreaterThan(0)
  })
})

// ─── Multiplicadores por tier ─────────────────────────────────────

describe('TIER_MULTIPLIERS', () => {
  it('bronze = 1.0×', ()  => expect(TIER_MULTIPLIERS.bronze).toBe(1.0))
  it('prata = 1.5×',  ()  => expect(TIER_MULTIPLIERS.prata).toBe(1.5))
  it('ouro = 2.0×',   ()  => expect(TIER_MULTIPLIERS.ouro).toBe(2.0))
  it('platina = 3.0×',()  => expect(TIER_MULTIPLIERS.platina).toBe(3.0))
  it('multiplicadores crescentes com tier', () => {
    expect(TIER_MULTIPLIERS.bronze).toBeLessThan(TIER_MULTIPLIERS.prata)
    expect(TIER_MULTIPLIERS.prata).toBeLessThan(TIER_MULTIPLIERS.ouro)
    expect(TIER_MULTIPLIERS.ouro).toBeLessThan(TIER_MULTIPLIERS.platina)
  })
})

// ─── calculatePoints ──────────────────────────────────────────────

describe('calculatePoints — eventos fixos', () => {
  it('lancamento_dre = 5 pts base × multiplicador', () => {
    const r = calculatePoints('lancamento_dre', 'bronze')
    expect(r.basePoints).toBe(POINTS_PER_EVENT.lancamento_dre)
    expect(r.totalPoints).toBe(Math.round(5 * 1.0))
  })

  it('contrato_fechado = 200 pts base', () => {
    const r = calculatePoints('contrato_fechado', 'prata')
    expect(r.basePoints).toBe(200)
    expect(r.totalPoints).toBe(Math.round(200 * 1.5))  // 300 pts com prata
  })

  it('indicacao = 500 pts — maior recompensa', () => {
    const r = calculatePoints('indicacao', 'bronze')
    expect(r.basePoints).toBe(500)
  })

  it('aniversario_plataforma = 300 pts', () => {
    const r = calculatePoints('aniversario_plataforma', 'ouro')
    expect(r.basePoints).toBe(300)
    expect(r.totalPoints).toBe(Math.round(300 * 2.0))  // 600 pts com ouro
  })
})

describe('calculatePoints — eventos variáveis', () => {
  it('transacao_cartao: R$100 = 200 pts base', () => {
    const r = calculatePoints('transacao_cartao', 'bronze', { cardAmount: 100 })
    expect(r.basePoints).toBe(200)   // R$100 × 2 pts/real
    expect(r.totalPoints).toBe(200)  // × 1.0 (bronze)
  })

  it('transacao_cartao com platina = 600 pts para R$100', () => {
    const r = calculatePoints('transacao_cartao', 'platina', { cardAmount: 100 })
    expect(r.totalPoints).toBe(600)  // 200 × 3.0
  })

  it('meta_km_mensal acima de 2000km → pontos bônus', () => {
    const base  = calculatePoints('meta_km_mensal', 'bronze', { kmRodados: 2000 })
    const bonus = calculatePoints('meta_km_mensal', 'bronze', { kmRodados: 3000 })
    expect(bonus.basePoints).toBeGreaterThan(base.basePoints)
  })

  it('tier platina multiplica transacao_cartao por 3×', () => {
    const bronze  = calculatePoints('transacao_cartao', 'bronze',  { cardAmount: 50 })
    const platina = calculatePoints('transacao_cartao', 'platina', { cardAmount: 50 })
    expect(platina.totalPoints).toBe(bronze.totalPoints * 3)
  })
})

// ─── Catálogo de benefícios ───────────────────────────────────────

describe('BENEFITS_CATALOG', () => {
  it('tem pelo menos 8 benefícios', () => {
    expect(BENEFITS_CATALOG.length).toBeGreaterThanOrEqual(8)
  })

  it('todos têm id único', () => {
    const ids = BENEFITS_CATALOG.map((b) => b.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('pointsCost sempre > 0', () => {
    BENEFITS_CATALOG.forEach((b) => expect(b.pointsCost).toBeGreaterThan(0))
  })

  it('benefícios platina custam mais que bronze', () => {
    const platinaBenefits = BENEFITS_CATALOG.filter((b) => b.minTier === 'platina')
    const bronzeBenefits  = BENEFITS_CATALOG.filter((b) => b.minTier === 'bronze')
    if (platinaBenefits.length > 0 && bronzeBenefits.length > 0) {
      const avgPlatina = platinaBenefits.reduce((s, b) => s + b.pointsCost, 0) / platinaBenefits.length
      const avgBronze  = bronzeBenefits.reduce( (s, b) => s + b.pointsCost, 0) / bronzeBenefits.length
      expect(avgPlatina).toBeGreaterThan(avgBronze)
    }
  })

  it('todos têm ícone e categoria definidos', () => {
    BENEFITS_CATALOG.forEach((b) => {
      expect(b.icon.length).toBeGreaterThan(0)
      expect(b.category.length).toBeGreaterThan(0)
    })
  })
})

// ─── TIER_CONFIG ──────────────────────────────────────────────────

describe('TIER_CONFIG', () => {
  const tiers: LoyaltyTier[] = ['bronze', 'prata', 'ouro', 'platina']

  tiers.forEach((tier) => {
    it(`${tier} tem label, cor, ícone e descrição`, () => {
      const cfg = TIER_CONFIG[tier]
      expect(cfg.label.length).toBeGreaterThan(0)
      expect(cfg.color.length).toBeGreaterThan(0)
      expect(cfg.icon.length).toBeGreaterThan(0)
      expect(cfg.description.length).toBeGreaterThan(0)
    })
  })
})
