import { describe, it, expect } from '@jest/globals'
import {
  calculateDre,
  calculateDreComparativo,
  classifyContractViability,
  analyzeContract,
} from '@/services/dre/calculator'
import { CONTRACT_VIABILITY } from '@/lib/constants'
import type { DreEntry } from '@/types/database.types'

// ─── Fixtures realistas ───────────────────────────────────────────

function entry(overrides: Partial<DreEntry>): DreEntry {
  return {
    id: crypto.randomUUID(),
    owner_id: 'owner-1',
    vehicle_id: null,
    period: '2026-03',
    entry_type: 'receita',
    category: 'frete',
    description: 'Teste',
    amount: 1000,
    km_reference: null,
    notes: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    ...overrides,
  } as DreEntry
}

// Cenário realista: caminhoneiro com uma viagem SP-CWB
const SCENARIO_SAUDAVEL: DreEntry[] = [
  entry({ entry_type: 'receita',        amount: 8000, km_reference: 400, description: 'Frete SP→CWB' }),
  entry({ entry_type: 'custo_fixo',     amount: 2500, category: 'parcela_caminhao' }),
  entry({ entry_type: 'custo_fixo',     amount: 800,  category: 'seguro' }),
  entry({ entry_type: 'custo_variavel', amount: 1800, category: 'diesel' }),
  entry({ entry_type: 'custo_variavel', amount: 300,  category: 'pedagio' }),
  entry({ entry_type: 'custo_variavel', amount: 200,  category: 'alimentacao_viagem' }),
]

// Cenário: prejuízo
const SCENARIO_PREJUIZO: DreEntry[] = [
  entry({ entry_type: 'receita',        amount: 3000, km_reference: 400 }),
  entry({ entry_type: 'custo_fixo',     amount: 2500, category: 'parcela_caminhao' }),
  entry({ entry_type: 'custo_variavel', amount: 1800, category: 'diesel' }),
]

// ─── calculateDre — cenários completos ───────────────────────────

describe('calculateDre — cenário saudável', () => {
  const result = calculateDre(SCENARIO_SAUDAVEL, '2026-03')

  it('totalReceita = 8000', ()  => expect(result.totalReceita).toBe(8000))
  it('totalCustoFixo = 3300',   () => expect(result.totalCustoFixo).toBe(3300))
  it('totalCustoVariavel = 2300', () => expect(result.totalCustoVariavel).toBe(2300))
  it('totalCusto = 5600',       () => expect(result.totalCusto).toBe(5600))
  it('resultadoOperacional = 2400', () => expect(result.resultadoOperacional).toBe(2400))
  it('margemOperacional ≈ 30%', () => expect(result.margemOperacional).toBeCloseTo(0.3))
  it('kmTotal = 400',           () => expect(result.kmTotal).toBe(400))
  it('custoPerKm = 14',         () => expect(result.custoPerKm).toBe(14)) // 5600/400
  it('totalLancamentos = 6',    () => expect(result.totalLancamentos).toBe(6))
  it('breakdown fixo correto',  () => {
    expect(result.custoFixoPorCategoria['parcela_caminhao']).toBe(2500)
    expect(result.custoFixoPorCategoria['seguro']).toBe(800)
  })
  it('breakdown variável correto', () => {
    expect(result.custoVariavelPorCategoria['diesel']).toBe(1800)
    expect(result.custoVariavelPorCategoria['pedagio']).toBe(300)
  })
})

describe('calculateDre — cenário prejuízo', () => {
  const result = calculateDre(SCENARIO_PREJUIZO, '2026-03')

  it('resultadoOperacional negativo', () =>
    expect(result.resultadoOperacional).toBeLessThan(0))
  it('margem negativa', () =>
    expect(result.margemOperacional).toBeLessThan(0))
  it('resultado = 3000 - 4300 = -1300', () =>
    expect(result.resultadoOperacional).toBe(-1300))
})

// ─── calculateDreComparativo ──────────────────────────────────────

describe('calculateDreComparativo', () => {
  it('detecta tendência de melhora', () => {
    const bom  = SCENARIO_SAUDAVEL
    const ruim = SCENARIO_PREJUIZO

    const comp = calculateDreComparativo(bom, ruim, '2026-03', '2026-02')
    expect(comp.tendencia).toBe('melhora')
  })

  it('detecta tendência de piora', () => {
    const comp = calculateDreComparativo(SCENARIO_PREJUIZO, SCENARIO_SAUDAVEL, '2026-03', '2026-02')
    expect(comp.tendencia).toBe('piora')
  })

  it('calcula variação de receita', () => {
    // Atual: 8000, anterior: 3000 → variação ≈ +167%
    const comp = calculateDreComparativo(SCENARIO_SAUDAVEL, SCENARIO_PREJUIZO, '2026-03', '2026-02')
    expect(comp.variacaoReceita).toBeGreaterThan(0)
  })

  it('retorna null para período anterior quando não fornecido', () => {
    const comp = calculateDreComparativo(SCENARIO_SAUDAVEL, null, '2026-03', null)
    expect(comp.periodoAnterior).toBeNull()
    expect(comp.variacaoReceita).toBe(0)
  })
})

// ─── Viabilidade de contratos ─────────────────────────────────────

describe('classifyContractViability — com custo/km real', () => {
  // Custo/km do cenário saudável = R$14/km

  it('contrato bom: R$18/km pago > R$14/km custo', () => {
    // 400km × R$18 = R$7200 recebido vs R$5600 custo → 22% margem ✅
    const r = classifyContractViability(7200, 400, 14)
    expect(r).toBe(CONTRACT_VIABILITY.SAUDAVEL)
  })

  it('contrato no limite: R$15/km vs R$14/km custo', () => {
    // 400km × R$15 = R$6000 vs R$5600 → ~6.7% margem ⚠️
    const r = classifyContractViability(6000, 400, 14)
    expect(r).toBe(CONTRACT_VIABILITY.NO_LIMITE)
  })

  it('contrato abaixo: R$13/km pago < R$14/km custo', () => {
    // 400km × R$13 = R$5200 vs R$5600 → margem negativa ❌
    const r = classifyContractViability(5200, 400, 14)
    expect(r).toBe(CONTRACT_VIABILITY.ABAIXO_CUSTO)
  })
})

describe('analyzeContract — detalhe financeiro completo', () => {
  it('lucro correto no cenário saudável', () => {
    const r = analyzeContract(7200, 400, 14)
    expect(r.estimatedCost).toBe(5600)
    expect(r.estimatedProfit).toBe(1600)
    expect(r.breakEvenKm).toBeCloseTo(514.3, 0) // 7200/14
  })

  it('prejuízo correto no cenário abaixo do custo', () => {
    const r = analyzeContract(5000, 400, 14)
    expect(r.estimatedCost).toBe(5600)
    expect(r.estimatedProfit).toBe(-600)
    expect(r.viability).toBe(CONTRACT_VIABILITY.ABAIXO_CUSTO)
  })

  it('recomendação inclui texto relevante para cada viabilidade', () => {
    const s = analyzeContract(7200, 400, 14)
    const l = analyzeContract(6000, 400, 14)
    const b = analyzeContract(5000, 400, 14)

    expect(s.recomendacao.toLowerCase()).toContain('margem')
    expect(l.recomendacao.toLowerCase()).toContain('imprevisto')
    expect(b.recomendacao.toLowerCase()).toContain('prejuízo')
  })
})
