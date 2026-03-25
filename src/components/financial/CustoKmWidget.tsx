import { formatCostPerKm, formatBRL, formatKm } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────

interface CustoKmWidgetProps {
  custoPerKm:        number
  kmTotal:           number
  totalCusto:        number
  custoAnterior?:    number  // custo/km do período anterior (comparativo)
}

// ─── Componente ───────────────────────────────────────────────────

export function CustoKmWidget({
  custoPerKm,
  kmTotal,
  totalCusto,
  custoAnterior,
}: CustoKmWidgetProps) {
  const hasData = custoPerKm > 0 && kmTotal > 0

  // Variação em relação ao período anterior
  const variacao = custoAnterior && custoAnterior > 0
    ? ((custoPerKm - custoAnterior) / custoAnterior) * 100
    : null

  const variacaoUp = variacao !== null && variacao > 0  // custo subiu = ruim
  const variacaoColor = variacao === null
    ? 'var(--color-text-muted)'
    : variacaoUp
    ? 'var(--color-danger)'
    : 'var(--color-success)'

  return (
    <div className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-md shadow-sm">
      {/* Label */}
      <p className="overline">Custo por km</p>

      {hasData ? (
        <>
          {/* Valor principal */}
          <div className="flex items-baseline gap-sm">
            <span className="font-display text-[48px] leading-none font-medium text-ag-primary">
              {formatBRL(custoPerKm)}
            </span>
            <span className="text-body text-ag-muted">/km</span>
          </div>

          {/* Variação vs período anterior */}
          {variacao !== null && (
            <div
              className="inline-flex items-center gap-xs text-body-sm font-medium px-sm py-xs rounded-pill"
              style={{
                color:      variacaoColor,
                background: variacaoUp ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
              }}
            >
              <span aria-hidden="true">{variacaoUp ? '↑' : '↓'}</span>
              {Math.abs(variacao).toFixed(1)}% vs mês anterior
            </div>
          )}

          {/* Detalhes */}
          <div className="grid grid-cols-2 gap-sm pt-sm border-t border-ag-border">
            <div>
              <p className="caption">KM rodados</p>
              <p className="text-body font-medium text-ag-primary">{formatKm(kmTotal)}</p>
            </div>
            <div>
              <p className="caption">Custo total</p>
              <p className="text-body font-medium text-ag-primary">{formatBRL(totalCusto)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="py-md text-center space-y-sm">
          <div className="text-[32px]" aria-hidden="true">📏</div>
          <p className="text-body text-ag-secondary">
            Registre uma receita com KM rodados para calcular seu custo por km.
          </p>
        </div>
      )}
    </div>
  )
}
