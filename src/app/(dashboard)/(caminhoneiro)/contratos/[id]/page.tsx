export const dynamic = 'force-dynamic'

import type { Metadata }          from 'next'
import { notFound, redirect }       from 'next/navigation'
import Link                         from 'next/link'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { Header }                   from '@/components/layout/Header'
import { Button }                   from '@/components/ui/button'
import { Badge }                    from '@/components/ui/badge'
import { ViabilityBadge }           from '@/components/financial/ViabilityBadge'
import { MargemIndicator }          from '@/components/financial/MargemIndicator'
import { getContractById }          from '@/services/contracts'
import { analyzeContractViability } from '@/services/contracts/viability'
import { calculateDre }             from '@/services/dre/calculator'
import { getCurrentPeriod, formatBRL, formatKm, formatDate } from '@/lib/utils'
import { CandidaturaForm }          from './CandidaturaForm'
import type { DreEntry }            from '@/types/database.types'

export const metadata: Metadata = { title: 'Detalhes do Contrato' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContractDetailPage({ params }: Props) {
  const { id }   = await params
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return null  // layout já redireciona

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/login')

  const contract = await getContractById(id)
  if (!contract) notFound()

  // Custo/km real do usuário
  const { data: dreEntries } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('period', getCurrentPeriod())

  const dre = calculateDre((dreEntries ?? []) as DreEntry[], getCurrentPeriod())
  const analysis = analyzeContractViability(contract as any, dre.custoPerKm)

  // Verificar se já candidatou
  const { data: existingCand } = await supabase
    .from('candidatures')
    .select('id, status')
    .eq('contract_id', id)
    .eq('candidate_id', profile.id)
    .maybeSingle()

  return (
    <div className="flex flex-col h-full">
      <Header title="Detalhes do Contrato" />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-2xl mx-auto space-y-xl">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-sm text-body-sm text-ag-muted">
            <Link href="/contratos" className="hover:text-ag-primary transition-colors">
              Contratos
            </Link>
            <span>›</span>
            <span className="text-ag-primary truncate">{contract.title}</span>
          </nav>

          {/* Cabeçalho do contrato */}
          <div className="space-y-md">
            <div className="flex items-start gap-md flex-wrap">
              <h1 className="font-display text-display-md font-medium text-ag-primary flex-1">
                {contract.title}
              </h1>
              <ViabilityBadge viability={analysis.viability} size="md" />
            </div>

            <div className="flex flex-wrap gap-sm">
              <Badge variant="default">{contract.vehicle_type}</Badge>
              {contract.equipment_type && (
                <Badge variant="muted">{contract.equipment_type}</Badge>
              )}
              {contract.duration_months && (
                <Badge variant="muted" dot>
                  {contract.duration_months} {contract.duration_months === 1 ? 'mês' : 'meses'}
                </Badge>
              )}
            </div>
          </div>

          {/* Dados da rota */}
          <section className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-md shadow-sm">
            <h2 className="font-display text-display-sm font-medium text-ag-primary">
              Rota e valores
            </h2>
            <div className="grid grid-cols-2 gap-md">
              <InfoBlock label="Origem"      value={contract.route_origin} />
              <InfoBlock label="Destino"     value={contract.route_destination} />
              <InfoBlock label="Distância"   value={formatKm(Number(contract.route_km))} />
              <InfoBlock label="Valor"
                value={formatBRL(Number(contract.contract_value))}
                emphasis
              />
              {contract.start_date && (
                <InfoBlock label="Início" value={formatDate(contract.start_date)} />
              )}
              {contract.duration_months && (
                <InfoBlock
                  label="Duração"
                  value={`${contract.duration_months} ${contract.duration_months === 1 ? 'mês' : 'meses'}`}
                />
              )}
            </div>
          </section>

          {/* Análise financeira — o coração do produto */}
          <section className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-lg shadow-sm">
            <h2 className="font-display text-display-sm font-medium text-ag-primary">
              Análise financeira
            </h2>

            <MargemIndicator
              margem={analysis.margin}
              resultado={analysis.estimatedProfit}
              size="lg"
            />

            <div className="grid grid-cols-3 gap-sm">
              <InfoBlock label="Seu custo/km"  value={analysis.displayData.custoKmUsuario} />
              <InfoBlock label="Custo estimado" value={analysis.displayData.custoEstimado} />
              <InfoBlock
                label={analysis.estimatedProfit >= 0 ? 'Lucro estimado' : 'Prejuízo estimado'}
                value={analysis.displayData.lucroEstimado}
                emphasis
                danger={analysis.estimatedProfit < 0}
              />
            </div>

            <p className="text-body-sm text-ag-secondary p-md rounded-md bg-ag-bg border border-ag-border">
              {analysis.recomendacao}
            </p>

            {analysis.breakEvenKm > 0 && (
              <p className="caption text-ag-muted text-center">
                {analysis.displayData.breakEvenLabel}
              </p>
            )}
          </section>

          {/* Descrição */}
          {contract.description && (
            <section className="bg-ag-surface border border-ag-border rounded-xl p-lg shadow-sm">
              <h2 className="font-display text-display-sm font-medium text-ag-primary mb-md">
                Sobre o contrato
              </h2>
              <p className="text-body text-ag-secondary whitespace-pre-wrap">
                {contract.description}
              </p>
            </section>
          )}

          {/* Candidatura */}
          <section className="bg-ag-surface border border-ag-border rounded-xl p-lg shadow-sm">
            <h2 className="font-display text-display-sm font-medium text-ag-primary mb-md">
              Candidatura
            </h2>
            <CandidaturaForm
              contractId={id}
              existingCandidature={existingCand ?? null}
              userCostPerKm={dre.custoPerKm}
              viability={analysis.viability}
            />
          </section>

          <p className="text-center caption text-ag-muted">
            Os dados de contato da transportadora são liberados apenas após o fechamento bilateral.
          </p>
        </div>
      </main>
    </div>
  )
}

// ─── InfoBlock ────────────────────────────────────────────────────

function InfoBlock({
  label, value, emphasis = false, danger = false,
}: {
  label:     string
  value:     string
  emphasis?: boolean
  danger?:   boolean
}) {
  return (
    <div>
      <p className="caption">{label}</p>
      <p
        className={emphasis ? 'font-display text-[22px] font-medium leading-tight' : 'text-body font-medium text-ag-primary'}
        style={
          danger    ? { color: 'var(--color-danger)' } :
          emphasis  ? { color: 'var(--color-success)' } :
          undefined
        }
      >
        {value}
      </p>
    </div>
  )
}
