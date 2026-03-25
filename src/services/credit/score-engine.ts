import 'server-only'

// ─── Tipos ────────────────────────────────────────────────────────

export interface MonthlySnapshot {
  period:          string   // YYYY-MM
  receitaTotal:    number
  custoTotal:      number
  resultadoOp:     number
  margemOp:        number   // 0–1
  custoKm:         number
  kmTotal:         number
  contractsActive: number
  hasCardData:     boolean
}

export interface ScoreInput {
  ownerId:   string
  snapshots: MonthlySnapshot[]   // Histórico mensal (mín 3, ideal 12+)
  contractsHistory: {
    totalContracts:   number
    closedContracts:  number
    avgEvaluationScore: number  // 0–5
    totalEvaluations: number
  }
}

export interface ScoreDrivers {
  receitaEstabilidade:   number   // 0–100
  margemOperacional:     number   // 0–100
  regularidadeContratos: number   // 0–100
  historicoPagamentos:   number   // 0–100
  custoKmTendencia:      number   // 0–100
  sazonalidade:          number   // 0–100
}

export interface ScoreResult {
  score:          number   // 300–1000
  tier:           ScoreTier
  isEligible:     boolean
  drivers:        ScoreDrivers
  monthsOfData:   number
  limiteSugerido: number
  // Métricas de contexto (para transparência)
  receitaMediaMensal:   number
  margemMediaPercent:   number
  custoKmMedio:         number
  mesesPositivos:       number
  // Para exibição
  explanation:    ScoreExplanation
}

export type ScoreTier =
  | 'insuficiente'
  | 'baixo'
  | 'regular'
  | 'bom'
  | 'muito_bom'
  | 'excelente'

export interface ScoreExplanation {
  summary:        string
  mainStrength:   string | null
  mainWeakness:   string | null
  nextSteps:      string[]
}

// ─── Constantes do modelo ─────────────────────────────────────────

const MIN_MONTHS_ELIGIBLE = 3    // Mínimo de meses para score
const IDEAL_MONTHS        = 12   // Meses para score máximo

// Pesos dos drivers (soma = 100)
const DRIVER_WEIGHTS = {
  receitaEstabilidade:   25,   // Estabilidade da receita
  margemOperacional:     25,   // Margem média
  regularidadeContratos: 20,   // Frequência de contratos
  historicoPagamentos:   15,   // Avaliações no marketplace
  custoKmTendencia:      10,   // Custo/km caindo = bom sinal
  sazonalidade:           5,   // Estabilidade sazonal
} as const

// Faixas de score → tier
const TIER_THRESHOLDS: Array<{ min: number; tier: ScoreTier }> = [
  { min: 850, tier: 'excelente' },
  { min: 750, tier: 'muito_bom' },
  { min: 650, tier: 'bom' },
  { min: 500, tier: 'regular' },
  { min: 300, tier: 'baixo' },
  { min: 0,   tier: 'insuficiente' },
]

// ─── Score Engine ─────────────────────────────────────────────────

/**
 * Calcula o score proprietário de crédito.
 *
 * Regras críticas do master.md:
 * - Score alimentado pelos dados de transação do cartão + DRE real
 * - Nunca calculado sobre dados declaratórios
 * - Mínimo de 90 dias (3 meses) de histórico para elegibilidade
 * - Limite de crédito baseado no resultado real do negócio
 * - Transparência: caminhoneiro sempre vê como o score é calculado
 */
