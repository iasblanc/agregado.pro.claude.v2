import type { Metadata }          from 'next'
import { redirect }                from 'next/navigation'
import { createClient }            from '@/lib/supabase/server'
import { Header }                  from '@/components/layout/Header'
import { ContractCard }            from '@/components/marketplace/ContractCard'
import { getPublishedContracts }   from '@/services/contracts'
import { analyzeContractViability } from '@/services/contracts/viability'
import { calculateDre }            from '@/services/dre/calculator'
import { getCurrentPeriod }        from '@/lib/utils'
import type { DreEntry }           from '@/types/database.types'

export const metadata: Metadata = { title: 'Contratos Disponíveis' }
export const revalidate = 120  // 2 min

export default async function CaminhoneiroContratosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/contratos')

  // Buscar custo/km real do usuário (últimos 3 meses consolidados)
  const { data: dreEntries } = await supabase
    .from('dre_entries')
    .select('*')
    .order('period', { ascending: false })
    .limit(200)

  // Calcular custo/km do período mais recente com dados
  const period    = getCurrentPeriod()
  const dre       = calculateDre((dreEntries ?? []) as DreEntry[], period)
  const userCostPerKm = dre.custoPerKm  // 0 se sem dados

  // Buscar contratos publicados
  const contracts = await getPublishedContracts()

  // Análise de viabilidade para cada contrato
  const contractsWithAnalysis = contracts.map((c) => ({
    contract: c,
    analysis: analyzeContractViability(c, userCostPerKm),
  }))

  // Ordenar: saudáveis primeiro, depois limite, depois abaixo do custo
  const ordered = [...contractsWithAnalysis].sort((a, b) => {
    const order = { saudavel: 0, no_limite: 1, abaixo_custo: 2 }
    return (order[a.analysis.viability] ?? 3) - (order[b.analysis.viability] ?? 3)
  })

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Contratos"
        subtitle={`${contracts.length} ${contracts.length === 1 ? 'vaga disponível' : 'vagas disponíveis'}`}
      />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl">

        {/* Nota de custo/km */}
        {userCostPerKm > 0 ? (
          <div
            className="flex items-center gap-sm px-md py-sm rounded-md text-body-sm"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}
          >
            <span aria-hidden="true">💡</span>
            <span>
              Viabilidade calculada com base no seu custo real de{' '}
              <strong>R$ {userCostPerKm.toFixed(2)}/km</strong> (mês atual).
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-sm px-md py-sm rounded-md text-body-sm"
            style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning)' }}
          >
            <span aria-hidden="true">⚠</span>
            <span>
              Registre seus custos no DRE para ver a viabilidade real de cada contrato.
            </span>
          </div>
        )}

        {/* Lista de contratos */}
        {ordered.length > 0 ? (
          <div className="grid gap-lg sm:grid-cols-2 xl:grid-cols-3">
            {ordered.map(({ contract, analysis }) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                analysis={analysis}
                linkBase="/contratos"
              />
            ))}
          </div>
        ) : (
          <EmptyContracts />
        )}
      </main>
    </div>
  )
}

function EmptyContracts() {
  return (
    <div className="text-center py-[var(--space-4xl)] space-y-xl max-w-sm mx-auto">
      <div className="text-[56px]" aria-hidden="true">📋</div>
      <div className="space-y-md">
        <h2 className="font-display text-display-sm font-medium text-ag-primary">
          Nenhum contrato disponível
        </h2>
        <p className="text-body text-ag-secondary">
          Não há contratos publicados no momento. Volte em breve — transportadoras publicam novas vagas regularmente.
        </p>
      </div>
    </div>
  )
}
