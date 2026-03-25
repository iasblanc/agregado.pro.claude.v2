import { describe, it, expect } from '@jest/globals'
import {
  analyzeContractViability,
  scoreCandidateMatch,
  type ContractPublicData,
} from '@/services/contracts/viability'
import { CONTRACT_VIABILITY } from '@/lib/constants'

// ─── Fixtures ─────────────────────────────────────────────────────

const CONTRACT_SAUDAVEL: ContractPublicData = {
  id:               'contract-1',
  title:            'Frete SP → CWB regular',
  route_origin:     'São Paulo, SP',
  route_destination: 'Curitiba, PR',
  route_km:         400,
  vehicle_type:     'Cavalo 6x2',
  equipment_type:   'Semi-reboque 15 mts',
  contract_value:   9000,
  payment_type:     'por_viagem',
  duration_months:  6,
  start_date:       null,
  publisher_id:     'pub-1',
  candidates_count: 3,
  published_at:     '2026-05-01T00:00:00Z',
  status:           'publicado',
}

// Custo/km realista de um caminhoneiro bem gerenciado
const USER_COST_PER_KM = 14.0  // R$14/km

// ─── analyzeContractViability ─────────────────────────────────────

describe('analyzeContractViability', () => {
  describe('contrato saudável (R$9000 / 400km = R$22,50/km recebido vs R$14/km custo)', () => {
    const analysis = analyzeContractViability(CONTRACT_SAUDAVEL, USER_COST_PER_KM)

    it('viability = saudavel', () =>
      expect(analysis.viability).toBe(CONTRACT_VIABILITY.SAUDAVEL))

    it('custo estimado = 400km × R$14 = R$5600', () =>
      expect(analysis.estimatedCost).toBe(5600))

    it('lucro estimado = R$9000 - R$5600 = R$3400', () =>
      expect(analysis.estimatedProfit).toBe(3400))

    it('margem > 10%', () =>
      expect(analysis.margin).toBeGreaterThan(0.10))

    it('breakEvenKm = R$9000 / R$14 ≈ 643 km', () =>
      expect(analysis.breakEvenKm).toBeCloseTo(642.9, 0))

    it('recomendação menciona margem positiva', () =>
      expect(analysis.recomendacao.toLowerCase()).toContain('acima do seu custo'))
  })

  describe('contrato no limite (R$6100 / 400km)', () => {
    const contract = { ...CONTRACT_SAUDAVEL, contract_value: 6100 }
    const analysis = analyzeContractViability(contract, USER_COST_PER_KM)

    it('viability = no_limite', () =>
      expect(analysis.viability).toBe(CONTRACT_VIABILITY.NO_LIMITE))

    it('margem entre 0% e 10%', () => {
      expect(analysis.margin).toBeGreaterThan(0)
      expect(analysis.margin).toBeLessThan(0.10)
    })

    it('recomendação menciona imprevisto', () =>
      expect(analysis.recomendacao.toLowerCase()).toContain('imprevisto'))
  })

  describe('contrato abaixo do custo (R$5000 / 400km)', () => {
    const contract = { ...CONTRACT_SAUDAVEL, contract_value: 5000 }
    const analysis = analyzeContractViability(contract, USER_COST_PER_KM)

    it('viability = abaixo_custo', () =>
      expect(analysis.viability).toBe(CONTRACT_VIABILITY.ABAIXO_CUSTO))

    it('lucro estimado negativo', () =>
      expect(analysis.estimatedProfit).toBeLessThan(0))

    it('recomendação menciona prejuízo', () =>
      expect(analysis.recomendacao.toLowerCase()).toContain('prejuízo'))
  })

  describe('usuário sem dados de DRE (costPerKm = 0)', () => {
    const analysis = analyzeContractViability(CONTRACT_SAUDAVEL, 0)

    it('viability = no_limite (conservador sem dados)', () =>
      expect(analysis.viability).toBe(CONTRACT_VIABILITY.NO_LIMITE))

    it('custo estimado = 0', () =>
      expect(analysis.estimatedCost).toBe(0))

    it('recomendação sugere registrar custos', () =>
      expect(analysis.recomendacao).toContain('Cadastre seus custos'))
  })

  describe('displayData formatado', () => {
    const analysis = analyzeContractViability(CONTRACT_SAUDAVEL, USER_COST_PER_KM)

    it('valorContrato formatado em BRL', () =>
      expect(analysis.displayData.valorContrato).toContain('9.000'))

    it('custoKmUsuario formatado', () =>
      expect(analysis.displayData.custoKmUsuario).toContain('14'))

    it('margemPercent como string com %', () =>
      expect(analysis.displayData.margemPercent).toContain('%'))

    it('breakEvenLabel informativo', () =>
      expect(analysis.displayData.breakEvenLabel).toContain('km'))
  })
})

// ─── scoreCandidateMatch ──────────────────────────────────────────

describe('scoreCandidateMatch', () => {
  it('pontuação máxima: veículo correto + equipamento correto + histórico excelente', () => {
    const score = scoreCandidateMatch({
      contract: CONTRACT_SAUDAVEL,
      candidateVehicle: { type: 'Cavalo 6x2', equipment_type: 'Semi-reboque 15 mts' },
      avgScore: 5,
      totalEvaluations: 10,
    })
    expect(score.overallScore).toBe(100)  // 40 + 40 + 20
    expect(score.vehicleMatch).toBe(true)
    expect(score.equipmentMatch).toBe(true)
  })

  it('pontuação parcial: veículo errado', () => {
    const score = scoreCandidateMatch({
      contract: CONTRACT_SAUDAVEL,
      candidateVehicle: { type: 'Toco', equipment_type: 'Semi-reboque 15 mts' },
      avgScore: 5,
      totalEvaluations: 5,
    })
    expect(score.vehicleMatch).toBe(false)
    expect(score.overallScore).toBeLessThan(100)
  })

  it('novato sem avaliações recebe score neutro (não penalizado)', () => {
    const score = scoreCandidateMatch({
      contract: CONTRACT_SAUDAVEL,
      candidateVehicle: { type: 'Cavalo 6x2', equipment_type: 'Semi-reboque 15 mts' },
      avgScore: 0,
      totalEvaluations: 0,
    })
    // 40 (veículo) + 20 (neutro, sem histórico) + 20 (equipamento) = 80
    expect(score.overallScore).toBe(80)
    expect(score.totalEvaluations).toBe(0)
  })

  it('contrato sem equipamento → equipmentMatch sempre true', () => {
    const contractSemEquip = { ...CONTRACT_SAUDAVEL, equipment_type: null }
    const score = scoreCandidateMatch({
      contract: contractSemEquip,
      candidateVehicle: { type: 'Cavalo 6x2', equipment_type: null },
      avgScore: 4,
      totalEvaluations: 5,
    })
    expect(score.equipmentMatch).toBe(true)
  })
})
