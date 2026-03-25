import { z } from 'zod'
import {
  VEHICLE_TYPES,
  EQUIPMENT_TYPES,
  FIXED_COST_CATEGORIES,
  VARIABLE_COST_CATEGORIES,
} from './constants'

// ─── Auth ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail obrigatório')
    .email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(120, 'Nome muito longo'),
    email: z
      .string()
      .min(1, 'E-mail obrigatório')
      .email('E-mail inválido'),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Deve conter ao menos um número'),
    confirm_password: z.string(),
    role: z.enum(['caminhoneiro', 'transportadora']),
    phone: z
      .string()
      .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido')
      .optional()
      .or(z.literal('')),
    // Caminhoneiro
    cpf: z
      .string()
      .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
      .optional(),
    // Transportadora
    cnpj: z
      .string()
      .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido')
      .optional(),
    company_name: z.string().min(2).max(200).optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Senhas não coincidem',
    path: ['confirm_password'],
  })
  .refine(
    (data) => {
      if (data.role === 'caminhoneiro') return !!data.cpf
      return true
    },
    { message: 'CPF obrigatório para caminhoneiros', path: ['cpf'] }
  )
  .refine(
    (data) => {
      if (data.role === 'transportadora') return !!data.cnpj && !!data.company_name
      return true
    },
    { message: 'CNPJ e razão social obrigatórios para transportadoras', path: ['cnpj'] }
  )

// ─── Veículos ─────────────────────────────────────────────────────

export const vehicleSchema = z.object({
  type: z.enum(VEHICLE_TYPES as unknown as [string, ...string[]]),
  brand: z.string().min(2, 'Marca obrigatória').max(50),
  model: z.string().min(1, 'Modelo obrigatório').max(80),
  year: z
    .number()
    .int()
    .min(1980, 'Ano mínimo: 1980')
    .max(new Date().getFullYear() + 1, 'Ano inválido'),
  plate: z
    .string()
    .regex(
      /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}-[0-9]{4}$/,
      'Placa inválida (ex: ABC1D23 ou ABC-1234)'
    ),
  equipment_type: z
    .enum(EQUIPMENT_TYPES as unknown as [string, ...string[]])
    .optional()
    .nullable(),
})

export type VehicleInput = z.infer<typeof vehicleSchema>

// ─── Lançamentos DRE ──────────────────────────────────────────────

const allCostCategories = [
  ...Object.values(FIXED_COST_CATEGORIES),
  ...Object.values(VARIABLE_COST_CATEGORIES),
] as const

export const dreEntrySchema = z
  .object({
    vehicle_id: z.string().uuid().optional().nullable(),
    period: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Período inválido — use formato YYYY-MM'),
    entry_type: z.enum(['receita', 'custo_fixo', 'custo_variavel']),
    category: z.string().min(1, 'Categoria obrigatória'),
    description: z
      .string()
      .min(2, 'Descrição obrigatória')
      .max(200, 'Descrição muito longa'),
    amount: z
      .number()
      .positive('Valor deve ser positivo')
      .max(9_999_999, 'Valor muito alto'),
    km_reference: z
      .number()
      .positive('KM deve ser positivo')
      .max(99_999, 'KM muito alto')
      .optional()
      .nullable(),
    notes: z.string().max(500, 'Observação muito longa').optional().nullable(),
  })
  .refine(
    (data) => {
      // Receitas devem ter km_reference para cálculo de custo/km
      if (data.entry_type === 'receita' && !data.km_reference) return true
      // Custos fixos não precisam de km
      return true
    },
    { message: 'KM de referência obrigatório para receitas', path: ['km_reference'] }
  )

export type DreEntryInput = z.infer<typeof dreEntrySchema>

// ─── Filtros DRE ──────────────────────────────────────────────────

export const drePeriodFilterSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Período inválido'),
  vehicle_id: z.string().uuid().optional(),
})

// ─── Profile update ───────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  full_name: z.string().min(3).max(120).optional(),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .optional()
    .or(z.literal('')),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// ─── Tipos de output ──────────────────────────────────────────────
export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