export function calculateCreditScore(input: ScoreInput): ScoreResult {
  const { snapshots, contractsHistory } = input
  const months = snapshots.length

  // Sem dados suficientes — score não calculável
  if (months < MIN_MONTHS_ELIGIBLE) {
    return buildIneligibleScore(months)
  }

  // ─── Cálculos intermediários ────────────────────────────────────

  const receitas    = snapshots.map((s) => s.receitaTotal).filter((r) => r > 0)
  const margens     = snapshots.map((s) => s.margemOp).filter((m) => m !== null)
  const custoKms    = snapshots.map((s) => s.custoKm).filter((c) => c > 0)
  const mesesPos    = snapshots.filter((s) => s.resultadoOp > 0).length

  const receitaMedia = receitas.length > 0 ? mean(receitas) : 0
  const margemMedia  = margens.length  > 0 ? mean(margens)  : 0
  const custoKmMedio = custoKms.length > 0 ? mean(custoKms) : 0

  // ─── Calcular cada driver ───────────────────────────────────────

  const drivers: ScoreDrivers = {
    receitaEstabilidade:   calcReceitaEstabilidade(receitas),
    margemOperacional:     calcMargemDriver(margens, mesesPos, months),
    regularidadeContratos: calcRegularidadeContratos(contractsHistory, months),
    historicoPagamentos:   calcHistoricoPagamentos(contractsHistory),
    custoKmTendencia:      calcCustoKmTendencia(custoKms),
    sazonalidade:          calcSazonalidade(snapshots),
  }

  // ─── Score ponderado (300–1000) ─────────────────────────────────
  // Base: 300 (mínimo) + até 700 pontos pelos drivers

  const weightedSum = (
    drivers.receitaEstabilidade   * DRIVER_WEIGHTS.receitaEstabilidade   +
    drivers.margemOperacional     * DRIVER_WEIGHTS.margemOperacional     +
    drivers.regularidadeContratos * DRIVER_WEIGHTS.regularidadeContratos +
    drivers.historicoPagamentos   * DRIVER_WEIGHTS.historicoPagamentos   +
    drivers.custoKmTendencia      * DRIVER_WEIGHTS.custoKmTendencia      +
    drivers.sazonalidade          * DRIVER_WEIGHTS.sazonalidade
  ) / 100  // Normaliza para 0–100

  // Bônus por meses de dados (até +50 pontos)
  const dataBonus = Math.min(50, Math.round((months / IDEAL_MONTHS) * 50))

  const rawScore   = 300 + Math.round(weightedSum * 6.5) + dataBonus
  const score      = Math.min(1000, Math.max(300, rawScore))
  const tier       = getTier(score)
  const isEligible = months >= MIN_MONTHS_ELIGIBLE && score >= 300

  // ─── Limite de crédito ──────────────────────────────────────────
  const limiteSugerido = calcLimiteSugerido(receitaMedia, margemMedia, score)

  return {
    score,
    tier,
    isEligible,
    drivers,
    monthsOfData:       months,
    limiteSugerido,
    receitaMediaMensal: receitaMedia,
    margemMediaPercent: margemMedia,
    custoKmMedio,
    mesesPositivos:     mesesPos,
    explanation:        buildExplanation(score, tier, drivers, months),
  }
}

// ─── Drivers individuais ──────────────────────────────────────────

/** Estabilidade da receita — desvio padrão baixo = alta pontuação */
function calcReceitaEstabilidade(receitas: number[]): number {
  if (receitas.length < 2) return 50

  const avg = mean(receitas)
  if (avg === 0) return 0

  const cv = stddev(receitas) / avg  // Coeficiente de variação

  // CV baixo (<15%) = excelente; CV alto (>60%) = ruim
  if (cv <= 0.15) return 100
  if (cv <= 0.25) return 85
  if (cv <= 0.35) return 70
  if (cv <= 0.50) return 50
  if (cv <= 0.75) return 30
  return 10
}

/** Margem operacional média + consistência de meses positivos */
function calcMargemDriver(margens: number[], mesesPos: number, totalMeses: number): number {
  if (margens.length === 0) return 0

  const margemMedia    = mean(margens)
  const positivePct    = mesesPos / totalMeses

  // Pontuação por margem média
  let margemScore: number
  if (margemMedia >= 0.30)      margemScore = 100
  else if (margemMedia >= 0.20) margemScore = 85
  else if (margemMedia >= 0.12) margemScore = 70
  else if (margemMedia >= 0.06) margemScore = 50
  else if (margemMedia >= 0)    margemScore = 30
  else                           margemScore = 0   // Margem negativa

  // Penalidade por meses negativos
  const consistencyFactor = positivePct  // 0–1
  return Math.round(margemScore * (0.6 + 0.4 * consistencyFactor))
}

