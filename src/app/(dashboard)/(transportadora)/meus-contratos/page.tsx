export const dynamic = 'force-dynamic'

import type { Metadata }  from 'next'
import Link               from 'next/link'
import { redirect }       from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }         from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }         from '@/components/ui/button'
import { formatBRL, formatDate } from '@/lib/utils'
import { PublicarContratoButton } from './PublicarContratoButton'
import { NovoContratoForm }       from './NovoContratoForm'
import { RelatorioTR }         from './RelatorioTR'

export const metadata: Metadata = { title: 'Meus Contratos' }

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:      { label: 'Rascunho',      color: '#6B7280', bg: '#F3F4F6' },
  publicado:     { label: 'Publicado',     color: '#059669', bg: '#D1FAE5' },
  em_negociacao: { label: 'Em negociação', color: '#D97706', bg: '#FEF3C7' },
  fechado:       { label: 'Fechado',       color: '#2563EB', bg: '#DBEAFE' },
  cancelado:     { label: 'Cancelado',     color: '#DC2626', bg: '#FEE2E2' },
  encerrado:     { label: 'Encerrado',     color: '#9CA3AF', bg: '#F3F4F6' },
}

const PAYMENT_LABELS: Record<string, string> = {
  por_viagem: 'por viagem', por_km: '/km', mensal: 'mensal', por_tonelada: '/ton',
}

