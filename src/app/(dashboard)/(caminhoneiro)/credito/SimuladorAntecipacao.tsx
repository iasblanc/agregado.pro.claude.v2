'use client'
import { useState } from 'react'
import { formatBRL } from '@/lib/utils'

const TAXAS = [
  { dias: 7,  taxa: 0.025, label: '7 dias' },
  { dias: 15, taxa: 0.035, label: '15 dias' },
  { dias: 30, taxa: 0.050, label: '30 dias' },
]

export function SimuladorAntecipacao({ limite }: { limite: number }) {
  const [valor,  setValor]  = useState(Math.min(limite * 0.5, limite))
  const [prazo,  setPrazo]  = useState(0)   // índice

  const t   = TAXAS[prazo]
  const fee = valor * t.taxa
  const net = valor - fee

  return (
    <div className="rounded-xl border border-ag-border p-lg space-y-lg" style={{ background: 'var(--color-surface)' }}>
      <p className="text-body-sm font-medium text-ag-primary">Simular antecipação</p>

      {/* Valor */}
      <div>
        <div className="flex justify-between mb-xs">
          <label className="caption text-ag-muted">Valor a antecipar</label>
          <span className="text-body-sm font-medium text-ag-primary">{formatBRL(valor)}</span>
        </div>
        <input type="range" min={500} max={limite} step={100}
          value={valor} onChange={e => setValor(Number(e.target.value))}
          className="w-full accent-current" style={{ accentColor: 'var(--color-accent)' }} />
        <div className="flex justify-between mt-xs">
          <span className="caption text-ag-muted">{formatBRL(500)}</span>
          <span className="caption text-ag-muted">{formatBRL(limite)}</span>
        </div>
      </div>

      {/* Prazo */}
      <div className="flex gap-sm">
        {TAXAS.map((t, i) => (
          <button key={i} type="button" onClick={() => setPrazo(i)}
            className="flex-1 py-sm rounded-md border text-body-sm font-medium transition-all"
            style={{
              background:  prazo === i ? 'var(--color-accent)' : 'transparent',
              borderColor: prazo === i ? 'var(--color-accent)' : 'var(--color-border)',
              color:       prazo === i ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Resultado */}
      <div className="rounded-lg p-md space-y-xs" style={{ background: 'var(--color-bg)' }}>
        {[
          ['Valor bruto',  formatBRL(valor),     ''],
          ['Taxa',         `${(t.taxa*100).toFixed(1)}% (${formatBRL(fee)})`, 'var(--color-danger)'],
          ['Você recebe',  formatBRL(net),        'var(--color-success)'],
        ].map(([k, v, col]) => (
          <div key={k} className="flex justify-between">
            <span className="text-body-sm text-ag-secondary">{k}</span>
            <span className="text-body-sm font-medium" style={{ color: col as string || 'var(--color-text-primary)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
