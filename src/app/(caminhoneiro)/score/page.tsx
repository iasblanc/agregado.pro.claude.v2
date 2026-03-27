import type { Metadata }    from 'next'
import { redirect }          from 'next/navigation'
import { Suspense }          from 'react'
import { createClient }      from '@/lib/supabase/server'
import { Header }            from '@/components/layout/Header'
import { Badge }             from '@/components/ui/badge'
import { ScoreGauge }        from '@/components/credit/ScoreGauge'
import { getCurrentScore }   from '@/services/credit'
import { formatDate, formatBRL } from '@/lib/utils'

export const metadata: Metadata = { title: 'Score de Crédito' }
export const dynamic = 'force-dynamic'  // 5 minutos

export default async function ScorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/gestao')

  const scoreData = await getCurrentScore()

  return (
    <div className="flex flex-col h-full">
      <Header title="Score de Crédito" subtitle="Seu score proprietário baseado em dados reais" />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-2xl mx-auto space-y-xl">

          {/* Aviso Phase 3 */}
          <div
            className="flex items-start gap-sm px-md py-sm rounded-md text-body-sm"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}
          >
            <span aria-hidden="true">🔬</span>
            <div>
              <p className="font-medium">Score proprietário Agregado.Pro</p>
              <p className="mt-xs opacity-90">
                Diferente dos bureaus tradicionais, seu score é calculado sobre os seus dados reais de DRE,
                custo/km e histórico de contratos — não sobre dados de terceiros.
              </p>
            </div>
          </div>

          {/* Score atual */}
          {scoreData ? (
            <>
              <ScoreGauge result={scoreData.score} />

              {/* Regra de crédito Phase 4 — transparência */}
              {scoreData.score.isEligible && (
                <div className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-md shadow-sm">
                  <h3 className="font-display text-display-sm font-medium text-ag-primary">
                    Como seu limite é calculado
                  </h3>
                  <div className="space-y-sm text-body-sm text-ag-secondary">
                    <p>
                      Seu limite sugerido de{' '}
                      <strong className="text-ag-primary">{formatBRL(scoreData.score.limiteSugerido)}</strong>{' '}
                      é calculado assim:
                    </p>
                    <ol className="space-y-xs pl-md list-decimal marker:text-ag-muted">
                      <li>
                        Lucro médio mensal:{' '}
                        <strong className="text-ag-primary">
                          {formatBRL(scoreData.score.receitaMediaMensal * scoreData.score.margemMediaPercent)}
                        </strong>
                      </li>
                      <li>
                        Multiplicador do seu score ({scoreData.score.score} pontos):{' '}
                        <strong className="text-ag-primary">
                          {scoreData.score.score >= 850 ? '6×' :
                           scoreData.score.score >= 750 ? '5×' :
                           scoreData.score.score >= 650 ? '4×' :
                           scoreData.score.score >= 500 ? '3×' : '2×'}
                        </strong>
                      </li>
                      <li>Resultado: limite proporcional ao seu desempenho real</li>
                    </ol>
                    <p className="caption text-ag-muted pt-xs">
                      O limite é revisado mensalmente conforme o DRE atualizado.
                      O cartão de crédito estará disponível na Phase 4.
                    </p>
                  </div>
                </div>
              )}

              {/* Histórico de scores */}
              <Suspense fallback={<HistoryLoading />}>
                <ScoreHistory ownerId={profile.id} />
              </Suspense>
            </>
          ) : (
            <EmptyScore />
          )}

          {/* Open Finance */}
          <OpenFinanceSection ownerId={profile.id} />
        </div>
      </main>
    </div>
  )
}

// ─── Histórico de scores ──────────────────────────────────────────