export default async function MeusContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; filter?: string }>
}) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role, full_name, company_name')
    .eq('user_id', user.id).single()
  if (!profile || profile.role !== 'transportadora') redirect('/gestao')

  const params = await searchParams
  const filter = params.filter ?? 'todos'

  // Formulário de novo contrato
  if (params.novo === '1') {
    return (
      <div className="flex flex-col h-full">
        <Header title="Novo Contrato" subtitle="Publicar vaga para agregados" />
        <main className="flex-1 px-lg py-xl md:px-xl overflow-auto">
          <NovoContratoForm />
        </main>
      </div>
    )
  }

  // Buscar contratos + candidaturas pendentes em paralelo
  const { data: contracts } = await admin.from('contracts')
    .select(`id, title, route_origin, route_destination, route_km,
             vehicle_type, contract_value, payment_type,
             status, candidates_count, published_at, created_at`)
    .eq('publisher_id', profile.id)
    .order('created_at', { ascending: false })

  const allContracts = contracts ?? []
  const contractIds  = allContracts.map(c => c.id)

  // Buscar pendentes com IDs corretos
  const { data: pending } = contractIds.length > 0
    ? await admin.from('candidatures').select('id, contract_id').in('contract_id', contractIds).eq('status', 'pendente')
    : { data: [] }

  const pendingByContract = (pending ?? []).reduce((acc, c) => {
    acc[c.contract_id] = (acc[c.contract_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalPending   = (pending ?? []).length
  const filtered = filter === 'todos' ? allContracts : allContracts.filter(c => c.status === filter)

  // Dados para relatório
  const { data: allCandidatures } = contractIds.length > 0
    ? await admin.from('candidatures').select('id, status').in('contract_id', contractIds)
    : { data: [] }
  const totalCandidatures  = (allCandidatures ?? []).length
  const acceptedCandidatures = (allCandidatures ?? []).filter(c => c.status === 'aceita' || c.status === 'confirmada').length
  const empresa  = profile.company_name || profile.full_name

  // Stats financeiras
  const valorTotal = allContracts
    .filter(c => ['publicado', 'em_negociacao', 'fechado'].includes(c.status))
    .reduce((s, c) => s + Number(c.contract_value), 0)

  return (
    <div className="flex flex-col h-full">
      <Header title={empresa} subtitle="Painel da transportadora" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {[
            { label: 'Total',       val: String(allContracts.length),                       sub: 'contratos' },
            { label: 'Publicados',  val: String(allContracts.filter(c => c.status === 'publicado').length), sub: 'ativos' },
            { label: 'Pendentes',   val: String(totalPending),                             sub: 'candidaturas', alert: totalPending > 0 },
            { label: 'Valor total', val: formatBRL(valorTotal),                             sub: 'em contratos' },
          ].map(s => (
            <Card key={s.label} elevated={!!s.alert && s.alert}>
              <CardBody>
                <p className="caption mb-xs" style={{ color: s.alert ? 'var(--color-warning)' : undefined }}>{s.label}</p>
                <p className="font-display text-display-sm font-medium text-ag-primary"
                  style={{ color: s.alert ? 'var(--color-warning)' : undefined }}>{s.val}</p>
                <p className="caption mt-xs text-ag-muted">{s.sub}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Relatório de performance */}
        {allContracts.length > 0 && (
          <RelatorioTR
            totalContracts={allContracts.length}
            activeContracts={allContracts.filter(c => c.status === 'publicado').length}
            closedContracts={allContracts.filter(c => c.status === 'fechado').length}
            totalCandidatures={totalCandidatures}
            acceptedCandidatures={acceptedCandidatures}
            totalValue={valorTotal}
          />
        )}

        {/* Filtros + CTA */}
        <div className="flex items-center justify-between gap-md flex-wrap">
          <div className="flex gap-sm overflow-x-auto pb-xs">
            {[['todos','Todos'],['publicado','Publicados'],['rascunho','Rascunhos'],['fechado','Fechados']].map(([k,l]) => (
              <Link key={k} href={`/meus-contratos${k !== 'todos' ? `?filter=${k}` : ''}`}>
                <span className="px-md py-sm rounded-pill text-body-sm font-medium border transition-all whitespace-nowrap cursor-pointer"
                  style={{
                    background:  filter === k ? 'var(--color-accent)' : 'transparent',
                    borderColor: filter === k ? 'var(--color-accent)' : 'var(--color-border)',
                    color:       filter === k ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
                  }}>
                  {l}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/meus-contratos?novo=1">
            <Button>+ Publicar vaga</Button>
          </Link>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-xl space-y-md">
                <p className="text-[48px]">📋</p>
                <p className="text-body text-ag-secondary">
                  {filter === 'todos' ? 'Nenhum contrato ainda.' : `Nenhum contrato ${filter}.`}
                </p>
                <Link href="/meus-contratos?novo=1">
                  <Button>Publicar primeira vaga</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-md">
            {filtered.map(c => {
              const st      = STATUS_STYLE[c.status] ?? STATUS_STYLE.rascunho
              const nPending = pendingByContract[c.id] ?? 0
              return (
                <Card key={c.id}>
                  <CardBody>
                    <div className="flex items-start gap-md">
                      <div className="flex-1 min-w-0">
                        {/* Badges de status */}
                        <div className="flex items-center gap-sm mb-sm flex-wrap">
                          <span className="px-sm py-xs rounded-md text-caption font-medium"
                            style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          {nPending > 0 && (
                            <span className="px-sm py-xs rounded-md text-caption font-medium"
                              style={{ background: '#FEF3C7', color: '#D97706' }}>
                              {nPending} pendente{nPending > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-body font-medium text-ag-primary mb-xs">{c.title}</p>
                        <p className="text-body-sm text-ag-secondary">
                          {c.route_origin} → {c.route_destination}
                          {Number(c.route_km) > 0 && ` · ${Number(c.route_km).toLocaleString('pt-BR')} km`}
                        </p>
                        <p className="text-body-sm text-ag-secondary">{c.vehicle_type}</p>
                      </div>

                      {/* Valor e ações */}
                      <div className="flex flex-col items-end gap-sm shrink-0">
                        <p className="font-display text-[20px] font-medium text-ag-primary">
                          {formatBRL(Number(c.contract_value))}
                        </p>
                        <p className="caption text-ag-muted">{PAYMENT_LABELS[c.payment_type] ?? ''}</p>
                        <div className="flex gap-sm">
                          <Link href={`/meus-contratos/${c.id}`}>
                            <span className="text-body-sm text-ag-secondary hover:text-ag-primary border border-ag-border px-sm py-xs rounded-md cursor-pointer transition-colors">
                              Ver →
                            </span>
                          </Link>
                          {c.status === 'rascunho' && (
                            <PublicarContratoButton contractId={c.id} />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
