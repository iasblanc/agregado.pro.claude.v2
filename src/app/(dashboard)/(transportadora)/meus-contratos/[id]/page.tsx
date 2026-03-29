export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }     from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { formatBRL }  from '@/lib/utils'
import { CandidaturaActions } from './CandidaturaActions'

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'transportadora') redirect('/gestao')

  const { id } = await params

  const { data: contract } = await admin.from('contracts')
    .select('*').eq('id', id).eq('publisher_id', profile.id).single()
  if (!contract) notFound()

  // Buscar candidaturas com dados do caminhoneiro
  const { data: candidatures } = await admin.from('candidatures')
    .select(`id, status, message, cost_per_km_snapshot, created_at,
             candidate:profiles!candidatures_candidate_id_fkey(id, full_name, phone, cpf),
             vehicle:vehicles!candidatures_vehicle_id_fkey(id, brand, model, year, plate, type)`)
    .eq('contract_id', id)
    .order('created_at', { ascending: false })

  const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
    pendente:   { label: 'Pendente',   color: '#D97706', bg: '#FEF3C7' },
    aceita:     { label: 'Aceita',     color: '#059669', bg: '#D1FAE5' },
    confirmada: { label: 'Confirmada', color: '#2563EB', bg: '#DBEAFE' },
    recusada:   { label: 'Recusada',   color: '#6B7280', bg: '#F3F4F6' },
    cancelada:  { label: 'Cancelada',  color: '#9CA3AF', bg: '#F3F4F6' },
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={contract.title} subtitle={`${contract.route_origin} → ${contract.route_destination}`} />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-3xl">

        {/* Resumo do contrato */}
        <Card>
          <CardHeader label="Detalhes do contrato" />
          <CardBody>
            <div className="grid grid-cols-2 gap-md">
              {[
                ['Valor', formatBRL(Number(contract.contract_value))],
                ['Distância', `${Number(contract.route_km).toLocaleString('pt-BR')} km`],
                ['Veículo', contract.vehicle_type],
                ['Candidatos', `${contract.candidates_count}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="caption text-ag-muted mb-xs">{k}</p>
                  <p className="text-body font-medium text-ag-primary">{v}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Candidaturas */}
        <Card>
          <CardHeader label={`Candidaturas (${candidatures?.length ?? 0})`} />
          <CardBody>
            {!candidatures?.length ? (
              <p className="text-body-sm text-ag-muted text-center py-lg">Nenhuma candidatura ainda.</p>
            ) : (
              <div className="divide-y divide-ag-border">
                {candidatures.map((c: Record<string, unknown>) => {
                  const candidate = c.candidate as { full_name?: string; phone?: string } | null
                  const vehicle   = c.vehicle as { brand?: string; model?: string; plate?: string } | null
                  const st = STATUS_COLORS[(c.status as string)] ?? STATUS_COLORS.pendente
                  return (
                    <div key={c.id as string} className="py-md">
                      <div className="flex items-start justify-between gap-md">
                        <div className="flex-1">
                          <div className="flex items-center gap-sm mb-xs">
                            <span className="px-sm py-xs rounded-md caption font-medium"
                              style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                            <span className="text-body-sm font-medium text-ag-primary">
                              {candidate?.full_name ?? 'Caminhoneiro'}
                            </span>
                          </div>
                          {vehicle && (
                            <p className="text-body-sm text-ag-secondary">
                              🚛 {vehicle.brand} {vehicle.model} — {vehicle.plate}
                            </p>
                          )}
                          {candidate?.phone && (
                            <p className="text-body-sm text-ag-secondary">📞 {candidate.phone}</p>
                          )}
                          {(c.cost_per_km_snapshot as number) > 0 && (
                            <p className="text-body-sm text-ag-secondary">
                              Custo/km: {formatBRL(c.cost_per_km_snapshot as number)}
                            </p>
                          )}
                          {c.message && (
                            <p className="text-body-sm text-ag-secondary italic mt-xs">"{c.message as string}"</p>
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
