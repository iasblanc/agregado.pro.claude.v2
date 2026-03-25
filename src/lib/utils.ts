import { LOCALE } from './constants'

// ─── Moeda (BRL) ──────────────────────────────────────────────────

/**
 * Formata valor para BRL
 * @example formatBRL(1234.5) → "R$ 1.234,50"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat(LOCALE.CURRENCY, {
    style: 'currency',
    currency: LOCALE.CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata valor BRL compacto (para dashboards)
 * @example formatBRLCompact(1234567) → "R$ 1,2 mi"
 */
export function formatBRLCompact(value: number): string {
  return new Intl.NumberFormat(LOCALE.CURRENCY, {
    style: 'currency',
    currency: LOCALE.CURRENCY_CODE,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Converte string de moeda para número
 * @example parseBRL("R$ 1.234,50") → 1234.5
 */
export function parseBRL(value: string): number {
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return parseFloat(cleaned) || 0
}

// ─── Quilometragem ────────────────────────────────────────────────

/**
 * Formata quilometragem
 * @example formatKm(1234.5) → "1.234,5 km"
 */
export function formatKm(value: number): string {
  return `${new Intl.NumberFormat(LOCALE.CURRENCY, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)} km`
}

/**
 * Formata custo por km
 * @example formatCostPerKm(2.35) → "R$ 2,35/km"
 */
export function formatCostPerKm(value: number): string {
  return `${new Intl.NumberFormat(LOCALE.CURRENCY, {
    style: 'currency',
    currency: LOCALE.CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}/km`
}

// ─── Percentual ───────────────────────────────────────────────────

/**
 * Formata percentual
 * @example formatPercent(0.1234) → "12,3%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat(LOCALE.CURRENCY, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// ─── Datas ────────────────────────────────────────────────────────

/**
 * Formata data curta
 * @example formatDate("2026-03-15") → "15/03/2026"
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE.DATE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: LOCALE.TIMEZONE,
  }).format(new Date(date))
}

/**
 * Formata mês/ano para período DRE
 * @example formatPeriod("2026-03") → "Março 2026"
 */
export function formatPeriod(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return new Intl.DateTimeFormat(LOCALE.DATE, {
    month: 'long',
    year: 'numeric',
    timeZone: LOCALE.TIMEZONE,
  }).format(new Date(parseInt(year), parseInt(month) - 1))
}

/**
 * Retorna o período atual no formato YYYY-MM
 * @example getCurrentPeriod() → "2026-03"
 */
export function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Lista os últimos N períodos
 * @example getLastPeriods(3) → ["2026-03", "2026-02", "2026-01"]
 */
export function getLastPeriods(n: number): string[] {
  const periods: string[] = []
  const now = new Date()

  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    periods.push(`${year}-${month}`)
  }

  return periods
}

// ─── Strings ──────────────────────────────────────────────────────

/**
 * Trunca string com ellipsis
 * @example truncate("Descrição muito longa", 20) → "Descrição muito long..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

/**
 * Gera iniciais do nome
 * @example getInitials("João Silva") → "JS"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

// ─── Validações ───────────────────────────────────────────────────

/**
 * Valida CPF brasileiro
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/[^\d]/g, '')
  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cleaned[10])
}

/**
 * Valida CNPJ brasileiro
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, '')
  if (cleaned.length !== 14) return false
  if (/^(\d)\1+$/.test(cleaned)) return false

  const calcDigit = (cnpj: string, length: number): number => {
    let sum = 0
    let pos = length - 7
    for (let i = length; i >= 1; i--) {
      sum += parseInt(cnpj.charAt(length - i)) * pos--
      if (pos < 2) pos = 9
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return result
  }

  const digit1 = calcDigit(cleaned, 12)
  if (digit1 !== parseInt(cleaned[12])) return false

  const digit2 = calcDigit(cleaned, 13)
  return digit2 === parseInt(cleaned[13])
}

/**
 * Formata CPF
 * @example formatCPF("12345678901") → "123.456.789-01"
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/[^\d]/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata placa de veículo (Mercosul e antiga)
 * @example formatPlate("ABC1234") → "ABC-1234"
 * @example formatPlate("ABC1D23") → "ABC1D23" (Mercosul — sem separador)
 */
export function formatPlate(plate: string): string {
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length === 7) {
    // Verifica se é Mercosul (4ª posição = letra)
    if (isNaN(parseInt(cleaned[4]))) return cleaned
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  }
  return cleaned
}

// ─── Cálculos de negócio ──────────────────────────────────────────

/**
 * Calcula margem operacional
 * @returns Valor entre 0 e 1 (ex: 0.15 = 15%)
 */
export function calcMargin(revenue: number, totalCosts: number): number {
  if (revenue === 0) return 0
  return (revenue - totalCosts) / revenue
}

/**
 * Calcula custo por km
 */
export function calcCostPerKm(totalCosts: number, totalKm: number): number {
  if (totalKm === 0) return 0
  return totalCosts / totalKm
}

/**
 * Arredonda para 2 casas decimais (seguro para valores financeiros)
 */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
