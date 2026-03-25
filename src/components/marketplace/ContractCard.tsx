import Link                from 'next/link'
import { ViabilityBadge } from '@/components/financial/ViabilityBadge'
import { Badge }          from '@/components/ui/badge'
import { formatBRL, formatKm, formatDate } from '@/lib/utils'
import type { ContractPublicData }     from '@/services/contracts/viability'
import type { ContractViabilityAnalysis } from '@/services/contracts/viability'

// ─── Tipos ────────────────────────────────────────────────────────

interface ContractCardProps {
  contract:  ContractPublicData
  analysis?: ContractViabilityAnalysis  // undefined se usuário sem dados de custo
  linkBase?: string  // '/contratos' por padrão
}

// ─── Componente ───────────────────────────────────────────────────

export function ContractCard({
  contract: c,
  analysis,
  linkBase = '/contratos',
}: ContractCardProps) {
  return (
    <Link
      href={`${linkBase}/${c.id}`}
      className="block group"
      aria-label={`Contrato: ${c.title} — ${c.route_origin} até ${c.route_destination}`}
    >
      <article className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-md shadow-sm group-hover:shadow-md group-hover:border-ag-accent transition-all duration-200">

        {/* Header: título + valor */}
        <div className="flex items-start justify-between gap-md">
          <div className="min-w-0">
            <h3 className="text-body font-medium text-ag-primary truncate group-hover:text-ag-accent transition-colors">
              {c.title}
            </h3>
            <p className="caption mt-xs">
              {c.route_origin} → {c.route_destination}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-[22px] font-medium text-ag-primary leading-none">
              {formatBRL(Number(c.contract_value))}
            </p>
            <p className="caption">{formatKm(Number(c.route_km))}</p>
          </div>
        </div>

        {/* Badges de info */}
        <div className="flex flex-wrap gap-xs">
          <Badge variant="default">{c.vehicle_type}</Badge>
          {c.equipment_type && (
            <Badge variant="muted">{c.equipment_type}</Badge>
          )}
          {c.duration_months && (
            <Badge variant="muted" dot>
              {c.duration_months} {c.duration_months === 1 ? 'mês' : 'meses'}
            </Badge>
          )}
        </div>

        {/* Análise de viabilidade — coração do produto */}
        {analysis ? (
          <div className="pt-sm border-t border-ag-border">
            <div className="flex items-center justify-between gap-md">
              <ViabilityBadge viability={analysis.viability} />
              <div className="text-right">
                {analysis.viability === 'saudavel' && (
                  <p className="text-body-sm font-medium" style={{ color: 'var(--color-success)' }}>
                    +{analysis.displayData.lucroEstimado} estimado
                  </p>
                )}
                {analysis.viability === 'abaixo_custo' && (
                  <p className="text-body-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                    -{analysis.displayData.lucroEstimado} de prejuízo
                  </p>
                )}
                {analysis.viability === 'no_limite' && (
                  <p className="text-body-sm text-ag-muted">
                    Margem mínima
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-sm border-t border-ag-border">
            <p className="caption text-ag-muted">
              Registre seus custos no DRE para ver a viabilidade deste contrato.
            </p>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between text-caption text-ag-muted">
          <span>{c.candidates_count} candidato{c.candidates_count !== 1 ? 's' : ''}</span>
          {c.published_at && (
            <span>Publicado em {formatDate(c.published_at)}</span>
          )}
        </div>
      </article>
    </Link>
  )
}
