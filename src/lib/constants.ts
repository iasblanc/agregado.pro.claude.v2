/**
 * constants.ts — Constantes de domínio do Agregado.Pro
 *
 * Fonte: agregado-pro-master.md
 * Regra: Toda constante de negócio vive aqui — nunca inline no código
 */

// ─── Roles do sistema ─────────────────────────────────────────────
export const USER_ROLES = {
  CAMINHONEIRO:  'caminhoneiro',
  TRANSPORTADORA: 'transportadora',
  ADMIN:          'admin',
  CREDIT_ANALYST: 'credit_analyst',
  COMPLIANCE:     'compliance',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// ─── Tipos de veículo (Marketplace) ──────────────────────────────
export const VEHICLE_TYPES = [
  'Automóvel',
  'Van',
  '3/4',
  'Toco',
  'Truck',
  'Cavalo 4x2',
  'Cavalo 6x2',
  'Cavalo 6x4',
] as const

export type VehicleType = (typeof VEHICLE_TYPES)[number]

// ─── Tipos de equipamento (Marketplace) ──────────────────────────
export const EQUIPMENT_TYPES = [
  'Semi-reboque 12 mts',
  'Semi-reboque 15 mts',
  'Semi-reboque Frigorífico',
  'Prancha 12 mts',
  'Prancha 15 mts',
  'Prancha 17 mts',
  'Prancha 19 mts',
  'Bi-trem 24 mts',
  'Rodotrem 27 mts',
  'Automotiva 23 mts',
  'Cegonha 23 mts',
] as const

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

// ─── Categorias de custo fixo (DRE) ──────────────────────────────
export const FIXED_COST_CATEGORIES = {
  PARCELA_CAMINHAO: 'parcela_caminhao',
  SEGURO:           'seguro',
  LICENCIAMENTO:    'licenciamento',
  RASTREADOR:       'rastreador',
  OUTROS_FIXOS:     'outros_fixos',
} as const

export type FixedCostCategory = (typeof FIXED_COST_CATEGORIES)[keyof typeof FIXED_COST_CATEGORIES]

export const FIXED_COST_LABELS: Record<FixedCostCategory, string> = {
  parcela_caminhao: 'Parcela do Caminhão',
  seguro:           'Seguro',
  licenciamento:    'Licenciamento',
  rastreador:       'Rastreador',
  outros_fixos:     'Outros Custos Fixos',
}

// ─── Categorias de custo variável (DRE) ──────────────────────────
export const VARIABLE_COST_CATEGORIES = {
  DIESEL:           'diesel',
  MANUTENCAO:       'manutencao',
  PNEUS:            'pneus',
  PEDAGIO:          'pedagio',
  ALIMENTACAO:      'alimentacao_viagem',
  HOSPEDAGEM:       'hospedagem',
  OUTROS_VARIAVEIS: 'outros_variaveis',
} as const

export type VariableCostCategory = (typeof VARIABLE_COST_CATEGORIES)[keyof typeof VARIABLE_COST_CATEGORIES]

export const VARIABLE_COST_LABELS: Record<VariableCostCategory, string> = {
  diesel:             'Diesel / Combustível',
  manutencao:         'Manutenção e Peças',
  pneus:              'Pneus',
  pedagio:            'Pedágio',
  alimentacao_viagem: 'Alimentação em Viagem',
  hospedagem:         'Hospedagem / Pernoite',
  outros_variaveis:   'Outras Despesas Variáveis',
}

// ─── Tipo de lançamento (DRE) ─────────────────────────────────────
export const ENTRY_TYPES = {
  RECEITA:  'receita',
  CUSTO_FIXO:     'custo_fixo',
  CUSTO_VARIAVEL: 'custo_variavel',
} as const

export type EntryType = (typeof ENTRY_TYPES)[keyof typeof ENTRY_TYPES]

// ─── Viabilidade de contratos (Marketplace — Phase 2) ────────────
export const CONTRACT_VIABILITY = {
  SAUDAVEL:     'saudavel',
  NO_LIMITE:    'no_limite',
  ABAIXO_CUSTO: 'abaixo_custo',
} as const

export type ContractViability = (typeof CONTRACT_VIABILITY)[keyof typeof CONTRACT_VIABILITY]

export const CONTRACT_VIABILITY_LABELS: Record<ContractViability, string> = {
  saudavel:     '✅ Contrato saudável',
  no_limite:    '⚠️ Contrato no limite',
  abaixo_custo: '❌ Abaixo do custo',
}

// Thresholds de viabilidade
export const VIABILITY_THRESHOLDS = {
  SAUDAVEL_MIN_MARGIN: 0.10, // > 10% margem = saudável
  LIMITE_MIN_MARGIN:   0.00, // 0–10% = no limite
} as const

// ─── Fases do produto ─────────────────────────────────────────────
export const PRODUCT_PHASES = {
  PHASE_1: 'core_management',
  PHASE_2: 'marketplace_banking',
  PHASE_3: 'financial_data',
  PHASE_4: 'credit_engine',
  PHASE_5: 'ecosystem',
} as const

// ─── Rotas públicas (sem auth) ────────────────────────────────────
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/cadastro',
  '/recuperar-senha',
] as const

// ─── Rotas por role ───────────────────────────────────────────────
export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  caminhoneiro:  '/gestao',
  transportadora: '/contratos',
  admin:          '/admin',
  credit_analyst: '/admin/credito',
  compliance:     '/admin/auditoria',
}

// ─── Limites e configurações ──────────────────────────────────────
export const LIMITS = {
  // Score de crédito
  CREDIT_MIN_HISTORY_DAYS: 90,       // Mínimo 90 dias de histórico para crédito
  CREDIT_BAAS_USER_THRESHOLD: 50000, // Threshold para avaliação de Banco Próprio

  // DRE
  DRE_MAX_PERIODS_HISTORY: 24, // Histórico máximo em meses

  // Uploads
  MAX_IMAGE_SIZE_MB: 10,
  MAX_DOCUMENT_SIZE_MB: 25,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],

  // Paginação
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

// ─── Formatação ───────────────────────────────────────────────────
export const LOCALE = {
  CURRENCY: 'pt-BR',
  CURRENCY_CODE: 'BRL',
  DATE: 'pt-BR',
  TIMEZONE: 'America/Sao_Paulo',
} as const
