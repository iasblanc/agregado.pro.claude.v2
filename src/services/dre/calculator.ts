import 'server-only'
import type { DreEntry } from '@/types/database.types'
import { calcMargin, calcCostPerKm, roundCents } from '@/lib/utils'
import {
  FIXED_COST_LABELS,
  VARIABLE_COST_LABELS,
  CONTRACT_VIABILITY,
  VIABILITY_THRESHOLDS,
  type ContractViability,
  type FixedCostCategory,
  type VariableCostCategory,
} from '@/lib/constants'

// ─── Tipos do DRE ──────────────────────────────────────────────────

export interface DreResult {
  period: string
  totalReceita: number
  totalCustoFixo: number
  totalCustoVariavel: number
  totalCusto: number
  resultadoOperacional: number
  margemOperacional: number   // 0–1
  kmTotal: number
  custoPerKm: number
  // Detalhamento por categoria
  custoFixoPorCategoria: Record<string, number>
  custoVariavelPorCategoria: Record<string, number>
  // Metadados
  totalLancamentos: number
  vehicleId?: string
}

export interface DreComparativo {
  periodoAtual: DreResult
  periodoAnterior: DreResult | null
  variacaoReceita: number       // % relativo ao período anterior
  variacaoResultado: number
  variacaoCustoPerKm: number
  tendencia: 'melhora' | 'piora' | 'estavel'
}

// ─── Calculadora DRE ───────────────────────────────────────────────

/**
 * Calcula o DRE completo a partir de um array de lançamentos.
 * Toda a lógica financeira vive aqui — server only.
 *
 * @param entries  Array de DreEntry do Supabase
 * @param period   Período de referência (YYYY-MM)
 * @param vehicleId Filtro opcional por veículo
 */
export function calculateDre(
  entries: DreEntry[],
  period: string,
  vehicleId?: string
): DreResult {
  const filtered = vehicleId
    ? entries.filter((e) => e.vehicle_id === vehicleId)
    : entries

  let totalReceita       = 0
  let totalCustoFixo     = 0
  let totalCustoVariavel = 0
  let kmTotal            = 0

  const custoFixoPorCategoria: Record<string, number>    = {}
  const custoVariavelPorCategoria: Record<string, number> = {}

  for (const entry of filtered) {
    const amount = Number(entry.amount)

    switch (entry.entry_type) {
      case 'receita':
        totalReceita += amount
        // km total: maior valor lançado no período
        if (entry.km_reference && Number(entry.km_reference) > kmTotal) {
          kmTotal = Number(entry.km_reference)
        }
        break

      case 'custo_fixo':
        totalCustoFixo += amount
        custoFixoPorCategoria[entry.category] =
          (custoFixoPorCategoria[entry.category] ?? 0) + amount
        break

      case 'custo_variavel':
        totalCustoVariavel += amount
        custoVariavelPorCategoria[entry.category] =
          (custoVariavelPorCategoria[entry.category] ?? 0) + amount
        break
    }
  }

  const totalCusto           = roundCents(totalCustoFixo + totalCustoVariavel)
  const resultadoOperacional = roundCents(totalReceita - totalCusto)
  const margemOperacional    = calcMargin(totalReceita, totalCusto)
  const custoPerKm           = calcCostPerKm(totalCusto, kmTotal)

  return {
    period,
    totalReceita:             roundCents(totalReceita),
    totalCustoFixo:           roundCents(totalCustoFixo),
    totalCustoVariavel:       roundCents(totalCustoVariavel),
    totalCusto,
    resultadoOperacional,
    margemOperacional,
    kmTotal,
    custoPerKm:               roundCents(custoPerKm),
    custoFixoPorCategoria,
    custoVariavelPorCategoria,
    totalLancamentos:         filtered.length,
    vehicleId,
  }
}

/**
 * Calcula DRE comparativo entre período atual e anterior.
 */
