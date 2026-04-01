export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { formatBRL }     from '@/lib/utils'

export const metadata: Metadata = { title: 'Benefícios' }

const CAT_ICONS: Record<string, string> = {
  combustivel: '⛽', manutencao: '🔧', seguro: '🛡️', pneus: '🔵',
  alimentacao: '🍽️', hospedagem: '🏨', financeiro: '💳',
}
const CAT_LABELS: Record<string, string> = {
  combustivel: 'Combustível', manutencao: 'Manutenção', seguro: 'Seguros',
  pneus: 'Pneus', alimentacao: 'Alimentação', hospedagem: 'Hospedagem', financeiro: 'Financeiro',
}

const TIER_ORDER: Record<string, number> = { bronze: 0, prata: 1, ouro: 2, platina: 3 }
const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bronze:  { label: '🥉 Bronze',  color: '#92400E', bg: '#FEF3C7' },
  prata:   { label: '🥈 Prata',   color: '#4B5563', bg: '#F3F4F6' },
  ouro:    { label: '🥇 Ouro',    color: '#B45309', bg: '#FFFBEB' },
  platina: { label: '💎 Platina', color: '#2563EB', bg: '#DBEAFE' },
}

export default async function BeneficiosPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  // Dados reais: conta de fidelidade + parceiros
  const [{ data: loyalty }, { data: parceiros }] = await Promise.all([
    admin.from('loyalty_accounts').select('tier, points_available, months_active, months_positive, contracts_closed').eq('owner_id', profile.id).maybeSingle(),
    admin.from('partner_integrations').select('id, slug, name, category, description, discount_type, discount_value, min_tier_required').eq('is_active', true).order('priority', { ascending: false }),
  ])

  const currentTier   = loyalty?.tier ?? 'bronze'
  const points        = loyalty?.points_available ?? 0
  const monthsActive  = loyalty?.months_active ?? 0
  const tierCfg       = TIER_CONFIG[currentTier] ?? TIER_CONFIG.bronze
  const tierIdx       = TIER_ORDER[currentTier] ?? 0

  const available = (parceiros ?? []).filter(p => (TIER_ORDER[p.min_tier_required] ?? 0) <= tierIdx)
  const locked    = (parceiros ?? []).filter(p => (TIER_ORDER[p.min_tier_required] ?? 0) > tierIdx)

  // Agrupar disponíveis por categoria
  const byCategory: Record<string, typeof available> = {}
  for (const p of available) {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category].push(p)
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Benefícios" subtitle="Clube de vantagens exclusivas" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Cartão de nível */}
        <Card elevated>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="caption text-ag-muted mb-xs">Seu nível</p>
                <span className="px-md py-xs rounded-pill text-body-sm font-medium inline-block mb-sm"
                  style={{ background: tierCfg.bg, color: tierCfg.color }}>
                  {tierCfg.label}
                </span>
                <p className="text-body-sm text-ag-secondary">
                  {points} pontos · {monthsActive} {monthsActive === 1 ? 'mês' : 'meses'} ativo
                </p>
              </div>
              <div className="text-[48px]">🦏</div>
            </div>

            {/* Progresso para próximo tier */}
            {currentTier !== 'platina' && (() => {
              const nextTierName = Object.keys(TIER_ORDER).find(k => TIER_ORDER[k] === tierIdx + 1) ?? ''
              const nextTierCfg  = TIER_CONFIG[nextTierName]
              const needed = 6  // meses para subir
              const pct = Math.min((monthsActive / needed) * 100, 100)
              return (
                <div className="mt-md">
                  <div className="flex justify-between mb-xs">
                    <span className="caption text-ag-muted">{tierCfg.label}</span>
                    <span className="caption text-ag-muted">{nextTierCfg?.label}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tierCfg.color }} />
                  </div>
                  <p className="caption text-ag-muted mt-xs">
                    {Math.max(0, needed - monthsActive)} meses restantes para {nextTierCfg?.label}
                  </p>
                </div>
              )
            })()}
          </CardBody>
        </Card>

        {/* Como ganhar pontos */}
        <Card>
          <CardHeader label="Como ganhar pontos" />
          <CardBody>
            <div className="grid grid-cols-2 gap-sm">
              {[
                { icon: '📋', label: 'Lançamento no DRE', pts: 10 },
                { icon: '📝', label: 'Contrato fechado',   pts: 100 },
                { icon: '⭐', label: 'Avaliação 5 estrelas', pts: 50 },
                { icon: '📅', label: 'Mês positivo',       pts: 200 },
              ].map(({ icon, label, pts }) => (
                <div key={label} className="flex items-center gap-sm py-sm border-b border-ag-border last:border-0">
                  <span className="text-[20px]">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-ag-primary">{label}</p>
                    <p className="caption font-medium" style={{ color: 'var(--color-success)' }}>+{pts} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Benefícios por categoria */}
        {Object.entries(byCategory).map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader label={`${CAT_ICONS[cat] ?? '🎁'} ${CAT_LABELS[cat] ?? cat}`} />
            <CardBody>
              <div className="divide-y divide-ag-border">
                {items.map(p => {
                  const desconto = p.discount_type === 'percentual'
                    ? `${(Number(p.discount_value) * 100).toFixed(0)}% de desconto`
                    : `${formatBRL(Number(p.discount_value))} de desconto`
                  return (
                    <div key={p.id} className="flex items-center gap-md py-md">
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-ag-primary">{p.name}</p>
                        <p className="caption text-ag-muted">{p.description}</p>
                      </div>
                      <span className="text-body-sm font-medium shrink-0"
                        style={{ color: 'var(--color-success)' }}>
                        {desconto}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        ))}

        {/* Bloqueados */}
        {locked.length > 0 && (
          <Card>
            <CardHeader label="Desbloqueie subindo de nível" />
            <CardBody>
              <div className="divide-y divide-ag-border">
                {locked.slice(0, 4).map(p => {
                  const reqCfg = TIER_CONFIG[p.min_tier_required]
                  return (
                    <div key={p.id} className="flex items-center gap-md py-sm opacity-50">
                      <span className="text-[20px] shrink-0 grayscale">{CAT_ICONS[p.category] ?? '🎁'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-ag-primary">{p.name}</p>
                        <p className="caption text-ag-muted">Requer {reqCfg?.label}</p>
                      </div>
                      <span className="caption text-ag-muted">🔒</span>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
