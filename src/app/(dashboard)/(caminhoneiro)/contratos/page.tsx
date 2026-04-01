export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Header }        from '@/components/layout/Header'
import { Card, CardBody } from '@/components/ui/card'
import { formatBRL, getCurrentPeriod }      from '@/lib/utils'
import { CandidatarButton }  from './CandidatarButton'
import { ContratoSearch }    from './ContratoSearch'

export const metadata: Metadata = { title: 'Contratos Disponíveis' }

const PAYMENT_LABELS: Record<string, string> = {
  por_viagem: 'por viagem', por_km: 'por km', mensal: 'mensal', por_tonelada: 'por ton',
}

function calcViability(contractValue: number, routeKm: number, userCostPerKm: number | null) {
  if (!userCostPerKm || routeKm <= 0) return null
  const estimatedCost  = userCostPerKm * routeKm
  const profit         = contractValue - estimatedCost
  const margin         = (profit / contractValue) * 100
  if (margin >= 15)  return { label: '✅ Saudável',     color: '#059669', bg: '#D1FAE5', margin }
  if (margin >= 0)   return { label: '⚠️ No limite',    color: '#D97706', bg: '#FEF3C7', margin }
  return               { label: '❌ Abaixo do custo', color: '#DC2626', bg: '#FEE2E2', margin }
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; min?: string; max?: string; q?: string }>
}) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const params    = await searchParams
  const tipoFiltro   = params.tipo ?? ''
  const minValor     = params.min ? Number(params.min) : null
  const maxValor     = params.max ? Number(params.max) : null
  const searchQuery  = (params.q ?? '').toLowerCase()

  // Buscar custo/km real do usuário (últimos 3 meses)
  const period = getCurrentPeriod()
  const { data: dreEntries } = await admin.from('dre_entries')
    .select('amount, entry_type, km_reference')
    .eq('owner_id', profile.id)
    .gte('period', period.slice(0, 4) + '-01')
    .limit(200)

  let userCostPerKm: number | null = null
  if (dreEntries && dreEntries.length > 0) {
    const totalCost = dreEntries.filter(e => e.entry_type !== 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const totalKm   = dreEntries.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
    if (totalCost > 0 && totalKm > 0) userCostPerKm = totalCost / totalKm
  }

  // Buscar minha candidaturas ativas
  const { data: myCandidatures } = await admin.from('candidatures')
    .select('contract_id, status')
    .eq('candidate_id', profile.id)
    .not('status', 'eq', 'cancelada')

  const myCandidaturesByContract = Object.fromEntries(
    (myCandidatures ?? []).map(c => [c.contract_id, c.status])
  )

  // Buscar contratos publicados
  const { data: contracts } = await admin.from('contracts')
    .select(`id, title, route_origin, route_destination, route_km,
             vehicle_type, equipment_type, contract_value, payment_type,
             duration_months, start_date, candidates_count, has_risk_management,
             published_at, publisher_id`)
    .eq('status', 'publicado')
    .order('published_at', { ascending: false })

  const allContracts = contracts ?? []

  // Adicionar viabilidade e ordenar
  // Aplicar filtros
  const contractsFiltrados = allContracts.filter(c => {
    if (tipoFiltro && c.vehicle_type !== tipoFiltro) return false
    if (minValor && Number(c.contract_value) < minValor) return false
    if (maxValor && Number(c.contract_value) > maxValor) return false
    if (searchQuery) {
      const searchable = [c.title, c.route_origin, c.route_destination, c.vehicle_type].join(' ').toLowerCase()
      if (!searchable.includes(searchQuery)) return false
    }
    return true
  })

  const withViability = contractsFiltrados.map(c => ({
    ...c,
    viability: calcViability(Number(c.contract_value), Number(c.route_km), userCostPerKm),
    myStatus: myCandidaturesByContract[c.id] ?? null,
  })).sort((a, b) => {
    if (!a.viability && !b.viability) return 0
    if (!a.viability) return 1
    if (!b.viability) return -1
    return (b.viability.margin ?? 0) - (a.viability.margin ?? 0)
  })

  return (
    <div className="flex flex-col h-full">
      <Header title="Contratos" subtitle={`${contractsFiltrados.length} de ${allContracts.length} vagas`} />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto">

        {/* Banner custo/km */}
        {userCostPerKm ? (
          <div className="px-md py-sm rounded-md text-body-sm flex items-center gap-sm"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}>
            💡 Viabilidade calculada com seu custo real de <strong>{formatBRL(userCostPerKm)}/km</strong>
          </div>
        ) : (
          <div className="px-md py-sm rounded-md text-body-sm flex items-center gap-sm"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
            ⚠ Lance custos no DRE para ver a viabilidade real de cada contrato
          </div>
        )}


        {/* Busca client-side */}
        <ContratoSearch currentQuery={searchQuery} currentTipo={tipoFiltro} />

        {/* Filtros por tipo de veículo */}
        <div className="flex gap-sm overflow-x-auto pb-xs">
          {[
            ['', 'Todos'],
            ['Truck', 'Truck'],
            ['Toco', 'Toco'],
            ['Cavalo 6x2', 'Cavalo 6x2'],
            ['Cavalo 6x4', 'Cavalo 6x4'],
          ].map(([tipo, label]) => (
            <Link key={tipo} href={tipo ? `/contratos?tipo=${encodeURIComponent(tipo)}` : '/contratos'}>
              <span className="px-md py-sm rounded-pill text-body-sm font-medium border transition-all whitespace-nowrap cursor-pointer"
                style={{
                  background:  tipoFiltro === tipo ? 'var(--color-accent)' : 'transparent',
                  borderColor: tipoFiltro === tipo ? 'var(--color-accent)' : 'var(--color-border)',
                  color:       tipoFiltro === tipo ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
                }}>
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Lista */}
        {withViability.length === 0 ? (
          <Card><CardBody>
            <div className="text-center py-xl">
              <p className="text-[48px] mb-md">📋</p>
              <p className="text-body text-ag-secondary">Nenhum contrato disponível no momento.</p>
            </div>
          </CardBody></Card>
        ) : (
          <div className="space-y-md">
            {withViability.map(c => (
              <Card key={c.id}>
                <CardBody>
                  {/* Header do card */}
                  {myCandSet.has(c.id) && (
                    <div className="flex mb-sm">
                      <span className="px-sm py-xs rounded-md text-caption font-medium"
                        style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)' }}>
                        ✓ Candidatura enviada
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-md mb-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-ag-primary mb-xs">{c.title}</p>
                      <p className="text-body-sm text-ag-secondary">
                        📍 {c.route_origin} → {c.route_destination}
                        {Number(c.route_km) > 0 && ` · ${Number(c.route_km).toLocaleString('pt-BR')} km`}
                      </p>
                      <p className="text-body-sm text-ag-secondary">
                        🚛 {c.vehicle_type}
                        {c.equipment_type ? ` · ${c.equipment_type}` : ''}
                        {c.has_risk_management ? ' · GR exigido' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-[22px] font-medium text-ag-primary">
                        {formatBRL(Number(c.contract_value))}
                      </p>
                      <p className="caption text-ag-muted">{PAYMENT_LABELS[c.payment_type] ?? ''}</p>
                      {Number(c.route_km) > 0 && c.payment_type === 'por_viagem' && (
                        <p className="caption text-ag-muted">
                          {formatBRL(Number(c.contract_value) / Number(c.route_km))}/km
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Viabilidade */}
                  {c.viability && (
                    <div className="flex items-center gap-sm mb-md px-sm py-xs rounded-md"
                      style={{ background: c.viability.bg }}>
                      <span className="text-body-sm font-medium" style={{ color: c.viability.color }}>
                        {c.viability.label}
                      </span>
                      <span className="text-body-sm" style={{ color: c.viability.color }}>
                        · margem {c.viability.margin.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-md">
                    <p className="caption text-ag-muted">
                      {c.candidates_count} candidato{c.candidates_count !== 1 ? 's' : ''}
                      {c.duration_months ? ` · ${c.duration_months} meses` : ''}
                    </p>
                    {c.myStatus ? (
                      <span className="px-md py-sm rounded-md text-body-sm font-medium"
                        style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                        ✓ Candidatura {c.myStatus}
                      </span>
                    ) : (
                      <CandidatarButton contractId={c.id} profileId={profile.id} />
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
