'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  hint?:     string
  error?:    string
  prefix?:   ReactNode  // ícone ou texto antes do input
  suffix?:   ReactNode  // ícone ou texto após o input
}

// ─── Componente ───────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, className = '', id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-xs w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-body-sm font-medium text-ag-primary"
          >
            {label}
            {props.required && (
              <span className="text-[var(--color-danger)] ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        {/* Wrapper do input */}
        <div className="relative flex items-center">
          {/* Prefix */}
          {prefix && (
            <div className="absolute left-3 flex items-center pointer-events-none text-ag-muted">
              {prefix}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={
              error   ? `${inputId}-error` :
              hint    ? `${inputId}-hint`  : undefined
            }
            className={[
              // Base
              'w-full font-body text-body text-ag-primary',
              'bg-ag-bg border rounded-md',
              'transition-all duration-150 ease-out',
              // Padding dinâmico com prefix/suffix
              prefix ? 'pl-9'  : 'pl-[14px]',
              suffix ? 'pr-9'  : 'pr-[14px]',
              'py-[10px]',
              // Estados
              error
                ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger-bg)]'
                : 'border-ag-border focus:border-ag-accent focus:ring-ag-overlay',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-ag-surface',
              // Placeholder
              'placeholder:text-ag-muted',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />

          {/* Suffix */}
          {suffix && (
            <div className="absolute right-3 flex items-center text-ag-muted">
              {suffix}
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-caption text-[var(--color-danger)] flex items-center gap-xs"
          >
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        )}

        {/* Hint */}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="caption">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
