import type { Metadata }      from 'next'
import { redirect }            from 'next/navigation'
import { Suspense }            from 'react'
import { createClient }        from '@/lib/supabase/server'
import { Header }              from '@/components/layout/Header'
import { LoyaltyCard }         from '@/components/loyalty/LoyaltyCard'
import { BenefitsGrid }        from '@/components/loyalty/BenefitsGrid'
import { Badge }               from '@/components/ui/badge'
import { getMyLoyaltyAccount } from '@/services/loyalty'
import { calculateTier, TIER_CONFIG, type LoyaltyTier, type LoyaltyMetrics } from '@/services/loyalty/engine'
import { formatDate }          from '@/lib/utils'

export const metadata: Metadata = { title: 'Clube de Benefícios' }
export const revalidate = 300

export default async function BeneficiosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/gestao')

  const loyaltyData = await getMyLoyaltyAccount()

  if (!loyaltyData) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Clube de Benefícios" />
        <main className="flex-1 px-lg py-xl text-center space-y-md max-w-sm mx-auto pt-[var(--space-4xl)]">
          <p className="text-[48px]" aria-hidden="true">🏆</p>
          <h2 className="font-display text-display-sm font-medium text-ag-primary">
            Bem-vindo ao Clube
          </h2>
          <p className="text-body text-ag-secondary">
            Sua conta de fidelidade será criada automaticamente quando você começar a usar a plataforma.
          </p>
        </main>
      </div>
    )
  }

  const { account, recentEvents, activeRedemptions } = loyaltyData

  // Calcular tier atual com métricas
  const metrics: LoyaltyMetrics = {
    monthsActive:    account.months_active,
    monthsPositive:  account.months_positive,
    contractsClosed: account.contracts_closed,
    kmAccumulated:   Number(account.km_total_accumulated),
    avgScoreLast6m:  account.avg_score_last_6m,
    totalCardSpend:  Number(account.total_card_spend),
  }

  const tierResult = calculateTier(metrics)
  const tier       = account.tier as LoyaltyTier

  // Pontos por categoria de evento
  const pointsByCategory = recentEvents.reduce((acc: Record<string, number>, e: any) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + e.points_earned
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Clube de Benefícios"
        subtitle={`${account.points_available.toLocaleString('pt-BR')} pontos disponíveis`}
      />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-2xl mx-auto space-y-xl">

          {/* Card de fidelidade */}
          <LoyaltyCard
            tier={tier}
            points={account.points_available}
            tierResult={tierResult}
            ownerName={profile.full_name}
            monthsActive={account.months_active}
          />

          {/* Resgates ativos */}
          {activeRedemptions.length > 0 && (
            <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
              <div className="px-lg py-md border-b border-ag-border flex items-center justify-between">
                <h2 className="font-display text-display-sm font-medium text-ag-primary">
                  Benefícios ativos
                </h2>
                <Badge variant="success" dot>{activeRedemptions.length}</Badge>
              </div>
              <div className="divide-y divide-ag-border">
                {(activeRedemptions as any[]).map((r) => (
                  <div key={r.id} className="px-lg py-md flex items-center justify-between gap-md">
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-ag-primary truncate">
                        {r.benefit_name}
                      </p>
                      <p className="caption text-ag-muted">
                        Código: <span className="font-mono font-medium text-ag-primary">{r.code}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="success">Ativo</Badge>
                      {r.expires_at && (
                        <p className="caption text-ag-muted mt-xs">
                          Até {formatDate(r.expires_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Catálogo de benefícios */}
          <section>
            <div className="mb-lg">
              <p className="overline">Catálogo</p>
              <h2 className="font-display text-display-sm font-medium text-ag-primary mt-xs">
                Benefícios disponíveis
              </h2>
            </div>
            <BenefitsGrid
              userTier={tier}
              pointsAvailable={account.points_available}
            />
          </section>

          {/* Como ganhar pontos */}
          <section className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-lg shadow-sm">
            <h3 className="font-display text-display-sm font-medium text-ag-primary">
              Como ganhar pontos
            </h3>
            <div className="grid grid-cols-2 gap-sm">
              {[
                { icon: '📊', label: 'Lançar no DRE',      pts: '5 pts'     },
                { icon: '💳', label: 'Usar o cartão',       pts: '2 pts/R$1' },
                { icon: '📋', label: 'Fechar contrato',      pts: '200 pts'   },
                { icon: '⭐', label: 'Avaliação 4+',         pts: '50 pts'    },
                { icon: '📈', label: 'Melhorar score',       pts: '150 pts'   },
                { icon: '🚛', label: 'Meta de km no mês',    pts: '100+ pts'  },
                { icon: '✅', label: 'Fatura em dia',         pts: '80 pts'    },
                { icon: '👥', label: 'Indicar amigo',         pts: '500 pts'   },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-sm px-md py-sm rounded-lg bg-ag-bg border border-ag-border"
                >
                  <span className="text-[18px] shrink-0" aria-hidden="true">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-body-sm text-ag-primary truncate">{item.label}</p>
                    <p className="caption font-medium" style={{ color: 'var(--color-success)' }}>
                      +{item.pts}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="caption text-ag-muted">
              Multiplicador ativo: <strong className="text-ag-primary">{TIER_CONFIG[tier].icon} {tierResult.pointsMultiplier}×</strong> (tier {TIER_CONFIG[tier].label})
            </p>
          </section>

          {/* Histórico de pontos */}
          {recentEvents.length > 0 && (
            <Suspense fallback={null}>
              <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-lg py-md border-b border-ag-border">
                  <h3 className="font-display text-display-sm font-medium text-ag-primary">
                    Histórico recente
                  </h3>
                </div>
                <div className="divide-y divide-ag-border">
                  {(recentEvents as any[]).slice(0, 8).map((e) => (
                    <div key={e.id} className="px-lg py-md flex items-center justify-between gap-md">
                      <div className="min-w-0">
                        <p className="text-body-sm text-ag-primary truncate">{e.description}</p>
                        <p className="caption text-ag-muted">{formatDate(e.created_at)}</p>
                      </div>
                      <span className="text-body-sm font-medium shrink-0" style={{ color: 'var(--color-success)' }}>
                        +{e.points_earned.toLocaleString('pt-BR')} pts
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </Suspense>
          )}
        </div>
      </main>
    </div>
  )
}
