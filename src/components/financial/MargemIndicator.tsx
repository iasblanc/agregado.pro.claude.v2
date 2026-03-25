import { formatPercent, formatBRL } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────

interface MargemIndicatorProps {
  margem:    number   // 0–1 (ex: 0.35 = 35%)
  resultado: number   // valor absoluto
  size?:     'sm' | 'md' | 'lg'
}

// ─── Cores por faixa de margem ────────────────────────────────────

function getMargemConfig(margem: number) {
  if (margem > 0.15)  return { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Saudável',    fill: '#2A6B3A' }
  if (margem > 0.05)  return { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', label: 'Atenção',     fill: '#9A6B00' }
  if (margem >= 0)    return { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', label: 'No limite',   fill: '#9A6B00' }
  return               { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'Prejuízo',    fill: '#9A2B2B' }
}

// ─── Componente ───────────────────────────────────────────────────

export function MargemIndicator({ margem, resultado, size = 'md' }: MargemIndicatorProps) {
  const cfg      = getMargemConfig(margem)
  const pct      = Math.max(0, Math.min(100, Math.abs(margem) * 100))
  const isNeg    = margem < 0

  // Dimensões por tamanho
  const barH = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2'
  const textSize = size === 'sm' ? 'text-caption' : 'text-body-sm'

  return (
    <div
      className="rounded-lg p-md space-y-sm"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`${textSize} font-medium`} style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span
          className={`font-display ${size === 'lg' ? 'text-[28px]' : 'text-[22px]'} font-medium`}
          style={{ color: cfg.color }}
        >
          {isNeg ? '-' : ''}{formatPercent(Math.abs(margem))}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className={`w-full bg-ag-border rounded-full ${barH} overflow-hidden`}>
        <div
          className={`${barH} rounded-full transition-all duration-700 ease-out`}
          style={{
            width:      `${pct}%`,
            background: cfg.fill,
            minWidth:   pct > 0 ? '4px' : '0',
          }}
          role="progressbar"
          aria-valuenow={Math.round(margem * 100)}
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-label={`Margem: ${formatPercent(margem)}`}
        />
      </div>

      {/* Valor absoluto */}
      <p className="caption" style={{ color: cfg.color }}>
        {isNeg ? 'Prejuízo de ' : 'Lucro de '}
        <span className="font-medium">{formatBRL(Math.abs(resultado))}</span>
        {' '}neste período
      </p>
    </div>
  )
}
