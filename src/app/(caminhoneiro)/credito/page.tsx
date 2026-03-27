import type { Metadata }        from 'next'
import { redirect, notFound }    from 'next/navigation'
import Link                      from 'next/link'
import { Suspense }              from 'react'
import { createClient }          from '@/lib/supabase/server'
import { Header }                from '@/components/layout/Header'
import { Badge }                 from '@/components/ui/badge'
import { Button }                from '@/components/ui/button'
import { CreditCardVisual }      from '@/components/credit/CreditCardVisual'
import { LimitWidget }           from '@/components/credit/LimitWidget'
import { ScoreGauge }            from '@/components/credit/ScoreGauge'
import { getCurrentCard }        from '@/services/credit/credit-card'
import { getCurrentScore }       from '@/services/credit'
import { calculateCardLimit }    from '@/services/credit/limit-calculator'
import { calculateDre }          from '@/services/dre/calculator'
import { getCurrentPeriod, getLastPeriods, formatBRL, formatDate } from '@/lib/utils'
import type { DreEntry }         from '@/types/database.types'

export const metadata: Metadata = { title: 'Crédito' }
export const dynamic = 'force-dynamic'

export default async function CreditoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/gestao')

  // Dados paralelos
  const [card, scoreData] = await Promise.all([
    getCurrentCard(),
    getCurrentScore(),
  ])

  // DRE atual para cálculo de limite
  const periods = getLastPeriods(3)
  const { data: entries } = await supabase
    .from('dre_entries')
    .select('*')
    .in('period', periods)
    .order('period', { ascending: false })

  const dreAtual = calculateDre((entries ?? []) as DreEntry[], getCurrentPeriod())

  // Contrato ativo (último fechado)
  const { data: activeContract } = await supabase
    .from('candidatures')
    .select('id, contract_id, contracts:contract_id(*)')
    .eq('candidate_id', profile.id)
    .eq('status', 'confirmada')
    .order('confirmed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const contract = activeContract?.contracts as any | null

  // Calcular limite potencial
  const limitResult = scoreData && contract
    ? calculateCardLimit({
        score: scoreData.score.score,
        dre: {
          period:         getCurrentPeriod(),
          resultadoOp:    dreAtual.resultadoOperacional,
          margemOp:       dreAtual.margemOperacional,
          receitaMedia:   scoreData.score.receitaMediaMensal,
          custoPerKm:     dreAtual.custoPerKm,
          mesesPositivos: scoreData.score.mesesPositivos,
          totalMeses:     scoreData.score.monthsOfData,
        },
        contract: {
          contractId:     contract.id,
          contractValue:  Number(contract.contract_value),
          routeKm:        Number(contract.route_km),
          durationMonths: contract.duration_months,
          paymentType:    contract.payment_type,
        },
      })
    : null

  // Recebíveis pendentes para antecipação
  const { data: receivables } = await supabase
    .from('receivables')
    .select('*')
    .eq('owner_id', profile.id)
    .eq('status', 'pendente')
    .gte('due_date', new Date().toISOString().split('T')[0]!)
    .order('due_date', { ascending: true })
    .limit(5)

  const totalRecebiveis = (receivables ?? []).reduce((s, r) => s + Number(r.amount), 0)

  // Histórico de eventos de limite
  const { data: limitEvents } = card
    ? await supabase
        .from('credit_limit_events')
        .select('*')
        .eq('card_id', card.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: null }

  return (
    <div className="flex flex-col h-full">
      <Header title="Crédito" subtitle="Cartão vinculado ao contrato ativo" />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-2xl mx-auto space-y-xl">

          {/* Cartão visual */}
          <section>
            <p className="overline mb-md">Seu cartão</p>
            <CreditCardVisual card={card as any} ownerName={profile.full_name} />
          </section>

          {/* Limite atual ou potencial */}
          <section>
            {card ? (
              <LimitWidget
                limitResult={limitResult ?? {
                  limiteTotal: Number(card.limite_total),
                  limiteBase: Number(card.limite_total),
                  limiteContrato: Number(card.limite_total),
                  limiteEfetivo: Number(card.limite_total),
                  scoreFactor: 3,
                  contractFactor: 0.3,
                  canIssueCard: true,
                  blockReasons: [],
                  breakdown: {
                    steps: [],
                    summary: `Limite de ${formatBRL(Number(card.limite_total))} baseado no seu DRE real.`,
                  },
                }}
                limiteUtilizado={Number(card.limite_utilizado)}
              />
            ) : limitResult ? (
              <div className="space-y-md">
                <div>
                  <p className="overline mb-sm">Limite pré-aprovado</p>
                  <p className="caption text-ag-muted mb-md">
                    Com base no seu DRE e contrato ativo, você tem direito a:
                  </p>
                </div>
                <LimitWidget
                  limitResult={limitResult}
                  canRequest={limitResult.canIssueCard && !!activeContract}
                  onRequest={undefined}
                />
                {limitResult.canIssueCard && activeContract && (
                  <Link href={`/credito/solicitar?contract=${activeContract.contract_id}&candidature=${activeContract.id}`}>
                    <Button fullWidth size="lg">
                      Solicitar cartão de crédito
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <NoContractCard />
            )}
          </section>

          {/* Score resumido */}
          {scoreData && (
            <section className="bg-ag-surface border border-ag-border rounded-xl p-lg shadow-sm">
              <div className="flex items-center justify-between mb-lg">
                <h2 className="font-display text-display-sm font-medium text-ag-primary">
                  Score proprietário
                </h2>
                <Link
                  href="/score"
                  className="text-body-sm text-ag-secondary hover:text-ag-primary underline underline-offset-2"
                >
                  Ver completo →
                </Link>
              </div>
              <ScoreGauge result={scoreData.score} showDetail={false} />
            </section>
          )}

          {/* Antecipação de recebíveis */}
          <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-lg py-md border-b border-ag-border flex items-center justify-between">
              <div>
                <p className="overline">Antecipação</p>
                <h2 className="font-display text-display-sm font-medium text-ag-primary">
                  Recebíveis disponíveis
                </h2>
              </div>
              {totalRecebiveis > 0 && (
                <Badge variant="success">
                  {formatBRL(totalRecebiveis)}
                </Badge>
              )}
            </div>

            {receivables && receivables.length > 0 ? (
              <>
                <div className="divide-y divide-ag-border">
                  {(receivables as any[]).map((r) => (
                    <div key={r.id} className="px-lg py-md flex items-center justify-between gap-md">
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-ag-primary">
                          {r.payer_name ?? 'Transportadora'}
                        </p>
                        <p className="caption text-ag-muted">
                          Vencimento: {formatDate(r.due_date)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-body-sm font-medium" style={{ color: 'var(--color-success)' }}>
                          {formatBRL(Number(r.amount))}
                        </p>
                        <p className="caption text-ag-muted">pendente</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-lg py-md border-t border-ag-border">
                  <Link href="/credito/antecipacao">
                    <Button variant="secondary" fullWidth size="sm">
                      Antecipar recebíveis
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="px-lg py-[var(--space-2xl)] text-center space-y-sm">
                <p className="text-body text-ag-secondary">
                  Sem recebíveis pendentes no momento.
                </p>
                <p className="caption text-ag-muted">
                  Recebíveis de contratos fechados aparecerão aqui para antecipação.
                </p>
              </div>
            )}
          </section>

          {/* Histórico de ajustes de limite */}
          {limitEvents && limitEvents.length > 0 && (
            <Suspense fallback={null}>
              <LimitHistory events={limitEvents as any[]} />
            </Suspense>
          )}

          {/* Aviso BaaS → Banco Próprio */}
          <BaaSTransitionNote />
        </div>
      </main>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────

function NoContractCard() {
  return (
    <div
      className="rounded-xl p-lg space-y-md text-center"
      style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}
    >
      <span className="text-[36px]" aria-hidden="true">📋</span>
      <div>
        <p className="text-body font-medium" style={{ color: 'var(--color-warning)' }}>
          Contrato ativo necessário
        </p>
        <p className="text-body-sm mt-xs" style={{ color: 'var(--color-warning)', opacity: 0.85 }}>
          O cartão de crédito Agregado.Pro é vinculado ao seu contrato ativo.
          Feche um contrato no marketplace para solicitar o cartão.
        </p>
      </div>
      <Link href="/contratos">
        <Button variant="secondary" size="sm">Ver contratos disponíveis</Button>
      </Link>
    </div>
  )
}

function LimitHistory({ events }: { events: any[] }) {
  const reasonLabels: Record<string, string> = {
    emissao_inicial:     'Emissão do cartão',
    novo_contrato:       'Novo contrato fechado',
    dre_atualizado:      'DRE atualizado',
    score_atualizado:    'Score recalculado',
    reducao_manual:      'Ajuste de política',
    aumento_solicitado:  'Revisão solicitada',
    contrato_encerrado:  'Contrato encerrado',
  }

  return (
    <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-lg py-md border-b border-ag-border">
        <h3 className="font-display text-display-sm font-medium text-ag-primary">
          Histórico de ajustes de limite
        </h3>
      </div>
      <div className="divide-y divide-ag-border">
        {events.map((ev) => (
          <div key={ev.id} className="px-lg py-md flex items-center justify-between gap-md">
            <div>
              <p className="text-body-sm font-medium text-ag-primary">
                {reasonLabels[ev.reason] ?? ev.reason}
              </p>
              <p className="caption text-ag-muted">{formatDate(ev.created_at)}</p>
            </div>
            <div className="text-right">
              <p
                className="text-body-sm font-medium"
                style={{ color: ev.variacao > 0 ? 'var(--color-success)' :
                                ev.variacao < 0 ? 'var(--color-danger)' :
                                'var(--color-text-muted)' }}
              >
                {ev.variacao > 0 ? '+' : ''}{formatBRL(ev.variacao)}
              </p>
              <p className="caption text-ag-muted">→ {formatBRL(ev.limite_novo)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function BaaSTransitionNote() {
  return (
    <div
      className="rounded-xl p-lg space-y-sm"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-body-sm font-medium text-ag-primary">
        🏦 Sobre a infraestrutura bancária
      </p>
      <p className="text-body-sm text-ag-secondary">
        O cartão de crédito Agregado.Pro opera via parceiro BaaS (Celcoin).
        Todos os seus dados financeiros e transacionais são de sua propriedade exclusiva —
        garantido em contrato com o parceiro.
      </p>
      <p className="caption text-ag-muted">
        Em fase futura, migraremos para banco próprio com licença Banco Central —
        sem nenhuma interrupção para você.
      </p>
    </div>
  )
}
