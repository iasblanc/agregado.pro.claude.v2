export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import Link                   from 'next/link'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }      from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }      from '@/components/ui/button'
import { formatBRL, formatDate } from '@/lib/utils'
import { CandidaturaActions } from './CandidaturaActions'
import { PublicarContratoButton } from '../PublicarContratoButton'

const PAYMENT_LABELS: Record<string, string> = {
  por_viagem: 'por viagem', por_km: '/km', mensal: 'mensal', por_tonelada: '/ton',
}

const CAND_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pendente:   { label: 'Pendente',   color: '#D97706', bg: '#FEF3C7' },
  aceita:     { label: 'Aceita',     color: '#059669', bg: '#D1FAE5' },
  confirmada: { label: 'Confirmada', color: '#2563EB', bg: '#DBEAFE' },
  recusada:   { label: 'Recusada',   color: '#6B7280', bg: '#F3F4F6' },
  cancelada:  { label: 'Cancelada',  color: '#9CA3AF', bg: '#F3F4F6' },
}

export default async function ContratoDetalheTRPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'transportadora') redirect('/gestao')

  const { id } = await params
  const { data: contract } = await admin.from('contracts')
    .select('*').eq('id', id).eq('publisher_id', profile.id).single()
  if (!contract) notFound()

  // Candidaturas com dados completos
  const { data: candidatures } = await admin.from('candidatures')
    .select(`
      id, status, message, cost_per_km_snapshot, created_at, updated_at,
      candidate:profiles!candidatures_candidate_id_fkey(id, full_name, phone, cpf),
      vehicle:vehicles!candidatures_vehicle_id_fkey(id, brand, model, year, plate, type, equipment_type)
    `)
    .eq('contract_id', id)
    .order('created_at', { ascending: false })

  const allCands  = candidatures ?? []
  const pendentes = allCands.filter(c => c.status === 'pendente').length
  const aceitas   = allCands.filter(c => c.status === 'aceita').length

  // Candidato aceito (se houver)
  const accepted = allCands.find(c => c.status === 'aceita' || c.status === 'confirmada')

  return (
    <div className="flex flex-col h-full">
      <Header title={contract.title} subtitle={`${contract.route_origin} → ${contract.route_destination}`} />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-3xl">

        {/* Status do contrato */}
        <Card elevated={contract.status === 'publicado'}>
          <CardBody>
            <div className="flex items-start justify-between gap-md">
              <div>
                <div className="flex items-center gap-sm mb-sm">
                  <span className="px-sm py-xs rounded-md caption font-medium"
                    style={{
                      background: contract.status === 'publicado' ? '#D1FAE5' : '#F3F4F6',
                      color:      contract.status === 'publicado' ? '#059669' : '#6B7280',
                    }}>
                    {contract.status === 'publicado' ? '🟢 Publicado' :
                     contract.status === 'rascunho'  ? '📝 Rascunho'  :
                     contract.status === 'fechado'   ? '✅ Fechado'   : contract.status}
                  </span>
                  {pendentes > 0 && (
                    <span className="px-sm py-xs rounded-md caption font-medium"
                      style={{ background: '#FEF3C7', color: '#D97706' }}>
                      ⏳ {pendentes} pendente{pendentes > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                  {[
                    ['Valor',       formatBRL(Number(contract.contract_value))],
                    ['Distância',   `${Number(contract.route_km).toLocaleString('pt-BR')} km`],
                    ['Veículo',     contract.vehicle_type],
                    ['Pagamento',   PAYMENT_LABELS[contract.payment_type] ?? contract.payment_type],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="caption text-ag-muted mb-xs">{k}</p>
                      <p className="text-body-sm font-medium text-ag-primary">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-sm items-end shrink-0">
                {contract.status === 'rascunho' && (
                  <PublicarContratoButton contractId={contract.id} />
                )}
                <Link href="/meus-contratos">
                  <span className="text-body-sm text-ag-secondary hover:text-ag-primary cursor-pointer">
                    ← Voltar
                  </span>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Caminhoneiro aceito — destaque */}
        {accepted && (() => {
          const cand    = accepted.candidate as { full_name?: string; phone?: string } | null
          const vehicle = accepted.vehicle as { brand?: string; model?: string; year?: number; plate?: string; type?: string } | null
          return (
            <Card>
              <CardHeader label="✅ Caminhoneiro selecionado" />
              <CardBody>
                <div className="flex items-start gap-lg">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-surface)', fontSize: 24 }}>
                    🚛
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-ag-primary mb-xs">{cand?.full_name ?? '—'}</p>
                    {cand?.phone && (
                      <p className="text-body-sm text-ag-secondary">📞 {cand.phone}</p>
                    )}
                    {vehicle && (
                      <p className="text-body-sm text-ag-secondary">
                        🚛 {vehicle.brand} {vehicle.model} {vehicle.year} — {vehicle.plate}
                      </p>
                    )}
                    {(accepted.cost_per_km_snapshot as number) > 0 && (
                      <p className="text-body-sm text-ag-secondary">
                        💰 Custo/km: {formatBRL(accepted.cost_per_km_snapshot as number)}/km
                      </p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })()}

        {/* Todas as candidaturas */}
        <Card>
          <CardHeader label={`Candidaturas (${allCands.length})`}>
            <span className="caption text-ag-muted">{aceitas} aceita{aceitas !== 1 ? 's' : ''}</span>
          </CardHeader>
          <CardBody>
            {allCands.length === 0 ? (
              <div className="text-center py-lg">
                <p className="text-[32px] mb-sm">📬</p>
                <p className="text-body-sm text-ag-muted">
                  Nenhuma candidatura ainda. O contrato está publicado e visível no marketplace para todos os caminhoneiros cadastrados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ag-border">
                {allCands.map((c: Record<string, unknown>) => {
                  const cand    = c.candidate as { full_name?: string; phone?: string } | null
                  const vehicle = c.vehicle as { brand?: string; model?: string; plate?: string; type?: string } | null
                  const st      = CAND_STATUS[(c.status as string)] ?? CAND_STATUS.pendente
                  return (
                    <div key={c.id as string} className="py-md">
                      <div className="flex items-start justify-between gap-md">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-sm mb-sm flex-wrap">
                            <span className="px-sm py-xs rounded-md caption font-medium"
                              style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                            <span className="caption text-ag-muted">{formatDate(c.updated_at as string)}</span>
                          </div>
                          <p className="text-body-sm font-medium text-ag-primary">
                            {cand?.full_name ?? 'Caminhoneiro'}
                          </p>
                          {vehicle && (
                            <p className="text-body-sm text-ag-secondary">
                              {vehicle.brand} {vehicle.model} — {vehicle.plate} ({vehicle.type})
                            </p>
                          )}
                          {cand?.phone && (
                            <p className="text-body-sm text-ag-secondary">📞 {cand.phone}</p>
                          )}
                          {(c.cost_per_km_snapshot as number) > 0 && (
                            <p className="caption text-ag-muted">
                              Custo/km: {formatBRL(c.cost_per_km_snapshot as number)}/km
                            </p>
                          )}
                          {c.message && (
                            <p className="text-body-sm text-ag-secondary italic mt-xs">
                              "{c.message as string}"
                            </p>
                          )}
                        </div>
                        {(c.status as string) === 'pendente' && (
                          <CandidaturaActions candidaturaId={c.id as string} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </main>
    </div>
  )
}
