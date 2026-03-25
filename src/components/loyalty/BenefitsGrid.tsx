'use client'

import { useState, useTransition } from 'react'
import { BENEFITS_CATALOG, TIER_CONFIG, type LoyaltyTier, type Benefit } from '@/services/loyalty/engine'
import { Alert }  from '@/components/ui/alert'
import { Badge }  from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Tipos ────────────────────────────────────────────────────────

interface BenefitsGridProps {
  userTier:        LoyaltyTier
  pointsAvailable: number
  onRedeem?:       (benefitId: string) => Promise<{ success: boolean; code?: string; error?: string }>
}

// ─── Grid de benefícios ───────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  combustivel: { label: 'Combustível',  icon: '⛽' },
  manutencao:  { label: 'Manutenção',   icon: '🔧' },
  seguro:      { label: 'Seguros',      icon: '🛡️' },
  pneus:       { label: 'Pneus',        icon: '🛞' },
  credito:     { label: 'Crédito',      icon: '💰' },
  marketplace: { label: 'Marketplace',  icon: '📋' },
  premium:     { label: 'Premium',      icon: '💎' },
}

const TIER_ORDER: LoyaltyTier[] = ['bronze', 'prata', 'ouro', 'platina']

export function BenefitsGrid({ userTier, pointsAvailable, onRedeem }: BenefitsGridProps) {
  const [isPending,  startT]      = useTransition()
  const [redeeming,  setRedeeming] = useState<string | null>(null)
  const [redeemResult, setResult]  = useState<{ benefitId: string; code: string } | null>(null)
  const [error,      setError]     = useState<string | null>(null)
  const [filter,     setFilter]    = useState<string>('todos')

  const categories = ['todos', ...Object.keys(CATEGORY_LABELS)]
  const userTierIdx = TIER_ORDER.indexOf(userTier)

  const filtered = filter === 'todos'
    ? BENEFITS_CATALOG
    : BENEFITS_CATALOG.filter((b) => b.category === filter)

  async function handleRedeem(benefit: Benefit) {
    if (!onRedeem) return
    setRedeeming(benefit.id)
    setError(null)
    setResult(null)

    startT(async () => {
      const result = await onRedeem(benefit.id)
      if (result.success && result.code) {
        setResult({ benefitId: benefit.id, code: result.code })
      } else {
        setError(result.error ?? 'Erro ao resgatar benefício')
      }
      setRedeeming(null)
    })
  }

  return (
    <div className="space-y-lg">
      {/* Filtro de categorias */}
      <div className="flex gap-sm overflow-x-auto pb-xs">
        {categories.map((cat) => {
          const catConfig = cat === 'todos' ? null : CATEGORY_LABELS[cat]
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={[
                'flex items-center gap-xs px-md py-xs rounded-pill text-body-sm font-medium whitespace-nowrap transition-all',
                filter === cat
                  ? 'bg-ag-cta text-ag-cta-text'
                  : 'bg-ag-surface border border-ag-border text-ag-secondary hover:border-ag-accent',
              ].join(' ')}
            >
              {catConfig && <span aria-hidden="true">{catConfig.icon}</span>}
              {cat === 'todos' ? 'Todos' : catConfig?.label ?? cat}
            </button>
          )
        })}
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}

      {redeemResult && (
        <Alert variant="success" title="Benefício resgatado!">
          <p>Seu código: <strong className="font-mono">{redeemResult.code}</strong></p>
          <p className="caption mt-xs">Válido por 30 dias. Apresente ao parceiro.</p>
        </Alert>
      )}

      {/* Grid de benefícios */}
      <div className="grid gap-md sm:grid-cols-2">
        {filtered.map((benefit) => {
          const minTierIdx  = TIER_ORDER.indexOf(benefit.minTier)
          const isAvailable = userTierIdx >= minTierIdx
          const canAfford   = pointsAvailable >= benefit.pointsCost
          const canRedeem   = isAvailable && canAfford
          const tierCfg     = TIER_CONFIG[benefit.minTier]
          const isRedeeming = redeeming === benefit.id
          const wasRedeemed = redeemResult?.benefitId === benefit.id

          return (
            <div
              key={benefit.id}
              className={[
                'bg-ag-surface border rounded-xl p-lg space-y-md transition-all',
                isAvailable ? 'border-ag-border hover:shadow-md' : 'border-ag-border opacity-60',
                wasRedeemed ? 'border-[var(--color-success-border)]' : '',
              ].join(' ')}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-md">
                <div className="flex items-center gap-sm">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-[20px] shrink-0"
                    style={{ background: `${tierCfg.color}18` }}
                    aria-hidden="true"
                  >
                    {benefit.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-ag-primary">{benefit.name}</p>
                    <p
                      className="text-[12px] font-bold"
                      style={{ color: tierCfg.color }}
                    >
                      {benefit.valueDisplay}
                    </p>
                  </div>
                </div>

                {/* Tier mínimo */}
                {minTierIdx > 0 && (
                  <Badge variant={isAvailable ? 'success' : 'muted'}>
                    {tierCfg.icon} {tierCfg.label}+
                  </Badge>
                )}
              </div>

              {/* Descrição */}
              <p className="text-body-sm text-ag-secondary">{benefit.description}</p>

              {/* Custo e ação */}
              <div className="flex items-center justify-between gap-sm pt-sm border-t border-ag-border">
                <div>
                  <p className="text-body-sm font-medium text-ag-primary">
                    {benefit.pointsCost.toLocaleString('pt-BR')} pts
                  </p>
                  {!canAfford && isAvailable && (
                    <p className="caption" style={{ color: 'var(--color-danger)' }}>
                      Faltam {(benefit.pointsCost - pointsAvailable).toLocaleString('pt-BR')} pts
                    </p>
                  )}
                  {!isAvailable && (
                    <p className="caption text-ag-muted">
                      Requer tier {tierCfg.label}
                    </p>
                  )}
                </div>

                {wasRedeemed ? (
                  <Badge variant="success">✓ Resgatado</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant={canRedeem ? 'primary' : 'secondary'}
                    disabled={!canRedeem || isRedeeming || isPending}
                    loading={isRedeeming}
                    onClick={() => handleRedeem(benefit)}
                  >
                    {canRedeem ? 'Resgatar' : isAvailable ? 'Sem pontos' : 'Bloqueado'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
