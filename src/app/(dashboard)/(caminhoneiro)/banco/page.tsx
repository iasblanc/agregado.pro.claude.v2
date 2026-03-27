import type { Metadata }    from 'next'
import { redirect }          from 'next/navigation'
import Link                  from 'next/link'
import { createClient }      from '@/lib/supabase/server'
import { Header }            from '@/components/layout/Header'
import { Badge }             from '@/components/ui/badge'
import { DashboardViagem }   from '@/components/banking/DashboardViagem'
import { MargemAlertBanner } from '@/components/banking/MargemAlertBanner'
import { formatBRL, formatDate, getCurrentPeriod } from '@/lib/utils'

export const metadata: Metadata = { title: 'Banco Digital' }
export const dynamic = 'force-dynamic'

export default async function BancoPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/gestao')

  const period = getCurrentPeriod()

  // Buscar transações do mês atual
  const { data: transactions } = await supabase
    .from('banking_transactions')
    .select('*')
    .eq('dre_period', period)
    .order('transacted_at', { ascending: false })
    .limit(30)

  // Sugestões pendentes de confirmação
  const pendentes = (transactions ?? []).filter(
    (t) => t.classification_source === 'ia_sugestao' && !t.dre_entry_id
  )

  // Resumo financeiro do cartão no mês
  const totalGasto = (transactions ?? [])
    .filter((t) => t.status === 'liquidada' && t.is_operational)
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="flex flex-col h-full">
      <Header title="Banco Digital" subtitle="Conta e cartão Agregado.Pro" />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl">
        {/* Alerta de margem em tempo real */}
        <MargemAlertBanner threshold={0.05} period={period} />

        {/* Banner Phase 2 — cartão não emitido ainda? */}
        <div
          className="rounded-xl p-lg space-y-md"
          style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}
        >
          <div className="flex items-start justify-between gap-md">
            <div>
              <p className="overline" style={{ color: 'rgba(245,242,236,0.60)' }}>
                Cartão de débito
              </p>
              <h2 className="font-display text-[28px] font-medium mt-xs">
                Agregado.Pro
              </h2>
              <p className="text-body mt-sm" style={{ color: 'rgba(245,242,236,0.75)' }}>
                Cada compra é lançada automaticamente no seu DRE.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="caption" style={{ color: 'rgba(245,242,236,0.60)' }}>Gasto este mês</p>
              <p className="font-display text-[32px] font-medium">
                {formatBRL(totalGasto)}
              </p>
            </div>
          </div>

          {/* Atalhos */}
          <div className="flex gap-sm flex-wrap pt-sm border-t" style={{ borderColor: 'rgba(245,242,236,0.15)' }}>
            {['PIX', 'Extrato', 'Cartão virtual', 'Limite'].map((action) => (
              <button
                key={action}
                className="px-md py-xs rounded-pill text-caption font-medium transition-colors hover:opacity-80"
                style={{ background: 'rgba(245,242,236,0.12)', color: 'var(--color-cta-text)' }}
                disabled
                title="Em breve"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard de viagem */}
        <DashboardViagem initialBalance={0} />

        {/* Sugestões pendentes de classificação */}
        {pendentes.length > 0 && (
          <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-lg py-md border-b border-ag-border flex items-center justify-between">
              <div>
                <p className="overline">Confirmar classificação</p>
                <h2 className="font-display text-display-sm font-medium text-ag-primary">
                  {pendentes.length} transaç{pendentes.length === 1 ? 'ão' : 'ões'} aguardando
                </h2>
              </div>
              <Badge variant="warning" dot>
                {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="px-lg py-sm caption text-ag-muted border-b border-ag-border">
              A IA classificou estas despesas — confirme com 1 toque para lançar no DRE.
            </p>
            <div className="divide-y divide-ag-border">
              {pendentes.slice(0, 5).map((t: any) => (
                <TransactionRow key={t.id} transaction={t} showConfirm />
              ))}
            </div>
            {pendentes.length > 5 && (
              <Link
                href="/banco/extrato"
                className="block px-lg py-sm text-center text-body-sm text-ag-secondary hover:text-ag-primary transition-colors border-t border-ag-border"
              >
                Ver todas as {pendentes.length} sugestões →
              </Link>
            )}
          </section>
        )}

        {/* Extrato recente */}
        <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-lg py-md border-b border-ag-border flex items-center justify-between">
            <h2 className="font-display text-display-sm font-medium text-ag-primary">
              Extrato recente
            </h2>
            <Link
              href="/banco/extrato"
              className="text-body-sm text-ag-secondary hover:text-ag-primary underline underline-offset-2 transition-colors"
            >
              Ver tudo
            </Link>
          </div>

          {transactions && transactions.length > 0 ? (
            <div className="divide-y divide-ag-border">
              {(transactions as any[]).slice(0, 10).map((t) => (
                <TransactionRow key={t.id} transaction={t} />
              ))}
            </div>
          ) : (
            <div className="px-lg py-[var(--space-2xl)] text-center space-y-sm">
              <p className="text-[40px]" aria-hidden="true">💳</p>
              <p className="text-body text-ag-secondary">
                Nenhuma transação neste mês ainda.
              </p>
              <p className="caption text-ag-muted">
                Ao usar seu cartão Agregado.Pro, as transações aparecerão aqui automaticamente.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

// ─── Linha de transação ───────────────────────────────────────────

function TransactionRow({
  transaction: t,
  showConfirm = false,
}: {
  transaction: any
  showConfirm?: boolean
}) {
  const statusColor = t.status === 'cancelada' ? 'var(--color-text-muted)' :
                      t.is_operational           ? 'var(--color-danger)'    :
                      'var(--color-text-secondary)'

  return (
    <div className="px-lg py-md flex items-center gap-md hover:bg-ag-overlay transition-colors">
      {/* Ícone por categoria */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
        style={{ background: 'var(--color-surface)' }}
        aria-hidden="true"
      >
        {getCategoryIcon(t.dre_category ?? t.ia_suggested_category)}
      </div>

      {/* Dados */}
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-ag-primary truncate">
          {t.merchant_name}
        </p>
        <div className="flex items-center gap-sm mt-xs flex-wrap">
          <span className="caption text-ag-muted">
            {formatDate(t.transacted_at)}
          </span>
          {t.ia_suggested_category && !t.dre_category && showConfirm && (
            <Badge variant="warning">Confirmar: {t.ia_suggested_category}</Badge>
          )}
          {t.dre_category && (
            <Badge variant="muted">{t.dre_category}</Badge>
          )}
          {t.status === 'cancelada' && (
            <Badge variant="danger">Cancelada</Badge>
          )}
        </div>
      </div>

      {/* Valor */}
      <div className="text-right shrink-0">
        <p
          className="text-body-sm font-medium"
          style={{ color: statusColor, textDecoration: t.status === 'cancelada' ? 'line-through' : 'none' }}
        >
          -{formatBRL(Number(t.amount))}
        </p>
        {t.card_last4 && (
          <p className="caption text-ag-muted">•••• {t.card_last4}</p>
        )}
      </div>
    </div>
  )
}

// ─── Ícone por categoria ──────────────────────────────────────────

function getCategoryIcon(category: string | null): string {
  const map: Record<string, string> = {
    diesel:             '⛽',
    pedagio:            '🛣️',
    manutencao:         '🔧',
    pneus:              '🛞',
    seguro:             '🛡️',
    licenciamento:      '📋',
    rastreador:         '📡',
    parcela_caminhao:   '🚛',
    alimentacao_viagem: '🍽️',
    hospedagem:         '🛏️',
    pessoal:            '👤',
    outros_variaveis:   '📦',
    outros_fixos:       '📌',
  }
  return map[category ?? ''] ?? '💳'
}
