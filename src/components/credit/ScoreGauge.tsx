'use client'

import { useState }     from 'react'
import { formatBRL, formatPercent } from '@/lib/utils'
import type { ScoreResult, ScoreTier, ScoreDrivers } from '@/services/credit/score-engine'

// ─── Cores por tier ───────────────────────────────────────────────

const TIER_COLORS: Record<ScoreTier, { bg: string; border: string; text: string; fill: string }> = {
  insuficiente: { bg: 'var(--color-bg)',          border: 'var(--color-border)',          text: 'var(--color-text-muted)',    fill: '#888780' },
  baixo:        { bg: 'var(--color-danger-bg)',    border: 'var(--color-danger-border)',   text: 'var(--color-danger)',        fill: '#E24B4A' },
  regular:      { bg: 'var(--color-warning-bg)',   border: 'var(--color-warning-border)',  text: 'var(--color-warning)',       fill: '#BA7517' },
  bom:          { bg: '#FFFBEB',                   border: '#FDE68A',                      text: '#92400E',                    fill: '#F59E0B' },
  muito_bom:    { bg: 'var(--color-success-bg)',   border: 'var(--color-success-border)',  text: 'var(--color-success)',       fill: '#2A6B3A' },
  excelente:    { bg: 'var(--color-success-bg)',   border: 'var(--color-success-border)',  text: 'var(--color-success)',       fill: '#166534' },
}

const TIER_LABELS: Record<ScoreTier, string> = {
  insuficiente: 'Insuficiente',
  baixo:        'Baixo',
  regular:      'Regular',
  bom:          'Bom',
  muito_bom:    'Muito bom',
  excelente:    'Excelente',
}

const DRIVER_LABELS: Record<keyof ScoreDrivers, string> = {
  receitaEstabilidade:   'Estabilidade da receita',
  margemOperacional:     'Margem operacional',
  regularidadeContratos: 'Regularidade de contratos',
  historicoPagamentos:   'Histórico de avaliações',
  custoKmTendencia:      'Tendência do custo/km',
  sazonalidade:          'Estabilidade sazonal',
}

const DRIVER_WEIGHTS = { receitaEstabilidade: 25, margemOperacional: 25, regularidadeContratos: 20, historicoPagamentos: 15, custoKmTendencia: 10, sazonalidade: 5 }

// ─── Score Gauge ──────────────────────────────────────────────────

interface ScoreGaugeProps {
  result:     ScoreResult
  showDetail?: boolean
}

