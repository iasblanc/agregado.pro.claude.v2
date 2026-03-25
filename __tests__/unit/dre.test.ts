import { describe, it, expect } from '@jest/globals'
import {
  calculateDre,
  classifyContractViability,
  analyzeContract,
} from '@/services/dre/calculator'
import { CONTRACT_VIABILITY } from '@/lib/constants'
import type { DreEntry } from '@/types/database.types'

// ─── Fixtures ─────────────────────────────────────────────────────

const BASE_ENTRY: DreEntry = {
  id:           '00000000-0000-0000-0000-000000000001',
  owner_id:     '00000000-0000-0000-0000-000000000099',
  vehicle_id:   null,
  period:       '2026-03',
  entry_type:   'receita',
  category:     'frete',
  description:  'Frete São Paulo - Curitiba',
  amount:       8000,
  km_reference: 400,
  notes:        null,
  created_at:   '2026-03-01T00:00:00Z',
  updated_at:   '2026-03-01T00:00:00Z',
}

function makeEntry(overrides: Partial<DreEntry>): DreEntry {
  return { ...BASE_ENTRY, ...overrides }
}

// ─── calculateDre ─────────────────────────────────────────────────

describe('calculateDre', () => {
  it('retorna DRE zerado para array vazio', () => {
    const result = calculateDre([], '2026-03')

    expect(result.totalReceita).toBe(0)
    expect(result.totalCusto).toBe(0)
    expect(result.resultadoOperacional).toBe(0)
    expect(result.margemOperacional).toBe(0)
    expect(result.custoPerKm).toBe(0)
    expect(result.kmTotal).toBe(0)
  })

  it('calcula receita corretamente', () => {
    const entries = [makeEntry({ entry_type: 'receita', amount: 8000, km_reference: 400 })]
    const result  = calculateDre(entries, '2026-03')

    expect(result.totalReceita).toBe(8000)
    expect(result.kmTotal).toBe(400)
  })

  it('calcula custos fixos corretamente', () => {
    const entries = [
      makeEntry({ entry_type: 'custo_fixo', category: 'parcela_caminhao', amount: 2500 }),
      makeEntry({ entry_type: 'custo_fixo', category: 'seguro',           amount: 800  }),
    ]
    const result = calculateDre(entries, '2026-03')

    expect(result.totalCustoFixo).toBe(3300)
    expect(result.custoFixoPorCategoria['parcela_caminhao']).toBe(2500)
    expect(result.custoFixoPorCategoria['seguro']).toBe(800)
  })

  it('calcula custos variáveis corretamente', () => {
    const entries = [
      makeEntry({ entry_type: 'custo_variavel', category: 'diesel',  amount: 1800 }),
      makeEntry({ entry_type: 'custo_variavel', category: 'pedagio', amount: 300  }),
    ]
    const result = calculateDre(entries, '2026-03')

    expect(result.totalCustoVariavel).toBe(2100)
    expect(result.custoVariavelPorCategoria['diesel']).toBe(1800)
    expect(result.custoVariavelPorCategoria['pedagio']).toBe(300)
  })

  it('calcula resultado operacional e margem corretamente', () => {
    const entries = [
      makeEntry({ entry_type: 'receita',        amount: 8000, km_reference: 400 }),
      makeEntry({ entry_type: 'custo_fixo',     amount: 2500 }),
      makeEntry({ entry_type: 'custo_variavel', amount: 2100 }),
    ]
    const result = calculateDre(entries, '2026-03')

    expect(result.totalReceita).toBe(8000)
    expect(result.totalCusto).toBe(4600)
    expect(result.resultadoOperacional).toBe(3400) // 8000 - 4600
    expect(result.margemOperacional).toBeCloseTo(0.425) // 3400/8000
  })

  it('calcula custo por km corretamente', () => {
    const entries = [
      makeEntry({ entry_type: 'receita',        amount: 8000, km_reference: 400 }),
      makeEntry({ entry_type: 'custo_variavel', amount: 2000 }),
    ]
    const result = calculateDre(entries, '2026-03')

    expect(result.custoPerKm).toBeCloseTo(5.0) // 2000 / 400
  })

  it('usa o maior valor de km_reference do período', () => {
    const entries = [
      makeEntry({ entry_type: 'receita', amount: 5000, km_reference: 350 }),
      makeEntry({ entry_type: 'receita', amount: 3000, km_reference: 200 }),
    ]
    const result = calculateDre(entries, '2026-03')

    expect(result.kmTotal).toBe(350) // maior valor
  })

  it('filtra por vehicleId quando fornecido', () => {
    const vehicleA = '00000000-0000-0000-0000-000000000001'
    const vehicleB = '00000000-0000-0000-0000-000000000002'

    const entries = [
      makeEntry({ vehicle_id: vehicleA, entry_type: 'receita', amount: 8000, km_reference: 400 }),
      makeEntry({ vehicle_id: vehicleB, entry_type: 'receita', amount: 5000, km_reference: 250 }),
    ]

    const resultA = calculateDre(entries, '2026-03', vehicleA)
    const resultB = calculateDre(entries, '2026-03', vehicleB)

    expect(resultA.totalReceita).toBe(8000)
    expect(resultB.totalReceita).toBe(5000)
  })

  it('retorna período correto no resultado', () => {
    const result = calculateDre([], '2026-03')
    expect(result.period).toBe('2026-03')
  })

  it('contabiliza total de lançamentos', () => {
    const entries = [
      makeEntry({ entry_type: 'receita' }),
      makeEntry({ entry_type: 'custo_fixo' }),
      makeEntry({ entry_type: 'custo_variavel' }),
    ]
    const result = calculateDre(entries, '2026-03')

    expect(result.totalLancamentos).toBe(3)
  })
})

