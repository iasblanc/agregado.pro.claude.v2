'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header }    from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { formatBRL } from '@/lib/utils'

const DEFAULTS = {
  // Fixos mensais
  parcela:       1800,
  seguro:        380,
  ipva:          150,
  rastreador:    80,
  outros_fixos:  120,
  // Variáveis por km
  diesel_km:     0,        // calculado
  consumo_lkm:   2.5,      // km por litro diesel (cavalo)
  diesel_preco:  6.2,      // R$/litro
  pedagio_km:    0.12,     // R$/km
  pneu_km:       0.08,     // R$/km
  manutencao_km: 0.06,     // R$/km
  // Operação
  km_mes:        8000,
  // Receita
  valor_frete:   0,
  km_frete:      1250,
}

function num(v: string) { return parseFloat(v.replace(',', '.')) || 0 }

export function CalculadoraClient() {
  const router = useRouter()
  const [f, setF] = useState(DEFAULTS)
  const set = (k: keyof typeof DEFAULTS, v: number) => setF(prev => ({ ...prev, [k]: v }))
  const val = (k: keyof typeof DEFAULTS) => String(f[k])

  // Cálculos
  const custoFixoMensal  = f.parcela + f.seguro + f.ipva + f.rastreador + f.outros_fixos
  const dieselKm         = f.diesel_preco / f.consumo_lkm
  const custoVarKm       = dieselKm + f.pedagio_km + f.pneu_km + f.manutencao_km
  const custoFixoKm      = f.km_mes > 0 ? custoFixoMensal / f.km_mes : 0
  const custoTotalKm     = custoVarKm + custoFixoKm

  // Frete
  const receitaKm        = f.km_frete > 0 ? f.valor_frete / f.km_frete : 0
  const margemKm         = receitaKm - custoTotalKm
  const margemPct        = receitaKm > 0 ? (margemKm / receitaKm) * 100 : 0
  const lucroPrejuizo    = f.valor_frete - (custoTotalKm * f.km_frete)
  const pontoEquilíbrio  = custoTotalKm > 0 ? custoFixoMensal / (receitaKm - custoVarKm) : 0

  const viabilidade =
    margemPct >= 15 ? { label: '✅ Frete saudável',     color: '#059669', bg: '#D1FAE5' } :
    margemPct >= 0  ? { label: '⚠️ No limite',          color: '#D97706', bg: '#FEF3C7' } :
                      { label: '❌ Abaixo do custo',    color: '#DC2626', bg: '#FEE2E2' }

  const iRow = (label: string, k: keyof typeof DEFAULTS, suffix = '') => (
    <div key={label} className="flex items-center justify-between gap-md">
      <span className="text-body-sm text-ag-secondary">{label}</span>
      <div className="flex items-center gap-xs">
        <input
          type="number" step="0.01"
          value={f[k]} onChange={e => set(k, num(e.target.value))}
          className="w-24 px-sm py-xs border border-ag-border rounded-md text-body-sm text-right bg-ag-bg text-ag-primary"
          style={{ outline: 'none' }}
        />
        {suffix && <span className="text-body-sm text-ag-muted w-8">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <Header title="Calculadora de Custo/km" subtitle="Descubra o custo real por quilômetro" />
      <main className="flex-1 px-lg py-xl md:px-xl overflow-auto">
        <div className="max-w-2xl mx-auto space-y-xl">

          {/* Resultado principal */}
          <Card elevated>
            <CardBody>
              <div className="text-center space-y-sm py-sm">
                <p className="overline">Seu custo real por km</p>
                <p className="font-display text-[48px] font-medium text-ag-primary" style={{ lineHeight: 1 }}>
                  {formatBRL(custoTotalKm)}
                  <span className="text-[20px] text-ag-muted font-normal">/km</span>
                </p>
                <div className="flex justify-center gap-lg text-body-sm text-ag-secondary pt-sm">
                  <span>Fixo: {formatBRL(custoFixoKm)}/km</span>
                  <span>Variável: {formatBRL(custoVarKm)}/km</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Custos fixos */}
          <Card>
            <CardHeader label="Custos fixos mensais" />
            <CardBody>
              <div className="space-y-md">
                {iRow('Parcela financiamento', 'parcela', 'R$')}
                {iRow('Seguro do caminhão', 'seguro', 'R$')}
                {iRow('IPVA / Licenciamento', 'ipva', 'R$')}
                {iRow('Rastreador', 'rastreador', 'R$')}
                {iRow('Outros fixos', 'outros_fixos', 'R$')}
                <div className="flex justify-between pt-sm border-t border-ag-border">
                  <span className="text-body-sm font-medium text-ag-primary">Total fixo/mês</span>
                  <span className="text-body-sm font-medium text-ag-primary">{formatBRL(custoFixoMensal)}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Custos variáveis */}
          <Card>
            <CardHeader label="Custos variáveis por km" />
            <CardBody>
              <div className="space-y-md">
                <div className="flex items-center justify-between gap-md">
                  <span className="text-body-sm text-ag-secondary">Consumo do caminhão</span>
                  <div className="flex items-center gap-xs">
                    <input type="number" step="0.1" value={f.consumo_lkm}
                      onChange={e => set('consumo_lkm', num(e.target.value))}
                      className="w-24 px-sm py-xs border border-ag-border rounded-md text-body-sm text-right bg-ag-bg text-ag-primary"
                      style={{ outline: 'none' }} />
                    <span className="text-body-sm text-ag-muted w-8">km/L</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-md">
                  <span className="text-body-sm text-ag-secondary">Preço diesel</span>
                  <div className="flex items-center gap-xs">
                    <input type="number" step="0.01" value={f.diesel_preco}
                      onChange={e => set('diesel_preco', num(e.target.value))}
                      className="w-24 px-sm py-xs border border-ag-border rounded-md text-body-sm text-right bg-ag-bg text-ag-primary"
                      style={{ outline: 'none' }} />
                    <span className="text-body-sm text-ag-muted w-8">R$/L</span>
                  </div>
                </div>
                <div className="flex justify-between pt-xs">
                  <span className="text-body-sm text-ag-muted">Diesel/km calculado</span>
                  <span className="text-body-sm text-ag-primary">{formatBRL(dieselKm)}/km</span>
                </div>
                {iRow('Pedágios', 'pedagio_km', '/km')}
                {iRow('Pneus/borracharia', 'pneu_km', '/km')}
                {iRow('Manutenção/peças', 'manutencao_km', '/km')}
                <div className="flex justify-between pt-sm border-t border-ag-border">
                  <span className="text-body-sm font-medium text-ag-primary">Total variável/km</span>
                  <span className="text-body-sm font-medium text-ag-primary">{formatBRL(custoVarKm)}/km</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Operação */}
          <Card>
            <CardHeader label="Operação mensal" />
            <CardBody>
              <div className="space-y-md">
                {iRow('Km rodados por mês', 'km_mes', 'km')}
                <div className="flex justify-between pt-sm border-t border-ag-border">
                  <span className="text-body-sm font-medium text-ag-primary">Custo fixo por km</span>
                  <span className="text-body-sm font-medium text-ag-primary">{formatBRL(custoFixoKm)}/km</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Análise de frete */}
          <Card>
            <CardHeader label="Analisar um frete" />
            <CardBody>
              <div className="space-y-md">
                {iRow('Valor do frete', 'valor_frete', 'R$')}
                {iRow('Distância da rota', 'km_frete', 'km')}

                {f.valor_frete > 0 && f.km_frete > 0 && (
                  <div className="space-y-md pt-sm border-t border-ag-border">
                    <div className="px-md py-sm rounded-md"
                      style={{ background: viabilidade.bg, color: viabilidade.color }}>
                      <p className="text-body-sm font-medium">{viabilidade.label}</p>
                      <p className="text-body-sm mt-xs">
                        Margem: {margemPct.toFixed(1)}% · {lucroPrejuizo >= 0 ? 'Lucro' : 'Prejuízo'}: {formatBRL(Math.abs(lucroPrejuizo))}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-md text-sm">
                      <div>
                        <p className="caption text-ag-muted">Receita/km</p>
                        <p className="text-body-sm font-medium text-ag-primary">{formatBRL(receitaKm)}/km</p>
                      </div>
                      <div>
                        <p className="caption text-ag-muted">Custo/km</p>
                        <p className="text-body-sm font-medium text-ag-primary">{formatBRL(custoTotalKm)}/km</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Button variant="secondary" fullWidth onClick={() => router.back()}>
            ← Voltar
          </Button>
        </div>
      </main>
    </div>
  )
}
