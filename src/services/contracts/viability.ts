import 'server-only'
import {
  CONTRACT_VIABILITY,
  VIABILITY_THRESHOLDS,
  type ContractViability,
} from '@/lib/constants'
import { calcMargin, roundCents, formatBRL, formatCostPerKm } from '@/lib/utils'

// ─── Tipos do Marketplace ─────────────────────────────────────────

export interface ContractPublicData {
  id:               string
  title:            string
  route_origin:     string
  route_destination: string
  route_km:         number
  vehicle_type:     string
  equipment_type:   string | null
  contract_value:   number
  payment_type:     string
  duration_months:  number | null
  start_date:       string | null
  publisher_id:     string
  candidates_count: number
  published_at:     string | null
  status:           string
}

export interface ContractViabilityAnalysis {
  contractId:       string
  contractValue:    number
  routeKm:          number
  userCostPerKm:    number
  estimatedCost:    number
  estimatedProfit:  number
  margin:           number
  viability:        ContractViability
  breakEvenKm:      number
  recomendacao:     string
  // Para o caminhoneiro visualizar
  displayData: {
    valorContrato:    string   // "R$ 8.000,00"
    custoEstimado:    string   // "R$ 5.600,00"
    lucroEstimado:    string   // "R$ 2.400,00"
    margemPercent:    string   // "30,0%"
    custoKmUsuario:  string   // "R$ 14,00/km"
    breakEvenLabel:  string   // "Empata com 571 km"
  }
}

// ─── Análise de viabilidade de contrato ──────────────────────────

/**
 * Calcula a viabilidade de um contrato para um caminhoneiro específico.
 * Usa o custo/km real do usuário, calculado pelo DRE engine.
 *
 * Regra crítica (master.md):
 * - Nunca usar score de bureau para essa classificação
 * - Sempre baseado no custo real registrado pelo usuário
 * - Se não houver dados suficientes, retornar 'no_limite' (conservador)
 */
export function analyzeContractViability(
  contract:     ContractPublicData,
  userCostPerKm: number
): ContractViabilityAnalysis {
  const km            = Number(contract.route_km)
  const value         = Number(contract.contract_value)
  const estimatedCost = roundCents(userCostPerKm * km)
  const estimatedProfit = roundCents(value - estimatedCost)
  const margin        = calcMargin(value, estimatedCost)

  let viability: ContractViability
  if (userCostPerKm === 0) {
    viability = CONTRACT_VIABILITY.NO_LIMITE  // sem dados = conservador
  } else if (margin > VIABILITY_THRESHOLDS.SAUDAVEL_MIN_MARGIN) {
    viability = CONTRACT_VIABILITY.SAUDAVEL
  } else if (margin > VIABILITY_THRESHOLDS.LIMITE_MIN_MARGIN) {
    viability = CONTRACT_VIABILITY.NO_LIMITE
  } else {
    viability = CONTRACT_VIABILITY.ABAIXO_CUSTO
  }

  const breakEvenKm = userCostPerKm > 0 ? roundCents(value / userCostPerKm) : 0

  const recomendacoes: Record<ContractViability, string> = {
    saudavel:
      'Este contrato está acima do seu custo real. Boa oportunidade com base no seu histórico.',
    no_limite:
      userCostPerKm === 0
        ? 'Cadastre seus custos no DRE para ver a viabilidade real deste contrato.'
        : 'Contrato muito próximo do seu custo. Qualquer imprevisto pode gerar prejuízo.',
    abaixo_custo:
      `Contrato abaixo do seu custo real de ${formatCostPerKm(userCostPerKm)}. ` +
      'Aceitar causará prejuízo operacional.',
  }

  return {
    contractId:      contract.id,
    contractValue:   value,
    routeKm:         km,
    userCostPerKm,
    estimatedCost,
    estimatedProfit,
    margin,
    viability,
    breakEvenKm,
    recomendacao: recomendacoes[viability],
    displayData: {
      valorContrato:   formatBRL(value),
      custoEstimado:   formatBRL(estimatedCost),
      lucroEstimado:   formatBRL(Math.abs(estimatedProfit)),
      margemPercent:   `${(margin * 100).toFixed(1)}%`,
      custoKmUsuario:  formatCostPerKm(userCostPerKm),
      breakEvenLabel:  breakEvenKm > 0
        ? `Empata com ${breakEvenKm.toFixed(0)} km rodados`
        : 'Informe seus custos para calcular o ponto de equilíbrio',
    },
  }
}

// ─── Score de aderência do candidato ─────────────────────────────

export interface CandidateScore {
  profileId:        string
  vehicleMatch:     boolean
  equipmentMatch:   boolean
  avgScore:         number   // 0–5
  totalEvaluations: number
  overallScore:     number   // 0–100
}

/**
 * Calcula o score de aderência de um candidato a um contrato.
 * Usado pela transportadora para priorizar candidatos.
 */
export function scoreCandidateMatch(params: {
  contract:         ContractPublicData
  candidateVehicle: { type: string; equipment_type: string | null } | null
  avgScore:         number
  totalEvaluations: number
}): CandidateScore {
  const { contract, candidateVehicle, avgScore, totalEvaluations } = params

  const vehicleMatch    = candidateVehicle?.type === contract.vehicle_type
  const equipmentMatch  = !contract.equipment_type ||
                          candidateVehicle?.equipment_type === contract.equipment_type

  // Score composto:
  // 40% aderência do veículo + 40% avaliações históricas + 20% bônus equipamento
  const vehicleScore    = vehicleMatch    ? 40 : 0
  const evaluationScore = totalEvaluations > 0
    ? Math.round((avgScore / 5) * 40)
    : 20  // sem histórico = score neutro (não penaliza novatos)
  const equipmentScore  = equipmentMatch  ? 20 : 0

  const overallScore = vehicleScore + evaluationScore + equipmentScore

  return {
    profileId:        '',
    vehicleMatch,
    equipmentMatch,
    avgScore,
    totalEvaluations,
    overallScore,
  }
}
