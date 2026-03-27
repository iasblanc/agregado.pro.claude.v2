import type { Metadata } from 'next'
import { redirect }       from 'next/navigation'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/server'
import { Header }         from '@/components/layout/Header'
import { Badge }          from '@/components/ui/badge'
import { TIER_CONFIG, type LoyaltyTier } from '@/services/loyalty/engine'

export const metadata: Metadata = { title: 'Parceiros' }
export const dynamic = 'force-dynamic'  // 1 hora

export default async function ParceirosPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/gestao')

  // Buscar tier do usuário
  const { data: loyaltyAccount } = await supabase
    .from('loyalty_accounts')
    .select('tier')
    .eq('owner_id', profile.id)
    .maybeSingle()

  const userTier = (loyaltyAccount?.tier as LoyaltyTier) ?? 'bronze'

  // Buscar parceiros ativos
  const { data: partners } = await supabase
    .from('partner_integrations')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })

  const TIER_ORDER: LoyaltyTier[] = ['bronze', 'prata', 'ouro', 'platina']
  const userTierIdx = TIER_ORDER.indexOf(userTier)

  const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    combustivel: { label: 'Combustível', icon: '⛽' },
    manutencao:  { label: 'Manutenção',  icon: '🔧' },
    seguro:      { label: 'Seguros',     icon: '🛡️' },
    pneus:       { label: 'Pneus',       icon: '🛞' },
    alimentacao: { label: 'Alimentação', icon: '🍽️' },
  }

  // Agrupar por categoria
  const grouped = (partners ?? []).reduce((acc: Record<string, any[]>, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category]!.push(p)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      <Header title="Parceiros" subtitle="Descontos e benefícios na estrada" />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl">
        {/* Tier atual */}
        <div
          className="flex items-center gap-md px-md py-sm rounded-lg text-body-sm"
          style={{
            background: TIER_CONFIG[userTier].bgColor,
            border:     `1px solid ${TIER_CONFIG[userTier].borderColor}`,
            color:       TIER_CONFIG[userTier].color,
          }}
        >
          <span className="text-[20px]" aria-hidden="true">{TIER_CONFIG[userTier].icon}</span>
          <span>
            Você é <strong>{TIER_CONFIG[userTier].label}</strong> — acessa todos os benefícios até este nível.
          </span>
          <Link href="/beneficios" className="ml-auto underline underline-offset-2 text-body-sm shrink-0">
            Ver pontos →
          </Link>
        </div>

        {/* Parceiros por categoria */}
        {Object.entries(grouped).map(([category, categoryPartners]) => {
          const catConfig = CATEGORY_LABELS[category]
          if (!catConfig) return null

          return (
            <section key={category}>
              <div className="flex items-center gap-sm mb-lg">
                <span className="text-[20px]" aria-hidden="true">{catConfig.icon}</span>
                <h2 className="font-display text-display-sm font-medium text-ag-primary">
                  {catConfig.label}
                </h2>
                <Badge variant="muted">{categoryPartners.length}</Badge>
              </div>

              <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
                {(categoryPartners as any[]).map((partner) => {
                  const minTierIdx = TIER_ORDER.indexOf(partner.min_tier_required as LoyaltyTier)
                  const isAvailable = userTierIdx >= minTierIdx
                  const tierCfg     = TIER_CONFIG[partner.min_tier_required as LoyaltyTier]

                  const discountDisplay =
                    partner.discount_type === 'percentual'
                      ? `${(partner.discount_value * 100).toFixed(0)}% off`
                      : partner.discount_type === 'cashback'
                      ? `${(partner.discount_value * 100).toFixed(0)}% cashback`
                      : `R$ ${Number(partner.discount_value).toFixed(0)} off`

                  return (
                    <div
                      key={partner.id}
                      className={[
                        'bg-ag-surface border rounded-xl p-lg space-y-md transition-all',
                        isAvailable
                          ? 'border-ag-border hover:shadow-md hover:border-ag-accent'
                          : 'border-ag-border opacity-55',
                      ].join(' ')}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-sm">
                        <div className="min-w-0">
                          <p className="text-body font-medium text-ag-primary truncate">
                            {partner.name}
                          </p>
                          <p
                            className="text-[18px] font-bold mt-xs"
                            style={{ color: isAvailable ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                          >
                            {discountDisplay}
                          </p>
                        </div>
                        {!isAvailable && (
                          <Badge variant="muted">
                            {tierCfg.icon} {tierCfg.label}+
                          </Badge>
                        )}
                      </div>

                      {/* Descrição */}
                      <p className="text-body-sm text-ag-secondary">{partner.description}</p>

                      {/* Cobertura */}
                      <div className="flex items-center gap-sm flex-wrap">
                        <Badge variant={isAvailable ? 'success' : 'muted'} dot>
                          {partner.is_nationwide ? 'Nacional' : partner.states_covered?.join(', ')}
                        </Badge>
                        <Badge variant="muted">
                          {partner.integration_type === 'desconto_codigo' ? '🎟️ Código' :
                           partner.integration_type === 'cashback'        ? '💸 Cashback' :
                           '🔗 API direta'}
                        </Badge>
                      </div>

                      {/* CTA */}
                      {isAvailable ? (
                        <Link href="/beneficios">
                          <button
                            className="w-full text-center py-sm rounded-md text-body-sm font-medium transition-colors"
                            style={{ background: 'var(--color-overlay)', color: 'var(--color-text-secondary)' }}
                          >
                            Resgatar via pontos →
                          </button>
                        </Link>
                      ) : (
                        <p className="text-center caption text-ag-muted">
                          Upgrade para {tierCfg.label} para acessar
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* CTA para parceiros */}
        <section
          className="rounded-xl p-lg space-y-sm text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-body-sm font-medium text-ag-primary">
            🤝 Quer ser um parceiro Agregado.Pro?
          </p>
          <p className="text-body-sm text-ag-secondary">
            Alcance caminhoneiros agregados em todo o Brasil com descontos exclusivos na plataforma.
          </p>
          <a
            href="mailto:parceiros@agregado.pro"
            className="inline-flex text-body-sm font-medium underline underline-offset-2 text-ag-secondary hover:text-ag-primary transition-colors"
          >
            parceiros@agregado.pro
          </a>
        </section>
      </main>
    </div>
  )
}
