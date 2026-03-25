import { type HTMLAttributes } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?:     boolean   // ponto colorido antes do texto
}

// ─── Estilos ──────────────────────────────────────────────────────

const variants: Record<BadgeVariant, string> = {
  default: 'bg-ag-surface text-ag-secondary border border-ag-border',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]',
  danger:  'bg-[var(--color-danger-bg)]  text-[var(--color-danger)]  border border-[var(--color-danger-border)]',
  info:    'bg-blue-50 text-blue-700 border border-blue-200',
  muted:   'bg-ag-bg text-ag-muted border border-ag-border',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-ag-muted',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger:  'bg-[var(--color-danger)]',
  info:    'bg-blue-500',
  muted:   'bg-ag-border',
}

// ─── Componente ───────────────────────────────────────────────────

export function Badge({
  variant  = 'default',
  dot      = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-xs',
        'px-sm py-[2px]',
        'text-caption font-medium font-body',
        'rounded-pill whitespace-nowrap',
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {dot && (
        <span
          className={`inline-block w-[6px] h-[6px] rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

// ─── Badge de Role ────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  caminhoneiro:   'Caminhoneiro',
  transportadora: 'Transportadora',
  admin:          'Admin',
  credit_analyst: 'Crédito',
  compliance:     'Compliance',
}

const roleVariants: Record<string, BadgeVariant> = {
  caminhoneiro:   'default',
  transportadora: 'info',
  admin:          'danger',
  credit_analyst: 'warning',
  compliance:     'muted',
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={roleVariants[role] ?? 'default'} dot>
      {roleLabels[role] ?? role}
    </Badge>
  )
}
