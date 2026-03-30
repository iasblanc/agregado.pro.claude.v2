export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardBody } from '@/components/ui/card'
import { formatBRL, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Minhas Candidaturas' }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pendente:   { label: 'Aguardando',  color: '#D97706', bg: '#FEF3C7', icon: '⏳' },
  aceita:     { label: 'Aceita',      color: '#059669', bg: '#D1FAE5', icon: '✅' },
  confirmada: { label: 'Confirmada',  color: '#2563EB', bg: '#DBEAFE', icon: '🤝' },
  recusada:   { label: 'Recusada',    color: '#6B7280', bg: '#F3F4F6', icon: '✕' },
  cancelada:  { label: 'Cancelada',   color: '#9CA3AF', bg: '#F3F4F6', icon: '—' },
}

export default async function MinhsCandidaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const params = await searchParams
  const filter = params.filter ?? 'todas'

  const { data: candidatures } = await admin.from('candidatures')
    .select(`
      id, status, message, cost_per_km_snapshot, created_at, updated_at,
      contract:contracts!candidatures_contract_id_fkey(
        id, title, route_origin, route_destination, route_km,
        contract_value, payment_type, vehicle_type, publisher_id
      )
    `)
    .eq('candidate_id', profile.id)
    .order('updated_at', { ascending: false })

  const all = candidatures ?? []

  const filtered = filter === 'todas' ? all
    : all.filter(c => c.status === filter)

  // Contagens
  const counts = {
    todas:     all.length,
    pendente:  all.filter(c => c.status === 'pendente').length,
    aceita:    all.filter(c => c.status === 'aceita').length,
    recusada:  all.filter(c => c.status === 'recusada').length,
  }

  const PAYMENT_LABELS: Record<string, string> = {
    por_viagem: 'por viagem', por_km: '/km', mensal: 'mensal',
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Minhas Candidaturas" subtitle={`${all.length} candidatura${all.length !== 1 ? 's' : ''}`} />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto">

        {/* Stats rápidas */}
        <div className="grid grid-cols-4 gap-md">
          {[
            ['Todas',     counts.todas,    'todas'],
            ['Aguardando', counts.pendente, 'pendente'],
            ['Aceitas',   counts.aceita,   'aceita'],
            ['Recusadas', counts.recusada,  'recusada'],
          ].map(([label, count, key]) => (
            <Link key={key} href={`/candidaturas${key !== 'todas' ? `?filter=${key}` : ''}`}>
              <div className="rounded-xl border p-md text-center cursor-pointer transition-all"
                style={{
                  background:  filter === key ? 'var(--color-accent)' : 'var(--color-bg)',
                  borderColor: filter === key ? 'var(--color-accent)' : 'var(--color-border)',
                }}>
                <p className="font-display text-[22px] font-medium"
                  style={{ color: filter === key ? 'var(--color-cta-text)' : 'var(--color-text-primary)' }}>
                  {count}
                </p>
                <p className="caption mt-xs"
                  style={{ color: filter === key ? 'rgba(245,242,236,0.7)' : 'var(--color-text-muted)' }}>
                  {label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-xl space-y-md">
                <p className="text-[48px]">📋</p>
                <p className="text-body text-ag-secondary">
                  {filter === 'todas' ? 'Você ainda não se candidatou a nenhum contrato.' : `Nenhuma candidatura ${filter}.`}
                </p>
                <Link href="/contratos">
                  <div className="inline-flex items-center gap-sm px-lg py-md rounded-pill text-body-sm font-medium"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}>
                    Ver contratos disponíveis →
                  </div>
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-md">
            {filtered.map(cand => {
              const st       = STATUS_CONFIG[cand.status as string] ?? STATUS_CONFIG.pendente
              const contract = cand.contract as {
                id: string; title: string; route_origin: string; route_destination: string
                route_km: number; contract_value: number; payment_type: string; vehicle_type: string
              } | null

              return (
                <Card key={cand.id as string}>
                  <CardBody>
                    <div className="flex items-start gap-md">
                      <div className="flex-1 min-w-0">
                        {/* Status badge */}
                        <div className="flex items-center gap-sm mb-sm">
                          <span className="px-sm py-xs rounded-md text-caption font-medium"
                            style={{ background: st.bg, color: st.color }}>
                            {st.icon} {st.label}
                          </span>
                          <span className="caption text-ag-muted">
                            {formatDate(cand.updated_at as string)}
                          </span>
                        </div>

                        {contract ? (
                          <>
                            <p className="text-body font-medium text-ag-primary mb-xs">{contract.title}</p>
                            <p className="text-body-sm text-ag-secondary">
                              📍 {contract.route_origin} → {contract.route_destination}
                              {Number(contract.route_km) > 0 && ` · ${Number(contract.route_km).toLocaleString('pt-BR')} km`}
                            </p>
                            <p className="text-body-sm text-ag-secondary">
                              🚛 {contract.vehicle_type}
                            </p>
                          </>
                        ) : (
                          <p className="text-body-sm text-ag-muted">Contrato não encontrado</p>
                        )}

                        {(cand.cost_per_km_snapshot as number) > 0 && (
                          <p className="caption text-ag-muted mt-xs">
                            Custo/km no momento: {formatBRL(cand.cost_per_km_snapshot as number)}/km
                          </p>
                        )}
                      </div>

                      {/* Valor */}
                      {contract && (
                        <div className="text-right shrink-0">
                          <p className="font-display text-[18px] font-medium text-ag-primary">
                            {formatBRL(Number(contract.contract_value))}
                          </p>
                          <p className="caption text-ag-muted">
                            {PAYMENT_LABELS[contract.payment_type] ?? ''}
                          </p>
                          {(cand.status as string) === 'aceita' && (
                            <Link href={`/contratos/${contract.id}`}>
                              <div className="mt-sm text-body-sm text-ag-secondary hover:text-ag-primary border border-ag-border px-sm py-xs rounded-md cursor-pointer transition-colors inline-block">
                                Ver contrato →
                              </div>
                            </Link>
                          )}
                        </div>
                      )}
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
