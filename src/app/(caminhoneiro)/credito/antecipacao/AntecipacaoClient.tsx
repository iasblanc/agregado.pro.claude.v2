'use client'

import { useState, useTransition } from 'react'
import { useRouter }  from 'next/navigation'
import { Alert }      from '@/components/ui/alert'
import { Button }     from '@/components/ui/button'
import { formatBRL, formatDate } from '@/lib/utils'
import { calculateAnticipationFee } from '@/lib/credit-calc'

// ─── Tipos ────────────────────────────────────────────────────────

interface Receivable {
  id:         string
  amount:     number
  due_date:   string
  payer_name: string
}

interface AntecipacaoClientProps {
  receivables: Receivable[]
  score:       number
}

// ─── Componente ───────────────────────────────────────────────────

export function AntecipacaoClient({ receivables, score }: AntecipacaoClientProps) {
  const router           = useRouter()
  const [isPending, startT] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const selectedReceivables = receivables.filter((r) => selected.has(r.id))
  const totalSelected       = selectedReceivables.reduce((s, r) => s + r.amount, 0)

  // Calcular antecipação para cada recebível selecionado
  const calcForReceivable = (r: Receivable) => {
    const today  = new Date()
    const due    = new Date(r.due_date)
    const days   = Math.max(1, Math.ceil((due.getTime() - today.getTime()) / 86_400_000))
    return calculateAnticipationFee({ score, daysAnticipated: days, amount: r.amount })
  }

  const totalFee    = selectedReceivables.reduce((s, r) => s + calcForReceivable(r).feeAmount, 0)
  const totalNet    = totalSelected - totalFee

  async function handleAntecipar() {
    if (selected.size === 0) return
    setError(null)

    startT(async () => {
      try {
        const res = await fetch('/api/credit/anticipate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ receivableIds: [...selected] }),
        })
        if (!res.ok) {
          const err = await res.json()
          setError(err.error ?? 'Erro ao processar antecipação')
          return
        }
        setSuccess(true)
        setTimeout(() => router.push('/credito'), 3000)
      } catch {
        setError('Erro de conexão. Tente novamente.')
      }
    })
  }

  if (success) {
    return (
      <div className="text-center py-[var(--space-4xl)] space-y-lg">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-[28px]"
          style={{ background: 'var(--color-success-bg)' }}
        >
          ✓
        </div>
        <div>
          <p className="font-display text-display-sm font-medium text-ag-primary">
            Antecipação solicitada!
          </p>
          <p className="text-body text-ag-secondary mt-sm">
            O valor líquido de {formatBRL(totalNet)} será creditado em até 1 dia útil.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-xl">
      {/* Lista de recebíveis */}
      <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-lg py-md border-b border-ag-border">
          <p className="overline">Selecionar recebíveis</p>
          <h2 className="font-display text-display-sm font-medium text-ag-primary mt-xs">
            {receivables.length} recebível{receivables.length !== 1 ? 'is' : ''} disponível{receivables.length !== 1 ? 'is' : ''}
          </h2>
        </div>

        <div className="divide-y divide-ag-border">
          {receivables.map((r) => {
            const isSelected = selected.has(r.id)
            const calc       = calcForReceivable(r)
            const days       = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86_400_000)

            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={[
                  'w-full px-lg py-md flex items-center gap-md text-left transition-colors',
                  isSelected ? 'bg-[var(--color-success-bg)]' : 'hover:bg-ag-overlay',
                ].join(' ')}
                aria-pressed={isSelected}
              >
                {/* Checkbox visual */}
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor: isSelected ? 'var(--color-success)' : 'var(--color-border)',
                    background:  isSelected ? 'var(--color-success)' : 'transparent',
                  }}
                  aria-hidden="true"
                >
                  {isSelected && <span className="text-[10px] text-white font-bold">✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-ag-primary truncate">
                    {r.payer_name}
                  </p>
                  <p className="caption text-ag-muted">
                    Vence em {formatDate(r.due_date)} ({days} dias)
                  </p>
                  {isSelected && (
                    <p className="caption mt-xs" style={{ color: 'var(--color-warning)' }}>
                      Taxa: {formatBRL(calc.feeAmount)} · Líquido: {formatBRL(calc.netAmount)}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-body-sm font-medium" style={{ color: 'var(--color-success)' }}>
                    {formatBRL(r.amount)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Resumo da antecipação */}
      {selected.size > 0 && (
        <section
          className="rounded-xl p-lg space-y-md"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="font-display text-display-sm font-medium text-ag-primary">
            Resumo da antecipação
          </h3>

          <div className="space-y-sm divide-y divide-ag-border">
            <div className="flex justify-between py-sm text-body-sm">
              <span className="text-ag-secondary">Valor bruto ({selected.size} recebível{selected.size !== 1 ? 'is' : ''})</span>
              <span className="font-medium text-ag-primary">{formatBRL(totalSelected)}</span>
            </div>
            <div className="flex justify-between py-sm text-body-sm">
              <span className="text-ag-secondary">Taxa de antecipação</span>
              <span className="font-medium" style={{ color: 'var(--color-danger)' }}>
                -{formatBRL(totalFee)}
              </span>
            </div>
            <div className="flex justify-between py-sm">
              <span className="text-body font-medium text-ag-primary">Valor líquido</span>
              <span className="font-display text-[22px] font-medium" style={{ color: 'var(--color-success)' }}>
                {formatBRL(totalNet)}
              </span>
            </div>
          </div>

          <p className="caption text-ag-muted">
            Taxa calculada com base no seu score ({score} pts) e no prazo de cada recebível.
            Melhores scores = taxas menores.
          </p>

          {error && <Alert variant="danger">{error}</Alert>}

          <Button
            fullWidth
            size="lg"
            loading={isPending}
            onClick={handleAntecipar}
          >
            Confirmar antecipação de {formatBRL(totalNet)}
          </Button>
        </section>
      )}
    </div>
  )
}
