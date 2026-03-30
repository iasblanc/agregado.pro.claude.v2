export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }        from '@/components/ui/button'
import { formatBRL, getCurrentPeriod, formatPeriod, getLastPeriods } from '@/lib/utils'

export const metadata: Metadata = { title: 'Gestão' }

function calcDRE(entries: Array<{ entry_type: string; amount: number; km_reference?: number | null }>) {
  const receita   = entries.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.amount), 0)
  const custoFixo = entries.filter(e => e.entry_type === 'custo_fixo').reduce((s, e) => s + Number(e.amount), 0)
  const custoVar  = entries.filter(e => e.entry_type === 'custo_variavel').reduce((s, e) => s + Number(e.amount), 0)
  const pessoal   = entries.filter(e => e.entry_type === 'pessoal').reduce((s, e) => s + Number(e.amount), 0)
  const totalCusto = custoFixo + custoVar + pessoal
  const resultado  = receita - totalCusto
  const kmTotal    = entries.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
  const custoKm    = kmTotal > 0 ? totalCusto / kmTotal : null
  const margem     = receita > 0 ? (resultado / receita) * 100 : null
  return { receita, custoFixo, custoVar, pessoal, totalCusto, resultado, kmTotal, custoKm, margem }
}

export default async function GestaoPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role, full_name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const period      = getCurrentPeriod()
  const prevPeriod  = getLastPeriods(2)[1] ?? null
  const periodLabel = formatPeriod(period)

  // Buscar lançamentos do mês atual e anterior
  const [{ data: entries }, { data: entriesAnterior }, { data: vehicles }] = await Promise.all([
    admin.from('dre_entries').select('*').eq('owner_id', profile.id).eq('period', period),
    prevPeriod
      ? admin.from('dre_entries').select('*').eq('owner_id', profile.id).eq('period', prevPeriod)
      : Promise.resolve({ data: [] as never[] }),
    admin.from('vehicles').select('id, brand, model, plate').eq('owner_id', profile.id).eq('is_active', true),
  ])

  const dre     = calcDRE(entries ?? [])
  const dreAnt  = calcDRE(entriesAnterior ?? [])
  const hasData = (entries?.length ?? 0) > 0
  const nome    = profile.full_name.split(' ')[0]

  // Status do resultado
  const statusColor = !hasData ? 'var(--color-text-muted)'
    : dre.resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
  const statusText = !hasData ? '—'
    : dre.resultado >= 0 ? '✅ No positivo' : '❌ No negativo'

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Olá, ${nome}`}
        subtitle={`Resumo de ${periodLabel}`}
      />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto">

        {/* Cards principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {/* Receita */}
          <Card>
            <CardBody>
              <p className="caption mb-xs">Receita</p>
              <p className="font-display text-display-sm font-medium text-ag-primary">
                {formatBRL(dre.receita)}
              </p>
              {prevPeriod && dreAnt.receita > 0 && (
                <p className="caption mt-xs" style={{ color: dre.receita >= dreAnt.receita ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {dre.receita >= dreAnt.receita ? '▲' : '▼'} vs mês anterior
                </p>
              )}
            </CardBody>
          </Card>

          {/* Custo total */}
          <Card>
            <CardBody>
              <p className="caption mb-xs">Custo Total</p>
              <p className="font-display text-display-sm font-medium text-ag-primary">
                {formatBRL(dre.totalCusto)}
              </p>
              <p className="caption mt-xs text-ag-muted">
                {hasData ? `Fixo: ${formatBRL(dre.custoFixo)}` : '—'}
              </p>
            </CardBody>
          </Card>

          {/* Custo/km */}
          <Card>
            <CardBody>
              <p className="caption mb-xs">Custo/km</p>
              <p className="font-display text-display-sm font-medium text-ag-primary">
                {dre.custoKm ? formatBRL(dre.custoKm) : '—'}
              </p>
              <p className="caption mt-xs text-ag-muted">
                {dre.kmTotal > 0 ? `${dre.kmTotal.toLocaleString('pt-BR')} km` : 'Lance km rodados'}
              </p>
            </CardBody>
          </Card>

          {/* Resultado */}
          <Card elevated>
            <CardBody>
              <p className="caption mb-xs">Resultado</p>
              <p className="font-display text-display-sm font-medium" style={{ color: statusColor }}>
                {hasData ? formatBRL(dre.resultado) : '—'}
              </p>
              <p className="caption mt-xs" style={{ color: statusColor }}>
                {statusText}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Detalhamento de custos */}
        {hasData && (
          <Card>
            <CardHeader label="Composição dos custos" />
            <CardBody>
              <div className="space-y-sm">
                {[
                  { label: 'Custos Fixos',    value: dre.custoFixo,  pct: dre.totalCusto > 0 ? (dre.custoFixo / dre.totalCusto) * 100 : 0 },
                  { label: 'Custos Variáveis', value: dre.custoVar,   pct: dre.totalCusto > 0 ? (dre.custoVar  / dre.totalCusto) * 100 : 0 },
                  { label: 'Pessoal',          value: dre.pessoal,    pct: dre.totalCusto > 0 ? (dre.pessoal   / dre.totalCusto) * 100 : 0 },
                ].filter(c => c.value > 0).map(c => (
                  <div key={c.label} className="flex items-center gap-md">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-xs">
                        <span className="text-body-sm text-ag-secondary">{c.label}</span>
                        <span className="text-body-sm font-medium text-ag-primary">{formatBRL(c.value)}</span>
                      </div>
                      <div className="h-1 bg-ag-border rounded-full overflow-hidden">
                        <div className="h-full bg-ag-accent rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {dre.margem !== null && (
                  <p className="text-body-sm text-ag-secondary pt-sm border-t border-ag-border">
                    Margem operacional: <strong style={{ color: dre.margem >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{dre.margem.toFixed(1)}%</strong>
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Checklist de onboarding */}
        {!hasData && (() => {
          const hasVehicle = vehicles && vehicles.length > 0
          const steps = [
            { label: 'Cadastrar meu caminhão',    href: '/gestao/veiculos',    done: hasVehicle },
            { label: 'Registrar primeira receita', href: '/gestao/lancamento?type=receita',  done: false },
            { label: 'Registrar custos do mês',    href: '/gestao/lancamento?type=custo_fixo', done: false },
            { label: 'Ver meu DRE completo',       href: '/dre', done: false },
          ]
          const done = steps.filter(s => s.done).length
          return (
            <Card>
              <CardHeader label={`Primeiros passos (${done}/${steps.length})`} />
              <CardBody>
                <div className="h-1.5 rounded-full mb-lg overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(done / steps.length) * 100}%`, background: 'var(--color-success)' }} />
                </div>
                <div className="space-y-sm">
                  {steps.map((step, i) => (
                    <a key={i} href={step.href} className="flex items-center gap-md py-sm border-b border-ag-border last:border-0 group">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0"
                        style={{ background: step.done ? 'var(--color-success)' : 'var(--color-surface)', color: step.done ? '#fff' : 'var(--color-text-muted)' }}>
                        {step.done ? '✓' : i + 1}
                      </span>
                      <span className="text-body-sm text-ag-primary group-hover:underline flex-1"
                        style={{ textDecoration: step.done ? 'line-through' : 'none', opacity: step.done ? 0.5 : 1 }}>
                        {step.label}
                      </span>
                      {!step.done && <span className="caption text-ag-muted shrink-0">→</span>}
                    </a>
                  ))}
                </div>
              </CardBody>
            </Card>
          )
        })()}

        {/* Primeiros passos — sem dados */}
        {!hasData && (
          <Card>
            <CardHeader label="Comece agora" />
            <CardBody>
              <p className="text-body text-ag-secondary mb-lg">
                Lance receitas e custos para descobrir se seu caminhão está dando lucro.
              </p>
              <div className="space-y-sm mb-xl">
                {[
                  '1. Lance sua receita (valor do frete + km rodados)',
                  '2. Lance custos fixos (parcela, seguro, licenciamento)',
                  '3. Lance custos variáveis (diesel, pedágio, manutenção)',
                  '4. Veja automaticamente se está no lucro ou prejuízo',
                ].map(s => (
                  <p key={s} className="text-body-sm text-ag-secondary flex items-start gap-sm">
                    <span style={{ color: 'var(--color-success)' }} className="font-medium shrink-0">→</span>
                    {s}
                  </p>
                ))}
              </div>
              <Link href="/gestao/lancamento">
                <Button size="lg" fullWidth>Fazer primeiro lançamento</Button>
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Ações rápidas */}
        {hasData && (
          <div className="grid grid-cols-2 gap-md">
            <Link href="/gestao/lancamento">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardBody>
                  <p className="text-[24px] mb-sm">➕</p>
                  <p className="text-body-sm font-medium text-ag-primary">Novo lançamento</p>
                  <p className="caption text-ag-muted mt-xs">Receita ou custo</p>
                </CardBody>
              </Card>
            </Link>
            <Link href="/dre">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardBody>
                  <p className="text-[24px] mb-sm">📊</p>
                  <p className="text-body-sm font-medium text-ag-primary">Ver DRE completo</p>
                  <p className="caption text-ag-muted mt-xs">Demonstrativo detalhado</p>
                </CardBody>
              </Card>
            </Link>
            <Link href="/gestao/veiculos">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardBody>
                  <p className="text-[24px] mb-sm">🚛</p>
                  <p className="text-body-sm font-medium text-ag-primary">Meu caminhão</p>
                  <p className="caption text-ag-muted mt-xs">
                    {vehicles && vehicles.length > 0 ? `${vehicles.length} veículo(s)` : 'Cadastrar veículo'}
                  </p>
                </CardBody>
              </Card>
            </Link>
            <Link href="/contratos">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardBody>
                  <p className="text-[24px] mb-sm">📋</p>
                  <p className="text-body-sm font-medium text-ag-primary">Contratos</p>
                  <p className="caption text-ag-muted mt-xs">Ver vagas disponíveis</p>
                </CardBody>
              </Card>
            </Link>
            <Link href="/gestao/calculadora">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardBody>
                  <p className="text-[24px] mb-sm">🧮</p>
                  <p className="text-body-sm font-medium text-ag-primary">Calculadora</p>
                  <p className="caption text-ag-muted mt-xs">Calcular custo/km</p>
                </CardBody>
              </Card>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
