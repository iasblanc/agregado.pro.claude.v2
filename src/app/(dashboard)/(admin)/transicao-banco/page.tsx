export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { formatBRL }    from '@/lib/utils'

export default async function TransicaoBancoPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/gestao')

  const { data: log } = await admin.from('bank_transition_log')
    .select('*').order('created_at', { ascending: false }).limit(10)

  const { count: users }    = await admin.from('profiles').select('id', { count: 'exact', head: true })
  const { count: contracts } = await admin.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'fechado')

  const THRESHOLD = 50000
  const pct = Math.min(((users ?? 0) / THRESHOLD) * 100, 100)

  return (
    <div className="flex flex-col h-full">
      <Header title="Transição BaaS → Banco" subtitle="Painel de decisão de arquitetura" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-3xl">

        {/* Threshold progress */}
        <Card elevated>
          <CardHeader label="Threshold de escala" />
          <CardBody>
            <p className="text-body-sm text-ag-secondary mb-md">
              Transição para banco próprio ocorre ao atingir <strong>50.000 usuários ativos</strong>.
            </p>
            <div className="flex justify-between text-body-sm mb-sm">
              <span className="text-ag-secondary">Usuários ativos</span>
              <span className="font-medium text-ag-primary">{(users ?? 0).toLocaleString('pt-BR')} / {THRESHOLD.toLocaleString('pt-BR')}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--color-surface)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-accent)' }} />
            </div>
            <p className="caption text-ag-muted mt-sm">{pct.toFixed(2)}% do threshold atingido</p>
          </CardBody>
        </Card>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {[
            { label: 'Usuários', val: (users ?? 0).toLocaleString('pt-BR') },
            { label: 'Contratos fechados', val: (contracts ?? 0).toLocaleString('pt-BR') },
            { label: 'Threshold', val: '50.000' },
            { label: 'Fase atual', val: 'BaaS' },
          ].map(m => (
            <Card key={m.label}>
              <CardBody>
                <p className="caption text-ag-muted mb-xs">{m.label}</p>
                <p className="text-body font-medium text-ag-primary">{m.val}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Fases */}
        <Card>
          <CardHeader label="Roadmap BaaS → Banco Próprio" />
          <CardBody>
            <div className="space-y-md">
              {[
                { fase: 'Phase 2', status: 'Atual', desc: 'BaaS parceiro — conta débito, interchange, IA classificação' },
                { fase: 'Phase 3', status: 'Futuro', desc: 'Cartão de crédito vinculado ao contrato' },
                { fase: 'Phase 4', status: 'Futuro', desc: 'Análise de viabilidade: banco próprio vs BaaS permanente' },
                { fase: 'Phase 5', status: 'Decisão', desc: 'Transição gradual se 50K usuários atingidos — sem fricção para usuário' },
              ].map(f => (
                <div key={f.fase} className="flex items-start gap-md py-sm border-b border-ag-border last:border-0">
                  <div className="shrink-0">
                    <span className="text-body-sm font-medium text-ag-primary block">{f.fase}</span>
                    <span className="caption text-ag-muted">{f.status}</span>
                  </div>
                  <p className="text-body-sm text-ag-secondary">{f.desc}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Log */}
        {log && log.length > 0 && (
          <Card>
            <CardHeader label="Log de decisões" />
            <CardBody>
              <div className="divide-y divide-ag-border">
                {log.map(l => (
                  <div key={l.id} className="py-sm">
                    <p className="text-body-sm font-medium text-ag-primary">{l.phase} — {l.milestone}</p>
                    <p className="caption text-ag-muted">{l.description}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
