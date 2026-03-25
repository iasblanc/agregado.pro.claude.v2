'use client'

import { useState }   from 'react'
import { formatBRL }  from '@/lib/utils'
import type { DreResult } from '@/services/dre/calculator'
import {
  getFixedCostLabel,
  getVariableCostLabel,
} from '@/services/dre/calculator'

// ─── Tipos ────────────────────────────────────────────────────────

interface DreCardProps {
  dre: DreResult
}

// ─── Linha de categoria ───────────────────────────────────────────

function CategoryRow({
  label,
  amount,
  total,
  isNegative = false,
}: {
  label:       string
  amount:      number
  total:       number
  isNegative?: boolean
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0

  return (
    <div className="flex items-center gap-md py-sm">
      {/* Barra de proporção */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-xs">
          <span className="text-body-sm text-ag-secondary truncate">{label}</span>
          <span
            className="text-body-sm font-medium ml-sm shrink-0"
            style={{ color: isNegative ? 'var(--color-danger)' : 'var(--color-text-primary)' }}
          >
            {formatBRL(amount)}
          </span>
        </div>
        <div className="w-full bg-ag-border rounded-full h-1 overflow-hidden">
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width:      `${Math.min(100, pct)}%`,
              background: isNegative ? 'var(--color-danger)' : 'var(--color-text-secondary)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Seção do DRE ─────────────────────────────────────────────────

function DreSection({
  title,
  total,
  items,
  colorVar,
  defaultOpen = false,
  isNegative  = false,
}: {
  title:        string
  total:        number
  items:        Record<string, number>
  colorVar:     string
  defaultOpen?: boolean
  isNegative?:  boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasItems = Object.keys(items).length > 0

  return (
    <div className="border-b border-ag-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-md hover:bg-ag-overlay transition-colors rounded-md px-sm -mx-sm"
        aria-expanded={open}
      >
        <span className="text-body font-medium text-ag-primary">{title}</span>
        <div className="flex items-center gap-md">
          <span className="font-display text-[22px] font-medium" style={{ color: colorVar }}>
            {formatBRL(total)}
          </span>
          <span
            className="text-ag-muted transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {open && hasItems && (
        <div className="pb-md px-sm space-y-xs">
          {Object.entries(items)
            .sort(([, a], [, b]) => b - a) // maior primeiro
            .map(([cat, amt]) => (
              <CategoryRow
                key={cat}
                label={
                  title.includes('Fixo')
                    ? getFixedCostLabel(cat)
                    : title.includes('Variável')
                    ? getVariableCostLabel(cat)
                    : cat
                }
                amount={amt}
                total={total}
                isNegative={isNegative}
              />
            ))}
        </div>
      )}

      {open && !hasItems && (
        <p className="pb-md px-sm caption text-ag-muted">
          Nenhum lançamento nesta categoria.
        </p>
      )}
    </div>
  )
}

// ─── DreCard principal ────────────────────────────────────────────

export function DreCard({ dre }: DreCardProps) {
  const resultPositivo = dre.resultadoOperacional >= 0

  return (
    <div className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
      {/* Cabeçalho — resultado em destaque */}
      <div
        className="px-lg py-xl"
        style={{
          background: resultPositivo ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          borderBottom: `1px solid ${resultPositivo ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
        }}
      >
        <p className="overline" style={{ color: resultPositivo ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {resultPositivo ? 'Resultado positivo' : 'Resultado negativo'}
        </p>
        <div className="flex items-baseline gap-sm mt-xs">
          <span
            className="font-display text-[40px] leading-none font-medium"
            style={{ color: resultPositivo ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {formatBRL(dre.resultadoOperacional)}
          </span>
        </div>
        <p className="caption mt-sm" style={{ color: resultPositivo ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {dre.totalLancamentos} lançamentos registrados
        </p>
      </div>

      {/* Demonstrativo */}
      <div className="px-lg py-md space-y-xs">
        <DreSection
          title="Receitas"
          total={dre.totalReceita}
          items={{ frete: dre.totalReceita }} // simplificado — sem breakdown de receita por ora
          colorVar="var(--color-success)"
          defaultOpen
        />

        <DreSection
          title="Custos Fixos"
          total={dre.totalCustoFixo}
          items={dre.custoFixoPorCategoria}
          colorVar="var(--color-danger)"
          isNegative
        />

        <DreSection
          title="Custos Variáveis"
          total={dre.totalCustoVariavel}
          items={dre.custoVariavelPorCategoria}
          colorVar="var(--color-danger)"
          isNegative
        />

        {/* Linha de total de custos */}
        <div className="flex justify-between items-center py-md border-t border-ag-border">
          <span className="text-body-sm font-medium text-ag-secondary">Total de custos</span>
          <span className="text-body font-medium" style={{ color: 'var(--color-danger)' }}>
            {formatBRL(dre.totalCusto)}
          </span>
        </div>

        {/* Linha de resultado */}
        <div
          className="flex justify-between items-center py-md px-md rounded-md"
          style={{ background: 'var(--color-overlay)' }}
        >
          <span className="text-body font-medium text-ag-primary">Resultado operacional</span>
          <span
            className="font-display text-[22px] font-medium"
            style={{ color: resultPositivo ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {formatBRL(dre.resultadoOperacional)}
          </span>
        </div>
      </div>
    </div>
  )
}