export function calculateDreComparativo(
  entriesAtual:    DreEntry[],
  entriesAnterior: DreEntry[] | null,
  periodoAtual:    string,
  periodoAnterior: string | null
): DreComparativo {
  const dreAtual = calculateDre(entriesAtual, periodoAtual)
  const dreAnterior =
    entriesAnterior && periodoAnterior
      ? calculateDre(entriesAnterior, periodoAnterior)
      : null

  const variacaoReceita    = calcVariacao(dreAtual.totalReceita,       dreAnterior?.totalReceita)
  const variacaoResultado  = calcVariacao(dreAtual.resultadoOperacional, dreAnterior?.resultadoOperacional)
  const variacaoCustoPerKm = calcVariacao(dreAtual.custoPerKm,         dreAnterior?.custoPerKm)

  const tendencia = calcTendencia(dreAtual, dreAnterior)

  return {
    periodoAtual:     dreAtual,
    periodoAnterior:  dreAnterior,
    variacaoReceita,
    variacaoResultado,
    variacaoCustoPerKm,
    tendencia,
  }
}

// ─── Viabilidade de Contratos (Phase 2 — disponível desde P1) ─────

/**
 * Classifica a viabilidade de um contrato com base no custo/km real do usuário.
 * Fonte: agregado-pro-master.md seção 4.1.4
 */
export function classifyContractViability(
  contractValue: number,
  kmContract:    number,
  userCostPerKm: number
): ContractViability {
  if (userCostPerKm === 0) return CONTRACT_VIABILITY.NO_LIMITE

  const estimatedCost = userCostPerKm * kmContract
  const margin = calcMargin(contractValue, estimatedCost)

  if (margin > VIABILITY_THRESHOLDS.SAUDAVEL_MIN_MARGIN) {
    return CONTRACT_VIABILITY.SAUDAVEL
  }
  if (margin > VIABILITY_THRESHOLDS.LIMITE_MIN_MARGIN) {
    return CONTRACT_VIABILITY.NO_LIMITE
  }
  return CONTRACT_VIABILITY.ABAIXO_CUSTO
}

/**
 * Detalhe financeiro de um contrato para o caminhoneiro.
 */
export interface ContractFinancialDetail {
  contractValue:  number
  estimatedCost:  number
  estimatedProfit: number
  margin:         number
  viability:      ContractViability
  breakEvenKm:    number   // km mínimo para empatar
  recomendacao:   string
}

export function analyzeContract(
  contractValue: number,
  kmContract:    number,
  userCostPerKm: number
): ContractFinancialDetail {
  const estimatedCost   = roundCents(userCostPerKm * kmContract)
  const estimatedProfit = roundCents(contractValue - estimatedCost)
  const margin          = calcMargin(contractValue, estimatedCost)
  const viability       = classifyContractViability(contractValue, kmContract, userCostPerKm)
  const breakEvenKm     = userCostPerKm > 0 ? roundCents(contractValue / userCostPerKm) : 0

  const recomendacoes: Record<ContractViability, string> = {
    saudavel:     'Contrato com margem positiva. Bom negócio com base no seu custo atual.',
    no_limite:    'Contrato no limite. Qualquer imprevisto pode gerar prejuízo.',
    abaixo_custo: 'Contrato abaixo do seu custo real. Aceitar causará prejuízo.',
  }

  return {
    contractValue,
    estimatedCost,
    estimatedProfit,
    margin,
    viability,
    breakEvenKm,
    recomendacao: recomendacoes[viability],
  }
}

// ─── Helpers internos ─────────────────────────────────────────────

function calcVariacao(atual: number, anterior?: number): number {
  if (!anterior || anterior === 0) return 0
  return roundCents(((atual - anterior) / Math.abs(anterior)) * 100)
}

function calcTendencia(
  atual:    DreResult,
  anterior: DreResult | null
): 'melhora' | 'piora' | 'estavel' {
  if (!anterior) return 'estavel'

  const deltaResultado = atual.resultadoOperacional - anterior.resultadoOperacional
  const deltaCusto     = atual.custoPerKm - anterior.custoPerKm

  if (deltaResultado > 50 && deltaCusto <= 0)  return 'melhora'
  if (deltaResultado < -50 || deltaCusto > 0.1) return 'piora'
  return 'estavel'
}

// ─── Labels de categorias para UI ─────────────────────────────────

export function getFixedCostLabel(category: string): string {
  return FIXED_COST_LABELS[category as FixedCostCategory] ?? category
}

export function getVariableCostLabel(category: string): string {
  return VARIABLE_COST_LABELS[category as VariableCostCategory] ?? category
}
