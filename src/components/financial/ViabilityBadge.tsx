import { CONTRACT_VIABILITY_LABELS, type ContractViability } from '@/lib/constants'

// ─── Viability Badge ──────────────────────────────────────────────
// Componente central do produto — indica saúde do contrato vs custo real

interface ViabilityBadgeProps {
  viability: ContractViability
  size?:     'sm' | 'md'
  showIcon?: boolean
}

const styles: Record<ContractViability, string> = {
  saudavel:
    'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]',
  no_limite:
    'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]',
  abaixo_custo:
    'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)]',
}

const icons: Record<ContractViability, string> = {
  saudavel:     '✅',
  no_limite:    '⚠️',
  abaixo_custo: '❌',
}

export function ViabilityBadge({
  viability,
  size     = 'md',
  showIcon = true,
}: ViabilityBadgeProps) {
  const label = CONTRACT_VIABILITY_LABELS[viability]

  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-body font-medium rounded-pill',
        styles[viability],
        size === 'sm' ? 'px-sm py-xs text-caption' : 'px-md py-xs text-body-sm',
      ].join(' ')}
      role="status"
      aria-label={label}
    >
      {showIcon && <span aria-hidden="true">{icons[viability]}</span>}
      <span>
        {/* Remove emoji do label para exibição limpa */}
        {label.replace(/^[✅⚠️❌]\s/, '')}
      </span>
    </span>
  )
}
