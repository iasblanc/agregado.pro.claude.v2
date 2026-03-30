export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }   from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { formatBRL, getCurrentPeriod } from '@/lib/utils'
import { CandidatarButton } from '../CandidatarButton'
import { AvaliacaoButton }   from '../AvaliacaoButton'

export default async function ContratoDetalheAGPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const { id } = await params

  const { data: contract } = await admin.from('contracts')
    .select(`id, title, route_origin, route_destination, route_km,
             vehicle_type, equipment_type, contract_value, payment_type,
             duration_months, start_date, has_risk_management,
             candidates_count, status, published_at`)
    .eq('id', id).eq('status', 'publicado').single()
  if (!contract) notFound()

  // Custo/km do usuário
  const { data: dreEntries } = await admin.from('dre_entries')
    .select('amount, entry_type, km_reference')
    .eq('owner_id', profile.id).gte('period', getCurrentPeriod().slice(0, 4) + '-01').limit(200)

  let userCostPerKm: number | null = null
  if (dreEntries) {
    const totalCost = dreEntries.filter(e => e.entry_type !== 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const totalKm   = dreEntries.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
    if (totalCost > 0 && totalKm > 0) userCostPerKm = totalCost / totalKm
  }

  // Minha candidatura
  const { data: myCand } = await admin.from('candidatures')
    .select('id, status').eq('contract_id', id).eq('candidate_id', profile.id).not('status', 'eq', 'cancelada').maybeSingle()

  // Viabilidade
  let viability = null
  if (userCostPerKm && Number(contract.route_km) > 0) {
    const estimatedCost  = userCostPerKm * Number(contract.route_km)
    const profit         = Number(contract.contract_value) - estimatedCost
    const margin         = (profit / Number(contract.contract_value)) * 100
    viability = { estimatedCost, profit, margin }
  }

  // Publisher para avaliação bidirecional
  const { data: publisherProfile } = await admin.from('profiles').select('id').eq('id', contract.publisher_id).single()

  return (
    <div className="flex flex-col h-full">
      <Header title={contract.title} subtitle={`${contract.route_origin} → ${contract.route_destination}`} />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Dados principais */}
        <Card>
          <CardHeader label="Contrato" />
          <CardBody>
            <div className="grid grid-cols-2 gap-md">
              {[
                ['Valor', formatBRL(Number(contract.contract_value))],
                ['Rota', `${Number(contract.route_km).toLocaleString('pt-BR')} km`],
                ['Veículo', contract.vehicle_type],
                ['Pagamento', contract.payment_type?.replace('_', ' ')],
                contract.duration_months && ['Duração', `${contract.duration_months} meses`],
                contract.equipment_type  && ['Implemento', contract.equipment_type],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k as string}>
                  <p className="caption text-ag-muted mb-xs">{k}</p>
                  <p className="text-body font-medium text-ag-primary">{v}</p>
                </div>
              ))}
            </div>
            {contract.has_risk_management && (
              <p className="text-body-sm text-ag-secondary mt-md">⚠️ Exige gerenciamento de risco</p>
            )}
          </CardBody>
        </Card>

        {/* Análise de viabilidade */}
        {viability ? (
          <Card>
            <CardHeader label="Análise de viabilidade" />
            <CardBody>
              <div className="grid grid-cols-2 gap-md mb-md">
                <div>
                  <p className="caption text-ag-muted mb-xs">Custo estimado</p>
                  <p className="text-body font-medium" style={{ color: 'var(--color-danger)' }}>
                    {formatBRL(viability.estimatedCost)}
                  </p>
                </div>
                <div>
                  <p className="caption text-ag-muted mb-xs">Lucro estimado</p>
                  <p className="text-body font-medium" style={{ color: viability.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {formatBRL(viability.profit)}
                  </p>
                </div>
              </div>
              <div className="px-md py-sm rounded-md"
                style={{
                  background: viability.margin >= 15 ? '#D1FAE5' : viability.margin >= 0 ? '#FEF3C7' : '#FEE2E2',
                  color:      viability.margin >= 15 ? '#059669' : viability.margin >= 0 ? '#D97706' : '#DC2626',
                }}>
                <p className="text-body-sm font-medium">
                  {viability.margin >= 15 ? '✅ Contrato saudável' : viability.margin >= 0 ? '⚠️ No limite' : '❌ Abaixo do custo'}
                  {' — '}margem de {viability.margin.toFixed(1)}%
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <p className="text-body-sm text-ag-muted text-center">
                Lance custos no DRE para ver a análise de viabilidade deste contrato.
              </p>
            </CardBody>
          </Card>
        )}

        {/* CTA */}
        <div className="pb-xl">
          {myCand ? (
            <div className="px-md py-md rounded-md text-center"
              style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
              ✓ Sua candidatura está <strong>{myCand.status}</strong>
            </div>
          ) : (
            <CandidatarButton contractId={contract.id} profileId={profile.id} />
          )}
        {/* Avaliação — disponível quando contrato aceito */}
        {myCand?.status === 'aceita' && myCand?.id && (
          <AvaliacaoButton
            contractId={contract.id}
            candidatureId={myCand.id}
            evaluatedId={contract.publisher_id}
          />
        )}
        </div>
      </main>
    </div>
  )
}
