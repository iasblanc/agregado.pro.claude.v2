export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardBody } from '@/components/ui/card'
import { formatBRL, getLastPeriods, formatPeriod } from '@/lib/utils'

export const metadata: Metadata = { title: 'Visão Anual' }

export default async function AnualPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const periods = getLastPeriods(12)

  const { data: entries } = await admin.from('dre_entries')
    .select('period, entry_type, amount, km_reference')
    .eq('owner_id', profile.id)
    .in('period', periods)

  // Calcular resumo por período
  const summary = periods.map(period => {
    const pe       = (entries ?? []).filter(e => e.period === period)
    const receita  = pe.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const custo    = pe.filter(e => e.entry_type !== 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const km       = pe.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
    const resultado = receita - custo
    const margem   = receita > 0 ? (resultado / receita) * 100 : null
    const custoKm  = km > 0 ? custo / km : null
    return { period, receita, custo, resultado, margem, custoKm, km, hasData: pe.length > 0 }
  })

  const withData  = summary.filter(s => s.hasData)
  const totalReceita  = withData.reduce((s, m) => s + m.receita, 0)
  const totalCusto    = withData.reduce((s, m) => s + m.custo, 0)
  const totalResultado = totalReceita - totalCusto
  const margemMedia   = totalReceita > 0 ? (totalResultado / totalReceita) * 100 : null
  const mesesPositivos = withData.filter(m => m.resultado > 0).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-lg py-md bg-ag-bg border-b border-ag-border md:px-xl">
        <div>
          <p className="overline">Últimos 12 meses</p>
          <h1 className="font-display text-display-sm font-medium text-ag-primary">Visão Anual</h1>
        </div>
        <a href="/api/dre/export" download
          className="text-body-sm text-ag-secondary hover:text-ag-primary border border-ag-border px-md py-sm rounded-pill transition-colors">
          ⬇ Exportar tudo
        </a>
      </div>

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto">

        {/* Totais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {[
            { label: 'Receita 12m',   val: formatBRL(totalReceita),   color: 'var(--color-success)' },
            { label: 'Resultado 12m',  val: formatBRL(totalResultado), color: totalResultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
            { label: 'Margem média',   val: margemMedia !== null ? `${margemMedia.toFixed(1)}%` : '—', color: 'var(--color-text-primary)' },
            { label: 'Meses positivos', val: `${mesesPositivos}/${withData.length}`, color: mesesPositivos === withData.length ? 'var(--color-success)' : 'var(--color-warning)' },
          ].map(s => (
            <Card key={s.label}>
              <CardBody>
                <p className="caption text-ag-muted mb-xs">{s.label}</p>
                <p className="text-body font-medium" style={{ color: s.color }}>{s.val}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Tabela mensal */}
        <Card>
          <CardBody>
            {/* Header da tabela */}
            <div className="grid gap-md mb-md" style={{ gridTemplateColumns: '120px 1fr 1fr 1fr 80px 72px' }}>
              {['Período', 'Receita', 'Custo', 'Resultado', 'Margem', ''].map(h => (
                <p key={h} className="caption text-ag-muted font-medium">{h}</p>
              ))}
            </div>

            {/* Linhas */}
            <div className="divide-y divide-ag-border">
              {summary.map(m => (
                <div key={m.period}
                  className="grid gap-md py-sm items-center"
                  style={{ gridTemplateColumns: '120px 1fr 1fr 1fr 80px 72px', opacity: m.hasData ? 1 : 0.4 }}>
                  <p className="text-body-sm font-medium text-ag-primary">{formatPeriod(m.period)}</p>
                  <p className="text-body-sm" style={{ color: 'var(--color-success)' }}>
                    {m.hasData ? formatBRL(m.receita) : '—'}
                  </p>
                  <p className="text-body-sm text-ag-secondary">
                    {m.hasData ? formatBRL(m.custo) : '—'}
                  </p>
                  <p className="text-body-sm font-medium"
                    style={{ color: !m.hasData ? 'var(--color-text-muted)' : m.resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {m.hasData ? formatBRL(m.resultado) : '—'}
                  </p>
                  <p className="text-body-sm"
                    style={{ color: m.margem === null ? 'var(--color-text-muted)' : m.margem >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {m.margem !== null ? `${m.margem.toFixed(1)}%` : '—'}
                  </p>
                  {m.hasData ? (
                    <Link href={`/gestao/relatorio?period=${m.period}`}
                      className="caption text-ag-muted hover:text-ag-primary transition-colors">
                      Ver →
                    </Link>
                  ) : <span />}
                </div>
              ))}
            </div>

            {/* Mini chart */}
            {withData.length > 1 && (
              <div className="mt-xl pt-lg border-t border-ag-border">
                <p className="caption text-ag-muted mb-md">Resultado mensal</p>
                <div className="flex items-end gap-xs" style={{ height: 64 }}>
                  {summary.map(m => {
                    const allVals = summary.filter(s => s.hasData).map(s => Math.abs(s.resultado))
                    const maxVal  = Math.max(...allVals, 1)
                    const h       = m.hasData ? Math.max((Math.abs(m.resultado) / maxVal) * 56, 4) : 4
                    return (
                      <div key={m.period} className="flex-1 flex flex-col items-center gap-xs">
                        <div style={{
                          width: '100%', height: h,
                          background: !m.hasData ? 'var(--color-border)' : m.resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          borderRadius: 3, opacity: m.hasData ? 0.8 : 0.3,
                        }} />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-xs">
                  <span className="caption text-ag-muted">{formatPeriod(summary[summary.length-1]?.period ?? '')}</span>
                  <span className="caption text-ag-muted">{formatPeriod(summary[0]?.period ?? '')}</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Zero state */}
        {withData.length === 0 && (
          <div className="text-center py-xl space-y-md">
            <p className="text-[48px]">📊</p>
            <p className="text-body text-ag-secondary">Nenhum lançamento nos últimos 12 meses.</p>
            <Link href="/gestao/lancamento">
              <div className="inline-flex items-center gap-sm px-lg py-md rounded-pill text-body-sm font-medium"
                style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}>
                + Fazer primeiro lançamento
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
