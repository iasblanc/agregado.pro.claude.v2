export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Benefícios' }

const PARCEIROS = [
  { icon: '⛽', nome: 'Rede de Postos', categoria: 'Combustível', desc: 'Desconto em toda a rede parceira', beneficio: '5% de desconto', tier: 'bronze' },
  { icon: '🔧', nome: 'Oficinas Parceiras', categoria: 'Manutenção', desc: 'Rede de oficinas credenciadas', beneficio: '10% de desconto', tier: 'bronze' },
  { icon: '🏨', nome: 'Pousos na Estrada', categoria: 'Hospedagem', desc: 'Pernoite em áreas de descanso parceiras', beneficio: '15% de desconto', tier: 'prata' },
  { icon: '🍽️', nome: 'Restaurantes de Beira de Estrada', categoria: 'Alimentação', desc: 'Refeições nos parceiros da rede', beneficio: '8% de desconto', tier: 'prata' },
  { icon: '🛡️', nome: 'Seguros Especiais', categoria: 'Proteção', desc: 'Seguro de carga e do caminhão', beneficio: 'Condições exclusivas', tier: 'ouro' },
  { icon: '💳', nome: 'Cartão Combustível', categoria: 'Financeiro', desc: 'Pagamento facilitado nos postos', beneficio: 'Sem anuidade', tier: 'ouro' },
]

const TIER_ORDER = ['bronze', 'prata', 'ouro', 'platina']
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

  // Buscar conta de fidelidade (pode não existir ainda)
  const { data: loyalty } = await admin.from('loyalty_accounts')
    .select('tier, points_available, months_active').eq('owner_id', profile.id).maybeSingle()

  const currentTier  = loyalty?.tier ?? 'bronze'
  const points       = loyalty?.points_available ?? 0
  const monthsActive = loyalty?.months_active ?? 0
  const tierCfg      = TIER_CONFIG[currentTier] ?? TIER_CONFIG.bronze

  // Parceiros disponíveis no tier atual
  const tierIdx   = TIER_ORDER.indexOf(currentTier)
  const available = PARCEIROS.filter(p => TIER_ORDER.indexOf(p.tier) <= tierIdx)
  const locked    = PARCEIROS.filter(p => TIER_ORDER.indexOf(p.tier) > tierIdx)

  return (
    <div className="flex flex-col h-full">
      <Header title="Benefícios" subtitle="Clube de vantagens para agregados" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Card de tier */}
        <Card elevated>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="caption text-ag-muted mb-xs">Seu nível</p>
                <span className="px-md py-xs rounded-pill text-body-sm font-medium"
                  style={{ background: tierCfg.bg, color: tierCfg.color }}>
                  {tierCfg.label}
                </span>
                <p className="text-body-sm text-ag-secondary mt-sm">
                  {monthsActive} {monthsActive === 1 ? 'mês' : 'meses'} ativo · {points} pontos disponíveis
                </p>
              </div>
              <div className="text-right">
                <p className="text-[48px]">🦏</p>
              </div>
            </div>

            {/* Barra de progresso para próximo tier */}
            {currentTier !== 'platina' && (
              <div className="mt-md">
                <div className="flex justify-between mb-xs">
                  <span className="caption text-ag-muted">{tierCfg.label.split(' ')[1]}</span>
                  <span className="caption text-ag-muted">{TIER_CONFIG[TIER_ORDER[tierIdx + 1]]?.label.split(' ')[1]}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((monthsActive / 6) * 100, 100)}%`, background: tierCfg.color }} />
                </div>
                <p className="caption text-ag-muted mt-xs">
                  {Math.max(0, 6 - monthsActive)} meses restantes para o próximo nível
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Como ganhar pontos */}
        <Card>
          <CardHeader label="Como ganhar pontos" />
          <CardBody>
            <div className="grid grid-cols-2 gap-md">
              {[
                ['📋', 'Lançamento no DRE', '10 pts'],
                ['📝', 'Contrato fechado', '100 pts'],
                ['⭐', 'Avaliação 5 estrelas', '50 pts'],
                ['📅', 'Mês positivo', '200 pts'],
              ].map(([icon, label, pts]) => (
                <div key={label} className="flex items-center gap-sm py-sm border-b border-ag-border last:border-0">
                  <span className="text-[20px]">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-ag-primary">{label}</p>
                    <p className="caption font-medium" style={{ color: 'var(--color-success)' }}>+{pts}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Benefícios disponíveis */}
        {available.length > 0 && (
          <Card>
            <CardHeader label={`Disponíveis para você (${available.length})`} />
            <CardBody>
              <div className="space-y-md">
                {available.map(p => (
                  <div key={p.nome} className="flex items-center gap-md py-sm border-b border-ag-border last:border-0">
                    <span className="text-[28px] shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-ag-primary">{p.nome}</p>
                      <p className="caption text-ag-muted">{p.desc}</p>
                    </div>
                    <span className="text-body-sm font-medium shrink-0"
                      style={{ color: 'var(--color-success)' }}>
                      {p.beneficio}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Bloqueados */}
        {locked.length > 0 && (
          <Card>
            <CardHeader label="Desbloqueie subindo de nível" />
            <CardBody>
              <div className="space-y-md">
                {locked.map(p => {
                  const reqTier = TIER_CONFIG[p.tier]
                  return (
                    <div key={p.nome} className="flex items-center gap-md py-sm border-b border-ag-border last:border-0 opacity-50">
                      <span className="text-[28px] shrink-0 grayscale">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-ag-primary">{p.nome}</p>
                        <p className="caption text-ag-muted">Disponível no nível {reqTier?.label}</p>
                      </div>
                      <span className="caption text-ag-muted shrink-0">🔒</span>
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