export function ScoreGauge({ result, showDetail = true }: ScoreGaugeProps) {
  const [activeDriver, setActiveDriver] = useState<keyof ScoreDrivers | null>(null)
  const colors = TIER_COLORS[result.tier]

  // Posição na barra 300–1000
  const pct = result.isEligible
    ? ((result.score - 300) / 700) * 100
    : 0

  return (
    <div className="space-y-xl">
      {/* Card principal do score */}
      <div
        className="rounded-xl p-xl space-y-lg"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
      >
        {/* Score em destaque */}
        <div className="flex items-end justify-between gap-lg">
          <div>
            <p className="overline" style={{ color: colors.text }}>
              Score Agregado.Pro
            </p>
            <div className="flex items-baseline gap-sm mt-xs">
              <span
                className="font-display font-medium leading-none"
                style={{ fontSize: '72px', color: colors.text }}
              >
                {result.isEligible ? result.score : '—'}
              </span>
              {result.isEligible && (
                <span className="text-body" style={{ color: colors.text, opacity: 0.6 }}>
                  / 1000
                </span>
              )}
            </div>
            <div className="mt-sm">
              <span
                className="inline-flex items-center gap-xs px-md py-xs rounded-pill text-body-sm font-medium"
                style={{ background: `${colors.fill}22`, color: colors.text }}
              >
                {TIER_LABELS[result.tier]}
              </span>
            </div>
          </div>

          {/* Limite sugerido */}
          {result.isEligible && result.limiteSugerido > 0 && (
            <div className="text-right">
              <p className="caption" style={{ color: colors.text, opacity: 0.7 }}>
                Limite sugerido
              </p>
              <p
                className="font-display text-[32px] font-medium leading-tight"
                style={{ color: colors.text }}
              >
                {formatBRL(result.limiteSugerido)}
              </p>
              <p className="caption" style={{ color: colors.text, opacity: 0.6 }}>
                Baseado no DRE real
              </p>
            </div>
          )}
        </div>

        {/* Barra de score */}
        <div>
          <div className="relative h-3 rounded-full overflow-hidden"
               style={{ background: `${colors.fill}22` }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: colors.fill }}
              role="progressbar"
              aria-valuenow={result.score}
              aria-valuemin={300}
              aria-valuemax={1000}
              aria-label={`Score ${result.score} de 1000`}
            />
          </div>
          {/* Faixas */}
          <div className="flex justify-between mt-xs">
            {['300', '500', '650', '750', '850', '1000'].map((v) => (
              <span key={v} className="caption" style={{ color: colors.text, opacity: 0.5 }}>
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Explicação */}
        <p className="text-body-sm" style={{ color: colors.text, opacity: 0.85 }}>
          {result.explanation.summary}
        </p>
      </div>

      {/* Detalhamento por driver */}
      {showDetail && result.isEligible && (
        <div className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-lg py-md border-b border-ag-border">
            <p className="overline">Como seu score é calculado</p>
            <h3 className="font-display text-display-sm font-medium text-ag-primary mt-xs">
              Fatores do score
            </h3>
          </div>
          <div className="divide-y divide-ag-border">
            {(Object.entries(result.drivers) as [keyof ScoreDrivers, number][]).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveDriver(activeDriver === key ? null : key)}
                className="w-full px-lg py-md flex items-center gap-md hover:bg-ag-overlay transition-colors text-left"
              >
                {/* Score do driver */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-body-sm font-medium"
                  style={{
                    background: value >= 70 ? 'var(--color-success-bg)' :
                                value >= 40 ? 'var(--color-warning-bg)' :
                                'var(--color-danger-bg)',
                    color:      value >= 70 ? 'var(--color-success)' :
                                value >= 40 ? 'var(--color-warning)' :
                                'var(--color-danger)',
                  }}
                >
                  {value}
                </div>

                {/* Nome + barra */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-xs">
                    <span className="text-body-sm font-medium text-ag-primary truncate">
                      {DRIVER_LABELS[key]}
                    </span>
                    <span className="caption text-ag-muted ml-sm shrink-0">
                      Peso {DRIVER_WEIGHTS[key]}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-ag-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:      `${value}%`,
                        background: value >= 70 ? 'var(--color-success)' :
                                    value >= 40 ? 'var(--color-warning)' :
                                    'var(--color-danger)',
                      }}
                    />
                  </div>
                </div>
                <span className="text-ag-muted text-caption" aria-hidden="true">
                  {activeDriver === key ? '▲' : '▾'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Próximos passos */}
      {result.explanation.nextSteps.length > 0 && (
        <div className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-md shadow-sm">
          <h3 className="font-display text-display-sm font-medium text-ag-primary">
            Como melhorar seu score
          </h3>
          <ul className="space-y-sm">
            {result.explanation.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-sm text-body-sm text-ag-secondary">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-caption font-medium mt-0.5"
                  style={{ background: 'var(--color-overlay)', color: 'var(--color-text-muted)' }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contexto financeiro */}
      {result.isEligible && (
        <div className="grid grid-cols-3 gap-sm">
          <ContextCard label="Receita média" value={formatBRL(result.receitaMediaMensal)} sub="por mês" />
          <ContextCard label="Margem média" value={formatPercent(result.margemMediaPercent)} sub="operacional" />
          <ContextCard label="Meses positivos" value={`${result.mesesPositivos}/${result.monthsOfData}`} sub="com lucro" />
        </div>
      )}
    </div>
  )
}

function ContextCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-ag-surface border border-ag-border rounded-xl p-md text-center shadow-sm">
      <p className="caption">{label}</p>
      <p className="font-display text-[20px] font-medium text-ag-primary mt-xs">{value}</p>
      <p className="caption text-ag-muted">{sub}</p>
    </div>
  )
}
