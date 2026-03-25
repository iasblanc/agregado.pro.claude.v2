import type { HTMLAttributes } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────

type AlertVariant = 'success' | 'warning' | 'danger' | 'info'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant:  AlertVariant
  title?:   string
  onClose?: () => void
}

// ─── Config ───────────────────────────────────────────────────────

const config: Record<AlertVariant, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg:     'var(--color-success-bg)',
    border: 'var(--color-success-border)',
    color:  'var(--color-success)',
    icon:   '✓',
  },
  warning: {
    bg:     'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
    color:  'var(--color-warning)',
    icon:   '⚠',
  },
  danger: {
    bg:     'var(--color-danger-bg)',
    border: 'var(--color-danger-border)',
    color:  'var(--color-danger)',
    icon:   '⚠',
  },
  info: {
    bg:     '#EFF6FF',
    border: '#BFDBFE',
    color:  '#1D4ED8',
    icon:   'ℹ',
  },
}

// ─── Componente ───────────────────────────────────────────────────

export function Alert({
  variant,
  title,
  onClose,
  className = '',
  children,
  ...props
}: AlertProps) {
  const c = config[variant]

  return (
    <div
      role="alert"
      className={['flex gap-sm px-md py-sm rounded-md text-body-sm', className].join(' ')}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
      {...props}
    >
      <span className="shrink-0 font-bold" aria-hidden="true">{c.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium mb-xs">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          ×
        </button>
      )}
    </div>
  )
}