/** Regularidade de contratos ativos */
function calcRegularidadeContratos(
  ch:           { totalContracts: number; closedContracts: number },
  totalMeses:   number
): number {
  if (ch.totalContracts === 0) return 20   // Sem histórico no marketplace

  const closingRate      = ch.closedContracts / ch.totalContracts
  const contractsPerMes  = ch.totalContracts / totalMeses

  // Taxa de fechamento (alta = bom)
  let closingScore: number
  if (closingRate >= 0.80)      closingScore = 100
  else if (closingRate >= 0.60) closingScore = 80
  else if (closingRate >= 0.40) closingScore = 60
  else if (closingRate >= 0.20) closingScore = 40
  else                           closingScore = 20

  // Frequência de contratos (≥1/mês = ideal)
  const frequencyBonus = Math.min(20, Math.round(contractsPerMes * 20))

  return Math.min(100, closingScore + frequencyBonus)
}

/** Histórico de avaliações no marketplace */
function calcHistoricoPagamentos(ch: {
  avgEvaluationScore: number
  totalEvaluations:   number
}): number {
  if (ch.totalEvaluations === 0) return 50  // Neutro para novatos

  const avgScore      = ch.avgEvaluationScore  // 0–5
  const volumeBonus   = Math.min(20, ch.totalEvaluations * 2)  // Até +20 por volume

  const baseScore = Math.round((avgScore / 5) * 80)  // 0–80
  return Math.min(100, baseScore + volumeBonus)
}

/** Tendência do custo/km — caindo = bom sinal de gestão */
function calcCustoKmTendencia(custoKms: number[]): number {
  if (custoKms.length < 2) return 50  // Sem tendência calculável

  // Regressão linear simples
  const n    = custoKms.length
  const half = Math.floor(n / 2)
  const primeiraMetade = mean(custoKms.slice(0, half))
  const segundaMetade  = mean(custoKms.slice(half))

  if (primeiraMetade === 0) return 50

  const variacao = (segundaMetade - primeiraMetade) / primeiraMetade

  // Custo caindo = bom; custo subindo = penalidade
  if (variacao <= -0.10)    return 100  // Caiu > 10%
  if (variacao <= -0.05)    return 85   // Caiu 5–10%
  if (variacao <= 0)         return 70   // Estável ou leve queda
  if (variacao <= 0.05)     return 50   // Alta leve
  if (variacao <= 0.10)     return 35   // Alta moderada
  return 15                              // Alta forte
}

/** Sazonalidade — queda brusca em certos meses indica risco */
function calcSazonalidade(snapshots: MonthlySnapshot[]): number {
  if (snapshots.length < 6) return 60  // Sem dados sazonais suficientes

  const receitas = snapshots.map((s) => s.receitaTotal)
  const avg      = mean(receitas)
  if (avg === 0) return 0

  const minReceita = Math.min(...receitas)
  const quedaMax   = (avg - minReceita) / avg  // Queda máxima em relação à média

  // Queda menor = mais estável = maior pontuação
  if (quedaMax <= 0.20) return 100
  if (quedaMax <= 0.35) return 80
  if (quedaMax <= 0.50) return 60
  if (quedaMax <= 0.70) return 40
  return 20
}

// ─── Limite de crédito ────────────────────────────────────────────

/**
 * Calcula o limite de crédito sugerido baseado no DRE real.
 *
 * Regra do master.md:
 * - Limite calculado sobre resultado real do negócio
 * - NUNCA sobre intenção declarada ou score de bureau
 */
export function calcLimiteSugerido(
  receitaMedia: number,
  margemMedia:  number,
  score:        number
): number {
  if (receitaMedia <= 0 || margemMedia <= 0) return 0

  // Lucro médio mensal
  const lucroMedioMensal = receitaMedia * margemMedia

  // Múltiplo baseado no score (3x–6x o lucro mensal)
  let multiplo: number
  if (score >= 850)      multiplo = 6.0
  else if (score >= 750) multiplo = 5.0
  else if (score >= 650) multiplo = 4.0
  else if (score >= 500) multiplo = 3.0
  else                   multiplo = 2.0

  const limite = lucroMedioMensal * multiplo

  // Limites mínimo e máximo por phase
  const limiteMinimo = 1_000
  const limiteMaximo = 150_000   // Phase 3 — aumenta na Phase 4

  return Math.round(Math.max(limiteMinimo, Math.min(limiteMaximo, limite)) / 100) * 100
}

// ─── Helpers ──────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0
  const avg = mean(arr)
  const variance = arr.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / arr.length
  return Math.sqrt(variance)
}

function getTier(score: number): ScoreTier {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (score >= min) return tier
  }
  return 'insuficiente'
}

