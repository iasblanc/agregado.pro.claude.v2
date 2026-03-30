'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'

interface Props { custoKmReal: number | null }

export function CalculadoraClient({ custoKmReal }: Props) {
  const [valorFrete, setValorFrete]   = useState('')
  const [distanciaKm, setDistanciaKm] = useState('')
  const [custoKm, setCustoKm]         = useState(custoKmReal ? String(custoKmReal.toFixed(2)) : '')
  const [diasViagem, setDiasViagem]   = useState('2')
  const [pedagio, setPedagio]         = useState('')

  const valor = Number(valorFrete.replace(',', '.')) || 0
  const km    = Number(distanciaKm.replace(',', '.')) || 0
  const cKm   = Number(custoKm.replace(',', '.')) || 0
  const dias  = Number(diasViagem) || 0
  const ped   = Number(pedagio.replace(',', '.')) || 0

  const custoTotal   = (cKm * km) + ped
  const lucro        = valor - custoTotal
  const margem       = valor > 0 ? (lucro / valor) * 100 : 0
  const valorPorKm   = km > 0 ? valor / km : 0
  const lucrosPorDia = dias > 0 ? lucro / dias : 0

  const hasCalc = valor > 0 && km > 0 && cKm > 0

  const veredito = !hasCalc ? null
    : margem >= 20 ? { label: '✅ Ótimo contrato', color: '#059669', bg: '#D1FAE5', desc: `Margem confortável de ${margem.toFixed(1)}%` }
    : margem >= 10 ? { label: '✅ Bom contrato',   color: '#059669', bg: '#D1FAE5', desc: `Margem de ${margem.toFixed(1)}%` }
    : margem >= 0  ? { label: '⚠️ No limite',       color: '#D97706', bg: '#FEF3C7', desc: `Margem apertada: ${margem.toFixed(1)}%` }
    :                { label: '❌ Abaixo do custo', color: '#DC2626', bg: '#FEE2E2', desc: `Prejuízo de ${formatBRL(Math.abs(lucro))}` }

  function handleClear() {
    setValorFrete(''); setDistanciaKm(''); setDiasViagem('2'); setPedagio('')
    if (custoKmReal) setCustoKm(custoKmReal.toFixed(2))
  }

  return (
    <div className="max-w-lg mx-auto space-y-xl">

      {/* Aviso custo/km do DRE */}
      {custoKmReal ? (
        <div className="px-md py-sm rounded-md text-body-sm"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}>
          💡 Usando seu custo real do DRE: <strong>{formatBRL(custoKmReal)}/km</strong>
        </div>
      ) : (
        <div className="px-md py-sm rounded-md text-body-sm"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
          ⚠ Lance custos no DRE para calcular com seu custo real. Ou informe manualmente abaixo.
        </div>
      )}

      {/* Inputs */}
      <Card>
        <CardHeader label="Dados do frete" />
        <CardBody>
          <div className="space-y-lg">
            <Input label="Valor do frete (R$)" name="valor" inputMode="decimal"
              value={valorFrete} onChange={e => setValorFrete(e.target.value.replace(/[^\d,]/g,''))}
              placeholder="Ex: 8.000" />
            <Input label="Distância (km)" name="km" inputMode="decimal"
              value={distanciaKm} onChange={e => setDistanciaKm(e.target.value.replace(/[^\d,]/g,''))}
              placeholder="Ex: 1.250" />
            <Input label="Seu custo por km (R$/km)" name="custokm" inputMode="decimal"
              value={custoKm} onChange={e => setCustoKm(e.target.value.replace(/[^\d,]/g,''))}
              placeholder="Ex: 1,87" />
            <div className="grid grid-cols-2 gap-md">
              <Input label="Dias de viagem" name="dias" type="number" min="1"
                value={diasViagem} onChange={e => setDiasViagem(e.target.value)} />
              <Input label="Pedágio estimado (R$)" name="pedagio" inputMode="decimal"
                value={pedagio} onChange={e => setPedagio(e.target.value.replace(/[^\d,]/g,''))}
                placeholder="0,00" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Resultado */}
      {hasCalc && (
        <Card elevated>
          <CardHeader label="Análise do frete" />
          <CardBody>
            {/* Veredito */}
            {veredito && (
              <div className="px-md py-md rounded-md mb-xl"
                style={{ background: veredito.bg, border: `1px solid ${veredito.color}30` }}>
                <p className="text-body font-medium" style={{ color: veredito.color }}>{veredito.label}</p>
                <p className="text-body-sm mt-xs" style={{ color: veredito.color, opacity: 0.8 }}>{veredito.desc}</p>
              </div>
            )}

            {/* Números */}
            <div className="grid grid-cols-2 gap-md">
              {[
                { label: 'Valor do frete',  val: formatBRL(valor),       highlight: false },
                { label: 'Custo estimado',  val: formatBRL(custoTotal),  highlight: false },
                { label: 'Lucro líquido',   val: formatBRL(lucro),       highlight: true, color: lucro >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
                { label: 'Margem',          val: `${margem.toFixed(1)}%`, highlight: true, color: margem >= 10 ? 'var(--color-success)' : margem >= 0 ? 'var(--color-warning)' : 'var(--color-danger)' },
                { label: 'R$/km recebido',  val: formatBRL(valorPorKm) + '/km', highlight: false },
                { label: 'Lucro/dia',       val: formatBRL(lucrosPorDia), highlight: false },
              ].map(item => (
                <div key={item.label} className="py-sm border-b border-ag-border">
                  <p className="caption text-ag-muted mb-xs">{item.label}</p>
                  <p className="text-body font-medium" style={{ color: item.highlight && item.color ? item.color : 'var(--color-text-primary)' }}>
                    {item.val}
                  </p>
                </div>
              ))}
            </div>

            {/* Barra de composição */}
            {valor > 0 && (
              <div className="mt-lg">
                <p className="caption text-ag-muted mb-sm">Composição do valor do frete</p>
                <div className="h-4 rounded-full overflow-hidden flex"
                  style={{ background: 'var(--color-surface)' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, (custoTotal / valor) * 100))}%`, background: 'var(--color-danger)', borderRadius: 'var(--radius-pill) 0 0 var(--radius-pill)' }} />
                  {lucro > 0 && (
                    <div style={{ width: `${(lucro / valor) * 100}%`, background: 'var(--color-success)' }} />
                  )}
                </div>
                <div className="flex justify-between mt-xs">
                  <span className="caption" style={{ color: 'var(--color-danger)' }}>Custo {((custoTotal / valor) * 100).toFixed(0)}%</span>
                  {lucro > 0 && <span className="caption" style={{ color: 'var(--color-success)' }}>Lucro {((lucro / valor) * 100).toFixed(0)}%</span>}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Button variant="secondary" fullWidth onClick={handleClear}>Limpar</Button>
    </div>
  )
}
