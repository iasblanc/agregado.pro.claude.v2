export const dynamic = 'force-dynamic'

import type { Metadata }    from 'next'
import Link                  from 'next/link'
import { redirect }          from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }            from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }            from '@/components/ui/button'
import { DreDeleteButton }   from './DreDeleteButton'
import { DreChart }          from './DreChart'
import { formatBRL, getCurrentPeriod, formatPeriod, getLastPeriods } from '@/lib/utils'

export const metadata: Metadata = { title: 'DRE' }

interface DreEntry {
  id: string; entry_type: string; category: string; description: string
  amount: number; km_reference?: number | null; period: string; created_at: string
}

function calcDRE(entries: DreEntry[]) {
  const r = entries.reduce((acc, e) => {
    const v = Number(e.amount)
    if (e.entry_type === 'receita')        { acc.receita += v; acc.km += Number(e.km_reference ?? 0) }
    if (e.entry_type === 'custo_fixo')     acc.fixo    += v
    if (e.entry_type === 'custo_variavel') acc.variavel += v
    if (e.entry_type === 'pessoal')        acc.pessoal  += v
    return acc
  }, { receita: 0, fixo: 0, variavel: 0, pessoal: 0, km: 0 })
  const custo     = r.fixo + r.variavel + r.pessoal
  const resultado = r.receita - custo
  const margem    = r.receita > 0 ? (resultado / r.receita) * 100 : null
  const custoKm   = r.km > 0 ? custo / r.km : null
  return { ...r, custo, resultado, margem, custoKm }
}

const TIPO_LABELS: Record<string, string> = {
  receita:        '💵 Receita',
  custo_fixo:     '📌 Custo Fixo',
  custo_variavel: '🔄 Custo Variável',
  pessoal:        '👤 Pessoal',
}

export default async function DrePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const params    = await searchParams
  const period    = params.period ?? getCurrentPeriod()
  const periods   = getLastPeriods(12)

  const [{ data: entries }, { data: historyEntries }] = await Promise.all([
    admin.from('dre_entries').select('*').eq('owner_id', profile.id).eq('period', period).order('created_at', { ascending: false }),
    admin.from('dre_entries').select('period, entry_type, amount').eq('owner_id', profile.id).order('period', { ascending: false }).limit(300),
  ])

  const allEntries = (entries ?? []) as DreEntry[]
  const dre = calcDRE(allEntries)

  // Agrupar por tipo
  const groups = ['receita', 'custo_variavel', 'custo_fixo', 'pessoal']

  return (
    <div className="flex flex-col h-full">
      <Header title="DRE" subtitle={`Demonstrativo — ${formatPeriod(period)}`} />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto">

        {/* Seletor de período */}
        <div className="flex gap-sm overflow-x-auto pb-sm">
          {periods.map(p => (
            <Link key={p} href={`/dre?period=${p}`}>
              <span
                className="px-md py-sm rounded-pill text-body-sm font-medium whitespace-nowrap border transition-all"
                style={{
                  background:  p === period ? 'var(--color-accent)' : 'transparent',
                  borderColor: p === period ? 'var(--color-accent)' : 'var(--color-border)',
                  color:       p === period ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
                }}
              >
                {formatPeriod(p)}
              </span>
            </Link>
          ))}
        </div>

        {/* Resumo do DRE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {[
            { label: 'Receita',   val: dre.receita,   color: 'var(--color-success)' },
            { label: 'Custo Total', val: dre.custo,   color: 'var(--color-danger)' },
            { label: 'Resultado', val: dre.resultado, color: dre.resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
            { label: 'Custo/km',  val: dre.custoKm,  suffix: '/km', color: 'var(--color-text-primary)' },
          ].map(c => (
            <Card key={c.label} elevated={c.label === 'Resultado'}>
              <CardBody>
                <p className="caption mb-xs">{c.label}</p>
                <p className="font-display text-[20px] font-medium" style={{ color: c.color }}>
                  {c.val !== null ? formatBRL(c.val) + (c.suffix ?? '') : '—'}
                </p>
                {c.label === 'Resultado' && dre.margem !== null && (
                  <p className="caption mt-xs" style={{ color: c.color }}>
                    Margem: {dre.margem.toFixed(1)}%
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>


        {/* Gráfico de evolução */}
        {(() => {
          const byP: Record<string, { receita: number; custo: number }> = {}
          for (const e of (historyEntries ?? [])) {
            if (!byP[e.period]) byP[e.period] = { receita: 0, custo: 0 }
            if (e.entry_type === 'receita') byP[e.period].receita += Number(e.amount)
            else byP[e.period].custo += Number(e.amount)
          }
          const chartData = Object.entries(byP)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([p, v]) => ({ period: p, label: p, receita: v.receita, custo: v.custo, resultado: v.receita - v.custo }))
          if (chartData.length < 2) return null
          return (
            <Card>
              <CardHeader label={`Evolução ${chartData.length} meses`} />
              <CardBody><DreChart data={chartData} /></CardBody>
            </Card>
          )
        })()}

        {/* Botão novo lançamento */}
        <Link href={`/gestao/lancamento?period=${period}`}>
          <Button fullWidth>+ Novo lançamento em {formatPeriod(period)}</Button>
        </Link>

        {/* Lançamentos por grupo */}
        {allEntries.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-body text-ag-secondary text-center py-xl">
                Nenhum lançamento em {formatPeriod(period)}.
              </p>
            </CardBody>
          </Card>
        ) : (
          groups.map(tipo => {
            const itens = allEntries.filter(e => e.entry_type === tipo)
            if (itens.length === 0) return null
            const total = itens.reduce((s, e) => s + Number(e.amount), 0)
            return (
              <Card key={tipo}>
                <CardHeader label={TIPO_LABELS[tipo]}>
                  <span className="text-body-sm font-medium text-ag-primary">{formatBRL(total)}</span>
                </CardHeader>
                <CardBody>
                  <div className="divide-y divide-ag-border">
                    {itens.map(e => (
                      <div key={e.id} className="flex items-center justify-between py-sm gap-md">
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-ag-primary truncate">{e.description}</p>
                          <p className="caption text-ag-muted">{e.category}{e.km_reference ? ` · ${Number(e.km_reference).toLocaleString('pt-BR')} km` : ''}</p>
                        </div>
                        <div className="flex items-center gap-sm shrink-0">
                          <span className="text-body-sm font-medium text-ag-primary">{formatBRL(Number(e.amount))}</span>
                          <DreDeleteButton entryId={e.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )
          })
        )}
      </main>
    </div>
  )
}
