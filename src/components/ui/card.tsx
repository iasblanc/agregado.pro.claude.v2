import { type HTMLAttributes } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  as?:       'div' | 'article' | 'section'
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  label?: string    // overline acima do título
  action?: React.ReactNode
}

// ─── Card ─────────────────────────────────────────────────────────

export function Card({
  elevated  = false,
  as:       Tag = 'div',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={[
        'bg-ag-surface rounded-lg border border-ag-border',
        elevated ? 'shadow-md' : 'shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Tag>
  )
}

// ─── Card.Header ──────────────────────────────────────────────────

export function CardHeader({
  label,
  action,
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={[
        'flex items-start justify-between gap-md px-lg pt-lg pb-md',
        'border-b border-ag-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <div className="flex flex-col gap-xs min-w-0">
        {label && (
          <span className="overline">{label}</span>
        )}
        {children && (
          <div className="font-display text-display-sm font-medium text-ag-primary truncate">
            {children}
          </div>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">{action}</div>
      )}
    </div>
  )
}

// ─── Card.Body ────────────────────────────────────────────────────

export function CardBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['px-lg py-md', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

// ─── Card.Footer ──────────────────────────────────────────────────

export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'px-lg pb-lg pt-md border-t border-ag-border',
        'flex items-center justify-between gap-md',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
