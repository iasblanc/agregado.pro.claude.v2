import type { Metadata }    from 'next'
import Link                  from 'next/link'
import { redirect }          from 'next/navigation'
import { createClient, getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }            from '@/components/layout/Header'
import { DreCard }           from '@/components/financial/DreCard'
import { CustoKmWidget }     from '@/components/financial/CustoKmWidget'
import { MargemIndicator }   from '@/components/financial/MargemIndicator'
import { Button }            from '@/components/ui/button'
import { calculateDre }      from '@/services/dre/calculator'
import {
  getCurrentPeriod,
  formatPeriod,
  getLastPeriods,
} from '@/lib/utils'
import type { DreEntry }     from '@/types/database.types'

export const metadata: Metadata = { title: 'DRE' }

// Revalidar a cada 60 segundos
export const dynamic = 'force-dynamic'

// ─── Props ────────────────────────────────────────────────────────

interface DrePageProps {
  searchParams: Promise<{ period?: string; vehicle?: string }>
}

// ─── Página ───────────────────────────────────────────────────────

export default async function DrePage({ searchParams }: DrePageProps) {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return null  // layout já redireciona
  const admin = createAdminClient()

  const params   = await searchParams

  // Guard
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/contratos')

  // Período selecionado (padrão: mês atual)
  const period        = params.period ?? getCurrentPeriod()
  const lastPeriods   = getLastPeriods(12)
  const periodLabel   = formatPeriod(period)

  // Buscar lançamentos do período atual e anterior
  const prevPeriod = getLastPeriods(2)[1] ?? null

  const [resAtual, resAnterior] = await Promise.all([
    supabase
      .from('dre_entries')
      .select('*')
      .eq('period', period)
      .order('created_at', { ascending: false }),
    prevPeriod
      ? supabase
          .from('dre_entries')
          .select('*')
          .eq('period', prevPeriod)
      : Promise.resolve({ data: [] as DreEntry[], error: null }),
  ])

  const entries        = resAtual.data    ?? []
  const entriesAnterior = resAnterior.data ?? []

  const dre       = calculateDre(entries,        period)
  const dreAnterior = prevPeriod ? calculateDre(entriesAnterior, prevPeriod) : null

  const hasData = entries.length > 0

  return (
    <div className="flex flex-col h-full">
      <Header title="DRE" subtitle={`Demonstrativo de Resultado — ${periodLabel}`} />

      <main className="flex-1 px-lg py-xl md:px-xl max-w-3xl mx-auto w-full space-y-xl">

        {/* Seletor de período */}
        <div className="flex items-center justify-between gap-md flex-wrap">
          <div>
            <p className="overline">Período</p>
            <h1 className="font-display text-display-sm font-medium text-ag-primary">
              {periodLabel}
            </h1>
          </div>

          <div className="flex items-center gap-sm">
            <select
              defaultValue={period}
              onChange={(e) => {
                // Client navigation via form/link
                window.location.href = `/dre?period=${e.target.value}`
              }}
              className="text-body-sm bg-ag-surface border border-ag-border rounded-md px-md py-sm text-ag-primary focus:outline-none focus:border-ag-accent"
              aria-label="Selecionar período"
            >
              {lastPeriods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p)}
                </option>
              ))}
            </select>

            <Link href="/gestao/lancamento">
              <Button size="sm">+ Lançamento</Button>
            </Link>
          </div>
        </div>

        {hasData ? (
          <>
            {/* Indicador de margem */}
            <MargemIndicator
              margem={dre.margemOperacional}
              resultado={dre.resultadoOperacional}
              size="lg"
            />

            {/* Grid: DRE + Custo/km */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-xl items-start">
              {/* DRE detalhado */}
              <DreCard dre={dre} />

              {/* Custo por km */}
              <CustoKmWidget
                custoPerKm={dre.custoPerKm}
                kmTotal={dre.kmTotal}
                totalCusto={dre.totalCusto}
                custoAnterior={dreAnterior?.custoPerKm}
              />
            </div>

            {/* Tabela de lançamentos */}
            <EntriesTable entries={entries} />
          </>
        ) : (
          <EmptyState period={periodLabel} />
        )}
      </main>
    </div>
  )
}

// ─── Tabela de lançamentos ────────────────────────────────────────

function EntriesTable({ entries }: { entries: DreEntry[] }) {
  const typeLabel: Record<string, string> = {
    receita:        '📥 Receita',
    custo_fixo:     '📌 Fixo',
    custo_variavel: '⛽ Variável',
  }

  return (
    <section aria-label="Lançamentos do período">
      <h2 className="font-display text-display-sm font-medium text-ag-primary mb-lg">
        Lançamentos
      </h2>

      <div className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
        {/* Header da tabela */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-md px-lg py-sm bg-ag-bg border-b border-ag-border">
          <span className="caption font-medium">Descrição</span>
          <span className="caption font-medium">Tipo</span>
          <span className="caption font-medium text-right">Valor</span>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-ag-border">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[1fr_auto_auto] gap-md px-lg py-md hover:bg-ag-overlay transition-colors"
            >
              <div className="min-w-0">
                <p className="text-body-sm text-ag-primary truncate">{entry.description}</p>
                {entry.km_reference && (
                  <p className="caption text-ag-muted">
                    {Number(entry.km_reference).toLocaleString('pt-BR')} km
                  </p>
                )}
              </div>
              <span className="caption whitespace-nowrap self-center">
                {typeLabel[entry.entry_type] ?? entry.entry_type}
              </span>
              <span
                className="text-body-sm font-medium self-center text-right whitespace-nowrap"
                style={{
                  color: entry.entry_type === 'receita'
                    ? 'var(--color-success)'
                    : 'var(--color-danger)',
                }}
              >
                {entry.entry_type === 'receita' ? '+' : '-'}
                {Number(entry.amount).toLocaleString('pt-BR', {
                  style:    'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Estado vazio ─────────────────────────────────────────────────

function EmptyState({ period }: { period: string }) {
  return (
    <div className="text-center py-[var(--space-4xl)] space-y-xl">
      <div className="text-[56px]" aria-hidden="true">📊</div>
      <div className="space-y-md max-w-sm mx-auto">
        <h2 className="font-display text-display-sm font-medium text-ag-primary">
          Sem lançamentos em {period}
        </h2>
        <p className="text-body text-ag-secondary">
          Registre suas receitas e custos para ver o DRE e saber se seu caminhão está dando lucro.
        </p>
      </div>
      <Link href="/gestao/lancamento">
        <Button size="lg">
          Registrar primeiro lançamento
        </Button>
      </Link>
    </div>
  )
}


