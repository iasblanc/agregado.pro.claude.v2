export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { formatBRL, getCurrentPeriod, formatPeriod, getLastPeriods } from '@/lib/utils'

export const metadata: Metadata = { title: 'Relatório Mensal' }


// Componente DonutChart — SVG puro
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (total === 0) return null
  const R = 60, cx = 80, cy = 80, innerR = 36
  let cumAngle = -Math.PI / 2
  const paths = slices.map(sl => {
    const angle = (sl.value / total) * 2 * Math.PI
    const x1 = cx + R * Math.cos(cumAngle)
    const y1 = cy + R * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + R * Math.cos(cumAngle)
    const y2 = cy + R * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    const xi1 = cx + innerR * Math.cos(cumAngle - angle)
    const yi1 = cy + innerR * Math.sin(cumAngle - angle)
    const xi2 = cx + innerR * Math.cos(cumAngle)
    const yi2 = cy + innerR * Math.sin(cumAngle)
    return { d: `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi2.toFixed(1)},${yi2.toFixed(1)} A${innerR},${innerR} 0 ${large},0 ${xi1.toFixed(1)},${yi1.toFixed(1)} Z`, color: sl.color, label: sl.label, value: sl.value }
  })
  const COLORS = ['#DC2626','#D97706','#7C3AED','#2563EB','#059669','#EC4899','#0891B2','#65A30D']
  const coloredSlices = slices.map((sl, i) => ({ ...sl, color: COLORS[i % COLORS.length] }))
  let cumAngle2 = -Math.PI / 2
  const paths2 = coloredSlices.map(sl => {
    const angle = (sl.value / total) * 2 * Math.PI
    const x1 = cx + R * Math.cos(cumAngle2)
    const y1 = cy + R * Math.sin(cumAngle2)
    cumAngle2 += angle
    const x2 = cx + R * Math.cos(cumAngle2)
    const y2 = cy + R * Math.sin(cumAngle2)
    const large = angle > Math.PI ? 1 : 0
    const xi1 = cx + innerR * Math.cos(cumAngle2 - angle)
    const yi1 = cy + innerR * Math.sin(cumAngle2 - angle)
    const xi2 = cx + innerR * Math.cos(cumAngle2)
    const yi2 = cy + innerR * Math.sin(cumAngle2)
    return { d: `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi2.toFixed(1)},${yi2.toFixed(1)} A${innerR},${innerR} 0 ${large},0 ${xi1.toFixed(1)},${yi1.toFixed(1)} Z`, color: sl.color, label: sl.label, value: sl.value }
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 160 160" style={{ width: 140, height: 140, flexShrink: 0 }}>
        {paths2.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85} />)}
        <circle cx={cx} cy={cy} r={innerR} fill="var(--color-bg)" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {paths2.slice(0, 6).map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', flexShrink: 0 }}>{((p.value/total)*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role, full_name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const params  = await searchParams
  const period  = params.period ?? getCurrentPeriod()
  const periods = getLastPeriods(12)

  // Buscar TODOS os lançamentos do período
  const { data: entries } = await admin.from('dre_entries')
    .select('*').eq('owner_id', profile.id).eq('period', period)
    .order('created_at', { ascending: false })

  const all = entries ?? []

  // Cálculos
  const receita   = all.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.amount), 0)
  const fixo      = all.filter(e => e.entry_type === 'custo_fixo').reduce((s, e) => s + Number(e.amount), 0)
  const variavel  = all.filter(e => e.entry_type === 'custo_variavel').reduce((s, e) => s + Number(e.amount), 0)
  const pessoal   = all.filter(e => e.entry_type === 'pessoal').reduce((s, e) => s + Number(e.amount), 0)
  const totalCusto = fixo + variavel + pessoal
  const resultado  = receita - totalCusto
  const margem     = receita > 0 ? (resultado / receita) * 100 : 0
  const km = all.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
  const custoKm   = km > 0 ? totalCusto / km : null

  // Agrupamento por categoria
  const byCat: Record<string, number> = {}
  for (const e of all.filter(e => e.entry_type !== 'receita')) {
    byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount)
  }
  const catRanking = Object.entries(byCat).sort(([,a],[,b]) => b - a)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-lg py-md bg-ag-bg border-b border-ag-border md:px-xl">
        <div>
          <p className="overline">Relatório</p>
          <h1 className="font-display text-display-sm font-medium text-ag-primary">
            {formatPeriod(period)}
          </h1>
        </div>
        <a href={`/api/dre/export?period=${period}`} download
          className="flex items-center gap-sm px-md py-sm rounded-pill text-body-sm font-medium border border-ag-border text-ag-secondary hover:text-ag-primary transition-colors">
          ⬇ Exportar CSV
        </a>
      </div>

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Seletor de período */}
        <div className="flex gap-sm overflow-x-auto pb-xs">
          {periods.slice(0, 6).map(p => (
            <Link key={p} href={`/gestao/relatorio?period=${p}`}>
              <span className="px-md py-sm rounded-pill text-body-sm font-medium border transition-all whitespace-nowrap cursor-pointer"
                style={{
                  background:  p === period ? 'var(--color-accent)' : 'transparent',
                  borderColor: p === period ? 'var(--color-accent)' : 'var(--color-border)',
                  color:       p === period ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
                }}>
                {formatPeriod(p)}
              </span>
            </Link>
          ))}
        </div>

        {/* DRE resumido */}
        <Card elevated={resultado > 0}>
          <CardHeader label="Demonstrativo de Resultado (DRE)" />
          <CardBody>
            <div className="space-y-sm">
              {/* Receita */}
              <div className="flex justify-between py-sm border-b-2 border-ag-border">
                <span className="text-body font-medium text-ag-primary">Receita Operacional</span>
                <span className="text-body font-medium" style={{ color: 'var(--color-success)' }}>
                  {formatBRL(receita)}
                </span>
              </div>

              {/* Custos */}
              {[
                { label: '(–) Custos Variáveis',  val: variavel },
                { label: '(–) Custos Fixos',       val: fixo },
                { label: '(–) Pessoal',            val: pessoal },
              ].filter(c => c.val > 0).map(c => (
                <div key={c.label} className="flex justify-between py-xs">
                  <span className="text-body-sm text-ag-secondary">{c.label}</span>
                  <span className="text-body-sm text-ag-primary">{formatBRL(c.val)}</span>
                </div>
              ))}

              {/* Total custos */}
              <div className="flex justify-between py-sm border-t border-ag-border">
                <span className="text-body-sm font-medium text-ag-secondary">Total de Custos</span>
                <span className="text-body-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                  ({formatBRL(totalCusto)})
                </span>
              </div>

              {/* Resultado */}
              <div className="flex justify-between py-sm border-t-2 border-ag-border mt-sm">
                <span className="text-body font-medium text-ag-primary">= Resultado Operacional</span>
                <span className="text-body font-medium"
                  style={{ color: resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {resultado >= 0 ? '' : '('}{formatBRL(Math.abs(resultado))}{resultado < 0 ? ')' : ''}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Métricas operacionais */}
        <div className="grid grid-cols-2 gap-md">
          {[
            { label: 'Margem operacional', val: `${margem.toFixed(1)}%`,            color: margem >= 15 ? 'var(--color-success)' : margem >= 0 ? 'var(--color-warning)' : 'var(--color-danger)' },
            { label: 'Custo por km',       val: custoKm ? formatBRL(custoKm) + '/km' : '—', color: 'var(--color-text-primary)' },
            { label: 'Km rodados',         val: km > 0 ? `${km.toLocaleString('pt-BR')} km` : '—', color: 'var(--color-text-primary)' },
            { label: 'Lançamentos',        val: String(all.length),                 color: 'var(--color-text-primary)' },
          ].map(m => (
            <Card key={m.label}>
              <CardBody>
                <p className="caption text-ag-muted mb-xs">{m.label}</p>
                <p className="text-body font-medium" style={{ color: m.color }}>{m.val}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Donut chart de custos */}
        {catRanking.length > 0 && totalCusto > 0 && (
          <Card>
            <CardHeader label="Distribuição de custos" />
            <CardBody>
              <DonutChart slices={catRanking.slice(0, 8).map(([label, value]) => ({ label, value, color: '' }))} />
            </CardBody>
          </Card>
        )}

        {/* Top custos */}
        {catRanking.length > 0 && (
          <Card>
            <CardHeader label="Ranking de custos" />
            <CardBody>
              <div className="space-y-sm">
                {catRanking.slice(0, 8).map(([cat, val]) => (
                  <div key={cat} className="flex items-center gap-md">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-xs">
                        <span className="text-body-sm text-ag-secondary truncate">{cat}</span>
                        <span className="text-body-sm font-medium text-ag-primary shrink-0 ml-md">
                          {formatBRL(val)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--color-surface)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max((val / totalCusto) * 100, 3)}%`, background: 'var(--color-danger)' }} />
                      </div>
                    </div>
                    <span className="caption text-ag-muted shrink-0 w-10 text-right">
                      {totalCusto > 0 ? ((val / totalCusto) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Zero state */}
        {all.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-xl space-y-md">
                <p className="text-[48px]">📊</p>
                <p className="text-body text-ag-secondary">Nenhum lançamento em {formatPeriod(period)}.</p>
                <Link href={`/gestao/lancamento?period=${period}`}>
                  <div className="inline-flex items-center gap-sm px-lg py-md rounded-pill text-body-sm font-medium"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}>
                    + Adicionar lançamentos
                  </div>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