// ─── classifyContractViability ────────────────────────────────────

describe('classifyContractViability', () => {
  it('classifica como saudável quando margem > 10%', () => {
    // Contrato: R$8000, 400km, custo/km: R$5,00 → custo total: R$2000
    // Margem: (8000 - 2000) / 8000 = 75% ✅
    const result = classifyContractViability(8000, 400, 5.0)
    expect(result).toBe(CONTRACT_VIABILITY.SAUDAVEL)
  })

  it('classifica como no limite quando margem entre 0% e 10%', () => {
    // Contrato: R$2100, 400km, custo/km: R$5,00 → custo: R$2000
    // Margem: (2100 - 2000) / 2100 ≈ 4.8% ⚠️
    const result = classifyContractViability(2100, 400, 5.0)
    expect(result).toBe(CONTRACT_VIABILITY.NO_LIMITE)
  })

  it('classifica como abaixo do custo quando margem negativa', () => {
    // Contrato: R$1800, 400km, custo/km: R$5,00 → custo: R$2000
    // Margem: (1800 - 2000) / 1800 < 0 ❌
    const result = classifyContractViability(1800, 400, 5.0)
    expect(result).toBe(CONTRACT_VIABILITY.ABAIXO_CUSTO)
  })

  it('retorna no_limite quando custo/km é zero', () => {
    const result = classifyContractViability(5000, 400, 0)
    expect(result).toBe(CONTRACT_VIABILITY.NO_LIMITE)
  })
})

// ─── analyzeContract ──────────────────────────────────────────────

describe('analyzeContract', () => {
  it('retorna análise completa de um contrato saudável', () => {
    const result = analyzeContract(8000, 400, 5.0)

    expect(result.contractValue).toBe(8000)
    expect(result.estimatedCost).toBe(2000)   // 400 * 5.0
    expect(result.estimatedProfit).toBe(6000) // 8000 - 2000
    expect(result.viability).toBe(CONTRACT_VIABILITY.SAUDAVEL)
    expect(result.breakEvenKm).toBe(1600)     // 8000 / 5.0
    expect(result.recomendacao).toContain('margem positiva')
  })

  it('retorna recomendação de cuidado para contrato no limite', () => {
    const result = analyzeContract(2050, 400, 5.0)
    expect(result.recomendacao).toContain('imprevisto')
  })

  it('retorna recomendação de perda para contrato abaixo do custo', () => {
    const result = analyzeContract(1500, 400, 5.0)
    expect(result.viability).toBe(CONTRACT_VIABILITY.ABAIXO_CUSTO)
    expect(result.recomendacao).toContain('prejuízo')
  })

  it('calcula breakEven como zero quando custo/km é zero', () => {
    const result = analyzeContract(5000, 400, 0)
    expect(result.breakEvenKm).toBe(0)
  })
})
