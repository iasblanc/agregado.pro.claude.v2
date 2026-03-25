import { describe, it, expect } from '@jest/globals'
import {
  formatBRL,
  formatKm,
  formatCostPerKm,
  formatPercent,
  formatDate,
  formatPeriod,
  getCurrentPeriod,
  getLastPeriods,
  calcMargin,
  calcCostPerKm,
  roundCents,
  isValidCPF,
  isValidCNPJ,
  formatCPF,
  formatPlate,
  parseBRL,
} from '@/lib/utils'

// ─── Formatadores BRL ─────────────────────────────────────────────

describe('formatBRL', () => {
  it('formata valor positivo', () => {
    expect(formatBRL(1234.5)).toBe('R$\u00a01.234,50')
  })
  it('formata zero', () => {
    expect(formatBRL(0)).toBe('R$\u00a00,00')
  })
  it('formata valor negativo', () => {
    expect(formatBRL(-500)).toContain('500')
  })
})

describe('parseBRL', () => {
  it('converte string BRL para número', () => {
    expect(parseBRL('R$ 1.234,50')).toBe(1234.5)
  })
  it('retorna 0 para string inválida', () => {
    expect(parseBRL('inválido')).toBe(0)
  })
})

// ─── Formatadores KM ──────────────────────────────────────────────

describe('formatKm', () => {
  it('formata quilometragem', () => {
    const result = formatKm(1234.5)
    expect(result).toContain('km')
    expect(result).toContain('1.234')
  })
})

describe('formatCostPerKm', () => {
  it('formata custo por km', () => {
    const result = formatCostPerKm(2.35)
    expect(result).toContain('/km')
    expect(result).toContain('2,35')
  })
})

// ─── Percentual ───────────────────────────────────────────────────

describe('formatPercent', () => {
  it('formata 0.1234 como 12.3%', () => {
    const result = formatPercent(0.1234)
    expect(result).toContain('12')
  })
  it('respeita número de casas decimais', () => {
    const result = formatPercent(0.5, 0)
    expect(result).toContain('50')
  })
})

// ─── Datas ────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formata data no padrão brasileiro', () => {
    const result = formatDate('2026-03-15')
    expect(result).toBe('15/03/2026')
  })
})

describe('formatPeriod', () => {
  it('formata período como nome do mês', () => {
    const result = formatPeriod('2026-03')
    expect(result.toLowerCase()).toContain('março')
  })
})

describe('getCurrentPeriod', () => {
  it('retorna período no formato YYYY-MM', () => {
    const result = getCurrentPeriod()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })
})

describe('getLastPeriods', () => {
  it('retorna N períodos decrescentes', () => {
    const result = getLastPeriods(3)
    expect(result).toHaveLength(3)
    expect(result[0]! >= result[1]!).toBe(true) // mais recente primeiro
    expect(result[1]! >= result[2]!).toBe(true)
  })

  it('cada período tem formato YYYY-MM', () => {
    const result = getLastPeriods(2)
    result.forEach((p) => expect(p).toMatch(/^\d{4}-\d{2}$/))
  })
})

// ─── Cálculos financeiros ─────────────────────────────────────────

describe('calcMargin', () => {
  it('calcula margem corretamente', () => {
    expect(calcMargin(8000, 4000)).toBeCloseTo(0.5)
  })
  it('retorna 0 quando receita é zero', () => {
    expect(calcMargin(0, 1000)).toBe(0)
  })
  it('retorna negativo quando custo > receita', () => {
    expect(calcMargin(1000, 1500)).toBeLessThan(0)
  })
})

describe('calcCostPerKm', () => {
  it('calcula custo por km', () => {
    expect(calcCostPerKm(2000, 400)).toBe(5)
  })
  it('retorna 0 quando km é zero', () => {
    expect(calcCostPerKm(2000, 0)).toBe(0)
  })
})

describe('roundCents', () => {
  it('arredonda para 2 casas', () => {
    expect(roundCents(10.005)).toBe(10.01)
    expect(roundCents(10.004)).toBe(10.00)
  })
})

// ─── Validadores ──────────────────────────────────────────────────

describe('isValidCPF', () => {
  it('valida CPF correto', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
    expect(isValidCPF('52998224725')).toBe(true)
  })
  it('rejeita CPF com dígitos repetidos', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false)
  })
  it('rejeita CPF com dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false)
  })
  it('rejeita CPF com tamanho incorreto', () => {
    expect(isValidCPF('123')).toBe(false)
  })
})

describe('isValidCNPJ', () => {
  it('valida CNPJ correto', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
  })
  it('rejeita CNPJ inválido', () => {
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false)
  })
})

describe('formatCPF', () => {
  it('formata CPF sem máscara', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25')
  })
  it('mantém CPF já formatado', () => {
    expect(formatCPF('529.982.247-25')).toBe('529.982.247-25')
  })
})

describe('formatPlate', () => {
  it('formata placa antiga com traço', () => {
    expect(formatPlate('ABC1234')).toBe('ABC-1234')
  })
  it('mantém placa Mercosul sem alteração', () => {
    expect(formatPlate('ABC1D23')).toBe('ABC1D23')
  })
  it('converte para maiúsculo', () => {
    expect(formatPlate('abc1234')).toBe('ABC-1234')
  })
})
