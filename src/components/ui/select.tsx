'use client'

import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectGroup {
  label:   string
  options: SelectOption[]
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?:    string
  hint?:     string
  error?:    string
  options?:  SelectOption[]
  groups?:   SelectGroup[]
  placeholder?: string
  prefix?:   ReactNode
}

// ─── Componente ───────────────────────────────────────────────────

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options    = [],
      groups     = [],
      placeholder,
      prefix,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-xs w-full">
        {label && (
          <label htmlFor={inputId} className="text-body-sm font-medium text-ag-primary">
            {label}
            {props.required && (
              <span className="text-[var(--color-danger)] ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ag-muted">
              {prefix}
            </div>
          )}

          <select
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` :
              hint  ? `${inputId}-hint`  : undefined
            }
            className={[
              'w-full appearance-none font-body text-body rounded-md',
              'bg-ag-bg border transition-all duration-150 ease-out',
              prefix ? 'pl-9' : 'pl-[14px]',
              'pr-9 py-[10px]',
              error
                ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger-bg)]'
                : 'border-ag-border focus:border-ag-accent focus:ring-ag-overlay',
              'focus:outline-none focus:ring-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-ag-surface',
              // Cor do texto placeholder vs valor
              !props.value && placeholder ? 'text-ag-muted' : 'text-ag-primary',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {/* Opções simples */}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}

            {/* Grupos */}
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Chevron */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ag-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-caption text-[var(--color-danger)] flex items-center gap-xs">
            <span aria-hidden="true">⚠</span>{error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="caption">{hint}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
