'use client'

import { useMargemAlert }    from '@/hooks/useMargemAlert'
import { formatPercent }     from '@/lib/utils'

interface MargemAlertBannerProps {
  threshold?: number
  period?:    string
  compact?:   boolean
}

/**
 * Banner de alerta de margem em tempo real.
 *
 * Regra do master.md:
 * "Sistema deve notificar em tempo real quando despesas da viagem ativa
 *  comprimem a margem do contrato abaixo de threshold configurável."
 *
 * Renderiza nada quando a margem está saudável.
 * Animação de pulso quando margem está em zona crítica.
 */
export function MargemAlertBanner({
  threshold = 0.05,
  period,
  compact   = false,
}: MargemAlertBannerProps) {
  const { isAbaixoThreshold, isCritica, alertMessage, margem } = useMargemAlert({
    threshold,
    period,
  })

  if (!isAbaixoThreshold || !alertMessage) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex items-start gap-sm rounded-lg text-body-sm',
        compact ? 'px-md py-sm' : 'px-lg py-md',
        isCritica
          ? 'animate-pulse'
          : '',
      ].join(' ')}
      style={{
        background: isCritica
          ? 'var(--color-danger-bg)'
          : 'var(--color-warning-bg)',
        border: `1px solid ${isCritica
          ? 'var(--color-danger-border)'
          : 'var(--color-warning-border)'}`,
        color: isCritica
          ? 'var(--color-danger)'
          : 'var(--color-warning)',
      }}
    >
      <span className="shrink-0 text-base" aria-hidden="true">
        {isCritica ? '🚨' : '⚠️'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {isCritica ? 'Resultado negativo' : 'Margem abaixo do mínimo'}
        </p>
        {!compact && (
          <p className="mt-xs opacity-90">{alertMessage}</p>
        )}
      </div>
      {margem !== null && (
        <span
          className="shrink-0 font-display text-[18px] font-medium"
          aria-label={`Margem atual: ${formatPercent(margem)}`}
        >
          {formatPercent(margem)}
        </span>
      )}
    </div>
  )
}
