'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  fullWidth?: boolean
}

// ─── Estilos base (tokens AllYouCan) ─────────────────────────────

const base =
  'inline-flex items-center justify-center gap-2 font-body font-medium ' +
  'transition-all duration-150 ease-out select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ag-accent focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ag-cta text-ag-cta-text rounded-pill ' +
    'hover:opacity-90 active:scale-[0.98]',
  secondary:
    'bg-ag-surface text-ag-primary border border-ag-border rounded-pill ' +
    'hover:bg-ag-bg hover:border-ag-accent active:scale-[0.98]',
  ghost:
    'bg-transparent text-ag-secondary rounded-md ' +
    'hover:bg-ag-surface hover:text-ag-primary active:scale-[0.98]',
  danger:
    'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)] rounded-pill ' +
    'hover:opacity-90 active:scale-[0.98]',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-sm  py-xs  text-body-sm h-8',
  md: 'px-lg  py-sm  text-body    h-11',
  lg: 'px-xl  py-md  text-body-lg h-14',
}

// ─── Componente ───────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant  = 'primary',
      size     = 'md',
      loading  = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          base,
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size={size} />
            <span>Aguarde...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ─── Spinner inline ───────────────────────────────────────────────

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <svg
      className={`${dim} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
