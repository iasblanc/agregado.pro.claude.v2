'use client'

import { useState }     from 'react'
import { formatBRL, formatPercent } from '@/lib/utils'
import type { LimitCalculationResult } from '@/services/credit/limit-calculator'

// ─── Props ────────────────────────────────────────────────────────

interface LimitWidgetProps {
  limitResult:     LimitCalculationResult
  limiteUtilizado?: number
  canRequest?:     boolean
  onRequest?:      () => void
  isLoading?:      boolean
}

// ─── Componente ───────────────────────────────────────────────────

/**
 * Widget de limite de crédito com total transparência.
 *
 * Regra do master.md:
 * "O caminhoneiro deve sempre ver como seu limite de crédito é calculado
 *  — baseado em qual período do DRE, qual contrato, qual métrica."
 */
export function LimitWidget({
  limitResult,
  limiteUtilizado = 0,
  canRequest      = false,
  onRequest,
  isLoading       = false,
}: LimitWidgetProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const utilizadoPct = limitResult.limiteTotal > 0
    ? (limiteUtilizado / limitResult.limiteTotal) * 100
    : 0

  const disponivel  = Math.max(0, limitResult.limiteTotal - limiteUtilizado)
  const isBloqueado = !limitResult.canIssueCard

  // Cor da barra de utilização
  const barColor = utilizadoPct >= 90
    ? 'var(--color-danger)'
    : utilizadoPct >= 70
    ? 'var(--color-warning)'
    : 'var(--color-success)'

  return (
    <div className="space-y-lg">
      {/* Card principal */}
      {isBloqueado ? (
        <BlockedCard reasons={limitResult.blockReasons} />
      ) : (
        <div className="bg-ag-accent text-ag-cta-text rounded-xl p-xl space-y-lg">
          {/* Limite total */}
          <div className="flex items-end justify-between gap-md">
            <div>
              <p className="text-[11px] font-medium tracking-widest uppercase opacity-60">
                Limite total
              </p>
              <p className="font-display text-[52px] font-medium leading-none mt-xs">
                {formatBRL(limitResult.limiteTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium tracking-widest uppercase opacity-60">
                Disponível
              </p>
              <p className="font-display text-[28px] font-medium leading-none mt-xs">
                {formatBRL(disponivel)}
              </p>
            </div>
          </div>

          {/* Barra de utilização */}
          <div className="space-y-xs">
            <div className="w-full h-2 rounded-full" style={{ background: 'rgba(245,242,236,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${utilizadoPct}%`, background: barColor }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] opacity-60">
                {formatBRL(limiteUtilizado)} utilizado ({utilizadoPct.toFixed(0)}%)
              </span>
              <span className="text-[11px] opacity-60">
                {formatPercent(limitResult.scoreFactor / 10)} fator score
              </span>
            </div>
          </div>

          {/* Botão de como é calculado */}
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="w-full text-left text-[11px] font-medium tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity flex items-center gap-sm"
          >
            Como foi calculado
            <span style={{ transform: showBreakdown ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>
              ▾
            </span>
          </button>
        </div>
      )}

      {/* Breakdown de cálculo (transparência) */}
      {showBreakdown && !isBloqueado && (
        <div className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-lg py-md border-b border-ag-border">
            <p className="overline">Cálculo do limite</p>
            <h3 className="font-display text-display-sm font-medium text-ag-primary mt-xs">
              Passo a passo
            </h3>
          </div>
          <div className="divide-y divide-ag-border">
            {limitResult.breakdown.steps.map((step, i) => (
              <div key={i} className="px-lg py-md flex items-center justify-between gap-md">
                <p className="text-body-sm text-ag-secondary flex-1">{step.label}</p>
                <span
                  className="text-body-sm font-medium shrink-0"
                  style={{
                    color: step.isPositive === true
                      ? 'var(--color-success)'
                      : step.isPositive === false
                      ? 'var(--color-danger)'
                      : 'var(--color-text-primary)',
                  }}
                >
                  {step.value}
                </span>
              </div>
            ))}
          </div>
          <div className="px-lg py-md bg-ag-bg border-t border-ag-border">
            <p className="text-body-sm text-ag-secondary">{limitResult.breakdown.summary}</p>
          </div>
        </div>
      )}

      {/* CTA para solicitar cartão */}
      {canRequest && !isBloqueado && onRequest && (
        <button
          onClick={onRequest}
          disabled={isLoading}
          className="w-full py-lg rounded-xl font-medium text-body font-body transition-all disabled:opacity-50"
          style={{ background: 'var(--color-cta)', color: 'var(--color-cta-text)' }}
        >
          {isLoading ? 'Processando...' : 'Solicitar cartão de crédito'}
        </button>
      )}
    </div>
  )
}

// ─── Card bloqueado ───────────────────────────────────────────────

function BlockedCard({ reasons }: { reasons: string[] }) {
  return (
    <div
      className="rounded-xl p-lg space-y-md"
      style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}
    >
      <div className="flex items-center gap-sm">
        <span className="text-[24px]" aria-hidden="true">🔒</span>
        <div>
          <p className="text-body font-medium" style={{ color: 'var(--color-warning)' }}>
            Cartão não disponível ainda
          </p>
          <p className="caption" style={{ color: 'var(--color-warning)' }}>
            Complete os requisitos abaixo para solicitar
          </p>
        </div>
      </div>
      <ul className="space-y-sm">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-sm text-body-sm" style={{ color: 'var(--color-warning)' }}>
            <span aria-hidden="true" className="shrink-0 mt-px">•</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}