async function ScoreHistory({ ownerId }: { ownerId: string }) {
  const supabase = await createClient()

  const { data: history } = await supabase
    .from('credit_scores')
    .select('score, tier, calculated_at, variacao_score')
    .eq('owner_id', ownerId)
    .order('calculated_at', { ascending: false })
    .limit(6)

  if (!history || history.length <= 1) return null

  const tierColors: Record<string, string> = {
    insuficiente: 'muted',
    baixo:        'danger',
    regular:      'warning',
    bom:          'warning',
    muito_bom:    'success',
    excelente:    'success',
  }

  return (
    <div className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-lg py-md border-b border-ag-border">
        <h3 className="font-display text-display-sm font-medium text-ag-primary">
          Histórico de scores
        </h3>
      </div>
      <div className="divide-y divide-ag-border">
        {history.map((h: any, i: number) => (
          <div key={h.calculated_at} className="px-lg py-md flex items-center justify-between gap-md">
            <div>
              <p className="text-body-sm font-medium text-ag-primary">
                Score {h.score}
              </p>
              <p className="caption text-ag-muted">{formatDate(h.calculated_at)}</p>
            </div>
            <div className="flex items-center gap-sm">
              {h.variacao_score !== null && i < history.length - 1 && (
                <span
                  className="text-body-sm font-medium"
                  style={{
                    color: h.variacao_score > 0 ? 'var(--color-success)' :
                           h.variacao_score < 0 ? 'var(--color-danger)' :
                           'var(--color-text-muted)',
                  }}
                >
                  {h.variacao_score > 0 ? '+' : ''}{h.variacao_score}
                </span>
              )}
              <Badge variant={(tierColors[h.tier] ?? 'muted') as any}>
                {h.tier.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Open Finance ─────────────────────────────────────────────────

async function OpenFinanceSection({ ownerId }: { ownerId: string }) {
  const supabase = await createClient()

  const { data: connections } = await supabase
    .from('open_finance_connections')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('is_active', true)

  return (
    <div className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-md shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="overline">Open Finance</p>
          <h3 className="font-display text-display-sm font-medium text-ag-primary">
            Bancos conectados
          </h3>
        </div>
        <Badge variant={connections && connections.length > 0 ? 'success' : 'muted'} dot>
          {connections?.length ?? 0} conectado{(connections?.length ?? 0) !== 1 ? 's' : ''}
        </Badge>
      </div>

      {connections && connections.length > 0 ? (
        <div className="space-y-sm">
          {(connections as any[]).map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-md px-md py-sm rounded-md bg-ag-bg border border-ag-border"
            >
              <div className="w-8 h-8 rounded-md bg-ag-surface flex items-center justify-center text-caption font-medium text-ag-muted">
                🏦
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-ag-primary truncate">
                  {conn.institution_name}
                </p>
                <p className="caption text-ag-muted">
                  Sincronizado em{' '}
                  {conn.last_sync_at ? formatDate(conn.last_sync_at) : 'Aguardando...'}
                </p>
              </div>
              <Badge variant={conn.sync_status === 'synced' ? 'success' : 'warning'}>
                {conn.sync_status === 'synced' ? 'Ativo' : 'Pendente'}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-md">
          <p className="text-body text-ag-secondary">
            Conecte suas contas em outros bancos via Open Finance para enriquecer seu score
            com dados de pagamento e fluxo financeiro adicional.
          </p>
          <p className="caption text-ag-muted">
            🔒 Usamos Open Finance — nunca pedimos sua senha bancária. Somente você autoriza o acesso.
          </p>
          <button
            disabled
            className="inline-flex items-center gap-sm px-md py-sm rounded-md text-body-sm font-medium opacity-50 cursor-not-allowed"
            style={{ background: 'var(--color-overlay)', color: 'var(--color-text-secondary)' }}
            title="Em breve"
          >
            Conectar banco via Open Finance
            <Badge variant="muted">Em breve</Badge>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────

function EmptyScore() {
  return (
    <div className="text-center py-[var(--space-4xl)] space-y-xl max-w-sm mx-auto">
      <div className="text-[56px]" aria-hidden="true">📊</div>
      <div className="space-y-md">
        <h2 className="font-display text-display-sm font-medium text-ag-primary">
          Score ainda não calculado
        </h2>
        <p className="text-body text-ag-secondary">
          Você precisa de pelo menos 3 meses de lançamentos no DRE para que seu score seja calculado.
        </p>
        <p className="caption text-ag-muted">
          Registre receitas e despesas mensalmente para construir seu histórico.
        </p>
      </div>
    </div>
  )
}

function HistoryLoading() {
  return (
    <div className="bg-ag-surface border border-ag-border rounded-xl p-lg animate-pulse space-y-md">
      <div className="h-4 bg-ag-border rounded w-1/3" />
      <div className="space-y-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-ag-border rounded" />
        ))}
      </div>
    </div>
  )
}
