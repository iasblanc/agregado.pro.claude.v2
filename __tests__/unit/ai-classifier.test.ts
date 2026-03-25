import { describe, it, expect } from '@jest/globals'
import {
  classifyDeterministic,
  CLASSIFICATION_THRESHOLDS,
  type TransactionContext,
} from '@/services/ai/classifier'

// ─── Fixture base ─────────────────────────────────────────────────

function ctx(overrides: Partial<TransactionContext>): TransactionContext {
  return {
    merchantName:  'Posto Teste',
    merchantMcc:   null,
    merchantCnpj:  null,
    merchantCity:  'São Paulo',
    merchantState: 'SP',
    amount:        100,
    transactedAt:  new Date('2026-05-15T10:00:00Z'),
    ...overrides,
  }
}

// ─── classifyDeterministic — MCC ─────────────────────────────────

describe('classifyDeterministic — MCC', () => {
  it('MCC 5541 → diesel, custo_variavel, confiança 0.99', () => {
    const result = classifyDeterministic(ctx({ merchantMcc: '5541' }))
    expect(result).not.toBeNull()
    expect(result?.dreCategory).toBe('diesel')
    expect(result?.entryType).toBe('custo_variavel')
    expect(result?.confidence).toBeCloseTo(0.99)
    expect(result?.isOperational).toBe(true)
    expect(result?.source).toBe('sistema')
  })

  it('MCC 4784 → pedágio, confiança 1.00', () => {
    const result = classifyDeterministic(ctx({ merchantMcc: '4784' }))
    expect(result?.dreCategory).toBe('pedagio')
    expect(result?.confidence).toBe(1.00)
  })

  it('MCC 7531 → manutenção, custo_variavel', () => {
    const result = classifyDeterministic(ctx({ merchantMcc: '7531' }))
    expect(result?.dreCategory).toBe('manutencao')
    expect(result?.entryType).toBe('custo_variavel')
  })

  it('MCC 6311 → seguro, custo_fixo', () => {
    const result = classifyDeterministic(ctx({ merchantMcc: '6311' }))
    expect(result?.dreCategory).toBe('seguro')
    expect(result?.entryType).toBe('custo_fixo')
    expect(result?.isOperational).toBe(true)
  })

  it('MCC 5411 (supermercado) → pessoal, não operacional', () => {
    const result = classifyDeterministic(ctx({ merchantMcc: '5411' }))
    expect(result?.entryType).toBe('pessoal')
    expect(result?.isOperational).toBe(false)
  })

  it('MCC 7011 (hotel) → hospedagem, custo_variavel', () => {
    const result = classifyDeterministic(ctx({ merchantMcc: '7011' }))
    expect(result?.dreCategory).toBe('hospedagem')
  })

  it('MCC desconhecido → null (cai para keyword ou IA)', () => {
    const result = classifyDeterministic(ctx({ merchantMcc: '9999' }))
    expect(result).toBeNull()
  })

  it('sem MCC → tenta keyword', () => {
    const result = classifyDeterministic(ctx({
      merchantMcc:  null,
      merchantName: 'Posto Petrobras BR',
    }))
    expect(result).not.toBeNull()
    expect(result?.dreCategory).toBe('diesel')
  })
})

// ─── classifyDeterministic — Keywords ────────────────────────────

describe('classifyDeterministic — Keywords no nome', () => {
  it('Petrobras → diesel', () => {
    const r = classifyDeterministic(ctx({ merchantName: 'PETROBRAS DISTRIBUIDORA' }))
    expect(r?.dreCategory).toBe('diesel')
    expect(r?.confidence).toBeGreaterThan(0.90)
  })

  it('Arteris → pedágio', () => {
    const r = classifyDeterministic(ctx({ merchantName: 'ARTERIS LITORAL SUL' }))
    expect(r?.dreCategory).toBe('pedagio')
    expect(r?.confidence).toBeGreaterThan(0.95)
  })

  it('Borracharia → pneus', () => {
    const r = classifyDeterministic(ctx({ merchantName: 'Borracharia do João' }))
    expect(r?.dreCategory).toBe('pneus')
  })

  it('Porto Seguro → seguro', () => {
    const r = classifyDeterministic(ctx({ merchantName: 'PORTO SEGURO SEGUROS' }))
    expect(r?.dreCategory).toBe('seguro')
  })

  it('Randon → manutenção', () => {
    const r = classifyDeterministic(ctx({ merchantName: 'RANDON IMPLEMENTOS' }))
    expect(r?.dreCategory).toBe('manutencao')
  })

  it('Estabelecimento genérico sem match → null', () => {
    const r = classifyDeterministic(ctx({ merchantName: 'COMERCIO GERAL LTDA' }))
    expect(r).toBeNull()
  })
})

// ─── Thresholds ───────────────────────────────────────────────────

describe('CLASSIFICATION_THRESHOLDS', () => {
  it('AUTO threshold = 0.85', () =>
    expect(CLASSIFICATION_THRESHOLDS.AUTO).toBe(0.85))

  it('SUGGEST threshold = 0.60', () =>
    expect(CLASSIFICATION_THRESHOLDS.SUGGEST).toBe(0.60))

  it('AUTO > SUGGEST (hierarquia correta)', () =>
    expect(CLASSIFICATION_THRESHOLDS.AUTO).toBeGreaterThan(CLASSIFICATION_THRESHOLDS.SUGGEST))
})

// ─── Casos de negócio críticos ────────────────────────────────────

describe('Regras de negócio — separação operacional/pessoal', () => {
  it('Farmácia (MCC 5912) → pessoal, não operacional', () => {
    const r = classifyDeterministic(ctx({ merchantMcc: '5912' }))
    expect(r?.isOperational).toBe(false)
    expect(r?.entryType).toBe('pessoal')
  })

  it('Combustível operacional → isOperational = true', () => {
    const r = classifyDeterministic(ctx({ merchantMcc: '5541' }))
    expect(r?.isOperational).toBe(true)
  })

  it('Seguro → custo_fixo (não variável)', () => {
    const r = classifyDeterministic(ctx({ merchantMcc: '6311' }))
    expect(r?.entryType).toBe('custo_fixo')
  })

  it('Pedágio → custo_variável (não fixo)', () => {
    const r = classifyDeterministic(ctx({ merchantMcc: '4784' }))
    expect(r?.entryType).toBe('custo_variavel')
  })
})
