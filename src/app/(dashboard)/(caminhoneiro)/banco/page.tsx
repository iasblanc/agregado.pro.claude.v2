export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { formatBRL }    from '@/lib/utils'

export const metadata: Metadata = { title: 'Banco Digital' }

export default async function BancoPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role, full_name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const nome = profile.full_name.split(' ')[0]

  return (
    <div className="flex flex-col h-full">
      <Header title="Banco Digital" subtitle="Sua conta na estrada" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Card principal — em breve */}
        <Card elevated>
          <CardBody>
            <div className="text-center py-xl space-y-lg">
              <div style={{ width: 80, height: 80, background: 'var(--color-surface)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 36 }}>
                🏦
              </div>
              <div className="space-y-sm">
                <span className="px-md py-xs rounded-pill text-caption font-medium"
                  style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  Em desenvolvimento — Phase 3
                </span>
                <h2 className="font-display text-display-sm font-medium text-ag-primary">
                  Conta digital do Agregado
                </h2>
                <p className="text-body text-ag-secondary max-w-sm mx-auto">
                  Uma conta bancária construída para a estrada. Cartão de débito, gestão de saldo e IA que classifica cada gasto automaticamente no seu DRE.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Features previstas */}
        <Card>
          <CardHeader label="O que está chegando" />
          <CardBody>
            <div className="space-y-md">
              {[
                {
                  icon: '💳', title: 'Conta + Cartão de Débito',
                  desc: 'Conta digital com cartão físico e virtual. Aceito em toda a rede Visa.',
                  status: 'Em breve',
                },
                {
                  icon: '🤖', title: 'IA de Classificação de Despesas',
                  desc: 'Cada compra no cartão é classificada automaticamente (diesel, pedágio, manutenção) e lançada direto no seu DRE. Zero lançamento manual.',
                  status: 'Em breve',
                },
                {
                  icon: '📊', title: 'Dashboard de Viagem',
                  desc: 'Acompanhe despesas da rota em tempo real. Alerta quando os custos comprometem a margem do contrato.',
                  status: 'Em breve',
                },
                {
                  icon: '🏪', title: 'Rede de Parceiros',
                  desc: 'Postos, oficinas e restaurantes parceiros com desconto automático na maquininha.',
                  status: 'Em breve',
                },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-md py-md border-b border-ag-border last:border-0">
                  <span className="text-[28px] shrink-0">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm mb-xs">
                      <p className="text-body-sm font-medium text-ag-primary">{f.title}</p>
                      <span className="caption text-ag-muted border border-ag-border px-sm py-xs rounded-md">{f.status}</span>
                    </div>
                    <p className="text-body-sm text-ag-secondary">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* O Flywheel do cartão */}
        <Card>
          <CardHeader label="Por que o cartão é o diferencial" />
          <CardBody>
            <div className="space-y-sm">
              {[
                '💳 Cartão passa no posto → IA classifica como "Diesel"',
                '📊 DRE atualiza automaticamente em tempo real',
                '📈 Score melhora com histórico transacional real',
                '💰 Crédito com melhores condições baseado em dados reais',
                '🔁 Quanto mais você usa, mais preciso fica',
              ].map(step => (
                <p key={step} className="text-body-sm text-ag-secondary flex items-start gap-sm">
                  <span className="shrink-0">{step.slice(0, 2)}</span>
                  <span>{step.slice(3)}</span>
                </p>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* CTA interesse */}
        <Card>
          <CardBody>
            <p className="text-body font-medium text-ag-primary mb-sm">
              Quer ser avisado quando lançar?
            </p>
            <p className="text-body-sm text-ag-secondary mb-md">
              Usuários da plataforma têm acesso prioritário ao banco digital.
              Continue usando o DRE para estar na frente da fila.
            </p>
            <div className="px-md py-sm rounded-md"
              style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
              <p className="text-body-sm font-medium" style={{ color: 'var(--color-success)' }}>
                ✓ {nome}, você está na lista prioritária de usuários ativos.
              </p>
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}
