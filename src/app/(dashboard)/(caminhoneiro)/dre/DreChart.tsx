'use client'

import { formatBRL } from '@/lib/utils'

interface PeriodData {
  period:    string  // "2026-03"
  label:     string  // "Mar/26"
  receita:   number
  custo:     number
  resultado: number
}

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatPeriodShort(p: string) {
  const [y, m] = p.split('-').map(Number)
  return `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
}

export function DreChart({ data }: { data: PeriodData[] }) {
  if (!data.length) return null

  const W = 600, H = 200, PAD = { t: 16, r: 16, b: 36, l: 64 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b

  const allVals   = data.flatMap(d => [d.receita, d.custo, 0])
  const maxVal    = Math.max(...allVals) * 1.1 || 1
  const minVal    = Math.min(0, ...data.map(d => d.resultado))
  const range     = maxVal - minVal

  const xStep  = chartW / Math.max(data.length - 1, 1)
  const yScale = (v: number) => chartH - ((v - minVal) / range) * chartH

  // Barras de resultado
  const barW = Math.min(xStep * 0.4, 24)

  // Pontos receita
  const receitaPts = data.map((d, i) => ({ x: PAD.l + i * xStep, y: PAD.t + yScale(d.receita) }))
  const custoPts   = data.map((d, i) => ({ x: PAD.l + i * xStep, y: PAD.t + yScale(d.custo) }))

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const zeroY = PAD.t + yScale(0)

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 300, maxWidth: W }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const v   = minVal + range * (1 - pct)
          const y   = PAD.t + chartH * pct
          const isZ = Math.abs(v) < range * 0.02
          return (
            <g key={pct}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
                stroke={isZ ? 'var(--color-border)' : 'var(--color-surface)'}
                strokeWidth={isZ ? 1.5 : 1} strokeDasharray={isZ ? 'none' : '4 4'} />
              <text x={PAD.l - 6} y={y + 4} textAnchor="end"
                fontSize={9} fill="var(--color-text-muted)">
                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Barras de resultado */}
        {data.map((d, i) => {
          const x      = PAD.l + i * xStep
          const isPos  = d.resultado >= 0
          const barH   = Math.abs((d.resultado / range) * chartH)
          const y      = isPos ? zeroY - barH : zeroY
          return (
            <rect key={i} x={x - barW / 2} y={y} width={barW} height={Math.max(barH, 1)}
              fill={isPos ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}
              stroke={isPos ? 'var(--color-success-border)' : 'var(--color-danger-border)'}
              strokeWidth={1} rx={3} />
          )
        })}

        {/* Linha custo */}
        <path d={toPath(custoPts)} fill="none"
          stroke="var(--color-danger)" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6} />

        {/* Linha receita */}
        <path d={toPath(receitaPts)} fill="none"
          stroke="var(--color-success)" strokeWidth={2} />

        {/* Pontos */}
        {receitaPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-success)" />
        ))}

        {/* Labels X */}
        {data.map((d, i) => (
          <text key={i} x={PAD.l + i * xStep} y={H - 6}
            textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
            {formatPeriodShort(d.period)}
          </text>
        ))}
      </svg>

      {/* Legenda */}
      <div className="flex gap-xl justify-center mt-sm" style={{ fontSize: 11 }}>
        {[
          { color: 'var(--color-success)', dash: false, label: 'Receita' },
          { color: 'var(--color-danger)',  dash: true,  label: 'Custo' },
          { color: 'var(--color-success-bg)', dash: false, label: 'Resultado' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              display: 'inline-block', width: l.dash ? 16 : 12, height: l.dash ? 0 : 12,
              borderRadius: l.dash ? 0 : 3,
              background: l.dash ? 'transparent' : l.color,
              border: l.dash ? `1.5px dashed ${l.color}` : `1px solid ${l.color}`,
              flexShrink: 0,
            }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
