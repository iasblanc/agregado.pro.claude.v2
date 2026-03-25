'use client'

import { useEffect, useState }  from 'react'
import { createClient }         from '@/lib/supabase/client'
import { useMargemAlert }       from '@/hooks/useMargemAlert'
import { formatBRL, formatKm, formatPercent, getCurrentPeriod } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────

interface TripStats {
  saldoDisponivel:  number
  gastosViagem:     number
  kmPercorridos:    number
  receitaViagem:    number
  margemEstimada:   number | null
  ultimaTransacao?: { merchant: string; amount: number; at: string }
}

interface DashboardViagemProps {
  contractValue?: number  // Valor do contrato ativo (se houver)
  contractKm?:    number  // KM do contrato ativo
  initialBalance: number  // Saldo da conta no BaaS
}

// ─── Dashboard de Viagem ─────────────────────────────────────────

/**
 * Dashboard de viagem em tempo real.
 *
 * Regra do master.md (Pilar 4):
 * "Dashboard de viagem: Saldo disponível + despesas da rota atual em tempo real"
 * "Alerta de margem: Notificação quando despesas comprometem a margem do contrato"
 * "Projeção de resultado: Com base nas despesas até o momento, projeta resultado final"
 */
export function DashboardViagem({
  contractValue,
  contractKm,
  initialBalance,
}: DashboardViagemProps) {
  const period = getCurrentPeriod()
  const [stats, setStats] = useState<TripStats>({
    saldoDisponivel:  initialBalance,
    gastosViagem:     0,
    kmPercorridos:    0,
    receitaViagem:    0,
    margemEstimada:   null,
  })
  const [isLoading, setIsLoading] = useState(true)

  const { isAbaixoThreshold, isCritica, margem } = useMargemAlert({
    threshold: 0.05,
    period,
  })

  useEffect(() => {
    const supabase = createClient()

    const fetchStats = async () => {
      // Gastos via cartão no período
      const { data: txns } = await supabase
        .from('banking_transactions')
        .select('amount, merchant_name, transacted_at, is_operational')
        .eq('dre_period', period)
        .eq('status', 'liquidada')
        .order('transacted_at', { ascending: false })

      // Lançamentos DRE (receitas + km)
      const { data: dreEntries } = await supabase
        .from('dre_entries')
        .select('amount, entry_type, km_reference')
        .eq('period', period)

      const gastosViagem = (txns ?? [])
        .filter((t) => t.is_operational)
        .reduce((s, t) => s + Number(t.amount), 0)

      const receitaViagem = (dreEntries ?? [])
        .filter((e) => e.entry_type === 'receita')
        .reduce((s, e) => s + Number(e.amount), 0)

      const kmTotal = Math.max(
        ...(dreEntries ?? [])
          .filter((e) => e.km_reference)
          .map((e) => Number(e.km_reference)),
        0
      )

      const totalCustos = (dreEntries ?? [])
        .filter((e) => e.entry_type !== 'receita')
        .reduce((s, e) => s + Number(e.amount), 0)

      const margemEstimada = receitaViagem > 0
        ? (receitaViagem - totalCustos - gastosViagem) / receitaViagem
        : null

      const ultima = txns?.[0]

      setStats({
        saldoDisponivel: initialBalance,
        gastosViagem,
        kmPercorridos:   kmTotal,
        receitaViagem,
        margemEstimada,
        ultimaTransacao: ultima
          ? {
              merchant: ultima.merchant_name,
              amount:   Number(ultima.amount),
              at:       new Date(ultima.transacted_at).toLocaleTimeString('pt-BR', {
                hour:   '2-digit',
                minute: '2-digit',
              }),
            }
          : undefined,
      })
      setIsLoading(false)
    }

    fetchStats()

    // Realtime: atualiza ao chegar nova transação
    const channel = supabase
      .channel('dashboard_viagem')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'banking_transactions',
        filter: `dre_period=eq.${period}`,
      }, fetchStats)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [period, initialBalance])

  if (isLoading) {
    return (
      <div className="bg-ag-surface border border-ag-border rounded-xl p-lg animate-pulse space-y-md shadow-sm">
        <div className="h-4 bg-ag-border rounded w-1/3" />
        <div className="h-8 bg-ag-border rounded w-1/2" />
        <div className="h-4 bg-ag-border rounded w-2/3" />
      </div>
    )
  }

  // Projeção: se tiver contrato ativo, estimar resultado final
  const projecaoFinal = contractValue && contractKm && stats.kmPercorridos > 0
    ? contractValue - (stats.gastosViagem / stats.kmPercorridos) * contractKm
    : null

  return (
    <div className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
      {/* Header com status da margem */}
      <div
        className="px-lg py-md flex items-center justify-between"
        style={{
          background: isCritica
            ? 'var(--color-danger-bg)'
            : isAbaixoThreshold
            ? 'var(--color-warning-bg)'
            : 'var(--color-success-bg)',
          borderBottom: `1px solid ${
            isCritica ? 'var(--color-danger-border)' :
            isAbaixoThreshold ? 'var(--color-warning-border)' :
            'var(--color-success-border)'
          }`,
        }}
      >
        <div>
          <p className="overline" style={{
            color: isCritica ? 'var(--color-danger)' :
                   isAbaixoThreshold ? 'var(--color-warning)' : 'var(--color-success)',
          }}>
            Dashboard de Viagem
          </p>
          <p className="caption" style={{ color: 'var(--color-text-secondary)' }}>
            {isCritica ? 'Atenção: resultado negativo' :
             isAbaixoThreshold ? 'Margem abaixo do mínimo' :
             'Operação dentro do planejado'}
          </p>
        </div>
        {margem !== null && (
          <span
            className="font-display text-[28px] font-medium"
            style={{ color: isCritica ? 'var(--color-danger)' :
                            isAbaixoThreshold ? 'var(--color-warning)' : 'var(--color-success)' }}
          >
            {formatPercent(margem)}
          </span>
        )}
      </div>

      {/* Métricas */}
      <div className="px-lg py-md grid grid-cols-2 gap-md">
        <Metric
          label="Saldo disponível"
          value={formatBRL(stats.saldoDisponivel)}
          sub="Na conta do cartão"
        />
        <Metric
          label="Gastos operacionais"
          value={formatBRL(stats.gastosViagem)}
          sub="No cartão este mês"
          danger={stats.gastosViagem > stats.receitaViagem * 0.8}
        />
        {stats.kmPercorridos > 0 && (
          <Metric
            label="KM rodados"
            value={formatKm(stats.kmPercorridos)}
            sub={`${formatBRL(stats.gastosViagem / Math.max(stats.kmPercorridos, 1))}/km`}
          />
        )}
        {projecaoFinal !== null && (
          <Metric
            label="Projeção do contrato"
            value={formatBRL(projecaoFinal)}
            sub="Resultado estimado"
            success={projecaoFinal > 0}
            danger={projecaoFinal < 0}
          />
        )}
      </div>

      {/* Última transação */}
      {stats.ultimaTransacao && (
        <div className="px-lg pb-md border-t border-ag-border pt-md">
          <p className="caption text-ag-muted">Última transação no cartão</p>
          <div className="flex items-center justify-between mt-xs">
            <p className="text-body-sm text-ag-primary truncate flex-1">
              {stats.ultimaTransacao.merchant}
            </p>
            <div className="text-right shrink-0 ml-sm">
              <p className="text-body-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                -{formatBRL(stats.ultimaTransacao.amount)}
              </p>
              <p className="caption text-ag-muted">{stats.ultimaTransacao.at}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Métrica inline ────────────────────────────────────────────────

function Metric({
  label, value, sub, danger = false, success = false,
}: {
  label:    string
  value:    string
  sub?:     string
  danger?:  boolean
  success?: boolean
}) {
  return (
    <div>
      <p className="caption text-ag-muted">{label}</p>
      <p
        className="font-display text-[22px] font-medium leading-tight"
        style={{
          color: danger  ? 'var(--color-danger)' :
                 success ? 'var(--color-success)' :
                 'var(--color-text-primary)',
        }}
      >
        {value}
      </p>
      {sub && <p className="caption text-ag-muted">{sub}</p>}
    </div>
  )
}
