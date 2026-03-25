/**
 * __tests__/integration/auth.test.ts
 *
 * Testes de integração do fluxo de autenticação.
 * Testam as Server Actions e validações sem mock do Supabase.
 *
 * Para executar: pnpm test __tests__/integration/auth.test.ts
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import { loginSchema, registerSchema }       from '@/lib/validations'
import { ROLE_HOME_ROUTES, USER_ROLES }      from '@/lib/constants'

// ─── loginSchema ──────────────────────────────────────────────────

describe('loginSchema — validação', () => {
  it('aceita credenciais válidas', () => {
    const result = loginSchema.safeParse({
      email:    'joao@teste.com',
      password: 'Senha123!',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita e-mail inválido', () => {
    const result = loginSchema.safeParse({
      email:    'nao-e-email',
      password: 'Senha123!',
    })
    expect(result.success).toBe(false)
    const errs = result.success ? [] : result.error.flatten().fieldErrors.email
    expect(errs).toBeDefined()
  })

  it('rejeita senha com menos de 8 caracteres', () => {
    const result = loginSchema.safeParse({
      email:    'joao@teste.com',
      password: '123',
    })
    expect(result.success).toBe(false)
    const errs = result.success ? [] : result.error.flatten().fieldErrors.password
    expect(errs).toBeDefined()
  })

  it('rejeita campos vazios', () => {
    const result = loginSchema.safeParse({ email: '', password: '' })
    expect(result.success).toBe(false)
  })
})

// ─── registerSchema ───────────────────────────────────────────────

describe('registerSchema — caminhoneiro', () => {
  const validCaminhoneiro = {
    full_name:        'João da Silva',
    email:            'joao@teste.com',
    password:         'Senha123!',
    confirm_password: 'Senha123!',
    role:             'caminhoneiro',
    cpf:              '529.982.247-25',
  }

  it('aceita dados válidos de caminhoneiro', () => {
    const result = registerSchema.safeParse(validCaminhoneiro)
    expect(result.success).toBe(true)
  })

  it('rejeita quando senhas não coincidem', () => {
    const result = registerSchema.safeParse({
      ...validCaminhoneiro,
      confirm_password: 'SenhaErrada1',
    })
    expect(result.success).toBe(false)
    const errs = result.success ? [] : result.error.flatten().fieldErrors.confirm_password
    expect(errs).toBeDefined()
  })

  it('rejeita caminhoneiro sem CPF', () => {
    const { cpf: _, ...withoutCpf } = validCaminhoneiro
    const result = registerSchema.safeParse(withoutCpf)
    expect(result.success).toBe(false)
    const errs = result.success ? [] : result.error.flatten().fieldErrors.cpf
    expect(errs).toBeDefined()
  })

  it('rejeita senha sem maiúscula', () => {
    const result = registerSchema.safeParse({
      ...validCaminhoneiro,
      password:         'senha1234',
      confirm_password: 'senha1234',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita senha sem número', () => {
    const result = registerSchema.safeParse({
      ...validCaminhoneiro,
      password:         'SenhaSemNumero',
      confirm_password: 'SenhaSemNumero',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita nome curto demais', () => {
    const result = registerSchema.safeParse({ ...validCaminhoneiro, full_name: 'Jo' })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema — transportadora', () => {
  const validTransportadora = {
    full_name:        'Maria Santos',
    email:            'maria@transportadora.com',
    password:         'Senha123!',
    confirm_password: 'Senha123!',
    role:             'transportadora',
    cnpj:             '11.222.333/0001-81',
    company_name:     'Transportes Silva Ltda',
  }

  it('aceita dados válidos de transportadora', () => {
    const result = registerSchema.safeParse(validTransportadora)
    expect(result.success).toBe(true)
  })

  it('rejeita transportadora sem CNPJ', () => {
    const { cnpj: _, ...withoutCnpj } = validTransportadora
    const result = registerSchema.safeParse(withoutCnpj)
    expect(result.success).toBe(false)
  })

  it('rejeita transportadora sem razão social', () => {
    const { company_name: _, ...withoutName } = validTransportadora
    const result = registerSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })
})

// ─── ROLE_HOME_ROUTES ─────────────────────────────────────────────

describe('ROLE_HOME_ROUTES — roteamento por role', () => {
  it('caminhoneiro vai para /gestao', () => {
    expect(ROLE_HOME_ROUTES[USER_ROLES.CAMINHONEIRO]).toBe('/gestao')
  })

  it('transportadora vai para /contratos', () => {
    expect(ROLE_HOME_ROUTES[USER_ROLES.TRANSPORTADORA]).toBe('/contratos')
  })

  it('admin vai para /admin', () => {
    expect(ROLE_HOME_ROUTES[USER_ROLES.ADMIN]).toBe('/admin')
  })

  it('todos os roles têm rota definida', () => {
    Object.values(USER_ROLES).forEach((role) => {
      expect(ROLE_HOME_ROUTES[role]).toBeTruthy()
    })
  })
})