function buildIneligibleScore(months: number): ScoreResult {
  return {
    score:          0,
    tier:           'insuficiente',
    isEligible:     false,
    monthsOfData:   months,
    limiteSugerido: 0,
    drivers: {
      receitaEstabilidade:   0,
      margemOperacional:     0,
      regularidadeContratos: 0,
      historicoPagamentos:   0,
      custoKmTendencia:      0,
      sazonalidade:          0,
    },
    receitaMediaMensal: 0,
    margemMediaPercent: 0,
    custoKmMedio:       0,
    mesesPositivos:     0,
    explanation: {
      summary:      `Você tem ${months} ${months === 1 ? 'mês' : 'meses'} de histórico. São necessários pelo menos 3 meses para calcular seu score.`,
      mainStrength: null,
      mainWeakness: `Histórico insuficiente — faltam ${3 - months} ${3 - months === 1 ? 'mês' : 'meses'}.`,
      nextSteps: [
        'Continue registrando receitas e despesas mensalmente no DRE.',
        'Use o cartão Agregado.Pro para capturar despesas automaticamente.',
        `Seu score será calculado em ${3 - months} ${3 - months === 1 ? 'mês' : 'meses'}.`,
      ],
    },
  }
}

function buildExplanation(
  score:   number,
  tier:    ScoreTier,
  drivers: ScoreDrivers,
  months:  number
): ScoreExplanation {
  const tierLabels: Record<ScoreTier, string> = {
    insuficiente: 'Insuficiente',
    baixo:        'Baixo',
    regular:      'Regular',
    bom:          'Bom',
    muito_bom:    'Muito bom',
    excelente:    'Excelente',
  }

  // Melhor e pior driver
  const driverEntries = Object.entries(drivers) as [keyof ScoreDrivers, number][]
  const sorted        = [...driverEntries].sort(([, a], [, b]) => b - a)
  const bestDriver    = sorted[0]
  const worstDriver   = sorted[sorted.length - 1]

  const driverLabels: Record<keyof ScoreDrivers, string> = {
    receitaEstabilidade:   'estabilidade da receita',
    margemOperacional:     'margem operacional',
    regularidadeContratos: 'regularidade dos contratos',
    historicoPagamentos:   'histórico de avaliações',
    custoKmTendencia:      'tendência do custo por km',
    sazonalidade:          'estabilidade sazonal',
  }

  const nextSteps: string[] = []

  if (worstDriver && worstDriver[1] < 50) {
    const label = driverLabels[worstDriver[0]]
    switch (worstDriver[0]) {
      case 'receitaEstabilidade':
        nextSteps.push('Tente manter uma receita mais regular entre os meses.')
        break
      case 'margemOperacional':
        nextSteps.push('Revise seus custos fixos — uma margem maior melhora seu score.')
        break
      case 'regularidadeContratos':
        nextSteps.push('Contratos recorrentes no marketplace aumentam seu score.')
        break
      case 'historicoPagamentos':
        nextSteps.push('Suas avaliações no marketplace influenciam o score — mantenha boas práticas.')
        break
      case 'custoKmTendencia':
        nextSteps.push('Seu custo/km está subindo. Revise os gastos variáveis.')
        break
    }
  }

  if (months < IDEAL_MONTHS) {
    nextSteps.push(`Mais ${IDEAL_MONTHS - months} meses de histórico aumentarão sua pontuação em até 50 pontos.`)
  }

  if (score < 650) {
    nextSteps.push('Mantenha resultados positivos por 6+ meses consecutivos para avançar de faixa.')
  }

  return {
    summary:      `Score ${score} — ${tierLabels[tier]}. Baseado em ${months} ${months === 1 ? 'mês' : 'meses'} de dados reais do seu negócio.`,
    mainStrength: bestDriver && bestDriver[1] >= 70
      ? `Sua ${driverLabels[bestDriver[0]]} está ótima (${bestDriver[1]}/100).`
      : null,
    mainWeakness: worstDriver && worstDriver[1] < 50
      ? `Ponto de atenção: ${driverLabels[worstDriver[0]]} (${worstDriver[1]}/100).`
      : null,
    nextSteps,
  }
}

// ─── Exportações auxiliares ───────────────────────────────────────

export { DRIVER_WEIGHTS, MIN_MONTHS_ELIGIBLE, IDEAL_MONTHS }
export type { ScoreExplanation }
