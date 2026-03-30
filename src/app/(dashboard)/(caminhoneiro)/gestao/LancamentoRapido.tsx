'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useToast }                from '@/components/ui/toast'
import { formatBRL }               from '@/lib/utils'

const ATALHOS = [
  { icon: '⛽', label: 'Diesel',    type: 'custo_variavel', category: 'Diesel / Combustível' },
  { icon: '🛣️',  label: 'Pedágio',  type: 'custo_variavel', category: 'Pedágio' },
  { icon: '🍽️', label: 'Refeição',  type: 'custo_variavel', category: 'Alimentação (viagem)' },
  { icon: '🔧', label: 'Mecânico',  type: 'custo_variavel', category: 'Manutenção e peças' },
  { icon: '💵', label: 'Receita',   type: 'receita',         category: 'Frete por viagem' },
  { icon: '📌', label: 'Parcela',   type: 'custo_fixo',     category: 'Parcela financiamento' },
]

interface Props { period: string; vehicleId?: string }

export function LancamentoRapido({ period, vehicleId }: Props) {
  const [active,    setActive]    = useState<typeof ATALHOS[0] | null>(null)
  const [valor,     setValor]     = useState('')
  const [km,        setKm]        = useState('')
  const [isPending, startTransition] = useTransition()
  const { success, error } = useToast()
  const router = useRouter()

  function handleSelect(a: typeof ATALHOS[0]) {
    if (active?.label === a.label) { setActive(null); setValor(''); setKm('') }
    else { setActive(a); setValor(''); setKm('') }
  }

  async function handleSave() {
    if (!active || !valor) return
    const valNum = Number(valor.replace(',', '.'))
    if (isNaN(valNum) || valNum <= 0) { error('Valor inválido'); return }

    startTransition(async () => {
      const body: Record<string, unknown> = {
        period,
        entry_type:  active.type,
        category:    active.category,
        description: active.label,
        amount:      valNum,
        vehicle_id:  vehicleId ?? undefined,
      }
      if (active.type === 'receita' && km) body.km_reference = Number(km.replace(',', '.'))

      const res = await fetch('/api/dre/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); error(d.error ?? 'Erro'); return }
      success(`${active.label} — ${formatBRL(valNum)} lançado!`)
      setActive(null); setValor(''); setKm('')
      router.refresh()
    })
  }

  return (
    <div>
      <p className="text-body-sm font-medium text-ag-primary mb-sm">Lançamento rápido</p>

      {/* Atalhos */}
      <div className="grid grid-cols-3 gap-sm mb-md">
        {ATALHOS.map(a => (
          <button key={a.label} type="button" onClick={() => handleSelect(a)}
            className="flex flex-col items-center gap-xs p-sm rounded-lg border transition-all"
            style={{
              background:  active?.label === a.label ? 'var(--color-accent)' : 'var(--color-bg)',
              borderColor: active?.label === a.label ? 'var(--color-accent)' : 'var(--color-border)',
            }}>
            <span className="text-[20px]">{a.icon}</span>
            <span className="text-[11px] font-medium"
              style={{ color: active?.label === a.label ? 'var(--color-cta-text)' : 'var(--color-text-secondary)' }}>
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* Input inline */}
      {active && (
        <div className="flex gap-sm">
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            placeholder={`R$ valor — ${active.label}`}
            value={valor}
            onChange={e => setValor(e.target.value.replace(/[^\d,]/g,''))}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            className="flex-1 px-md py-sm border border-ag-border rounded-md text-body-sm bg-ag-bg text-ag-primary focus:border-ag-accent focus:outline-none"
          />
          {active.type === 'receita' && (
            <input
              type="text"
              inputMode="decimal"
              placeholder="km"
              value={km}
              onChange={e => setKm(e.target.value.replace(/[^\d,]/g,''))}
              className="w-20 px-md py-sm border border-ag-border rounded-md text-body-sm bg-ag-bg text-ag-primary focus:border-ag-accent focus:outline-none"
            />
          )}
          <button onClick={handleSave} disabled={isPending || !valor}
            className="px-md py-sm rounded-md text-body-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}>
            {isPending ? '...' : '✓'}
          </button>
        </div>
      )}
    </div>
  )
}
