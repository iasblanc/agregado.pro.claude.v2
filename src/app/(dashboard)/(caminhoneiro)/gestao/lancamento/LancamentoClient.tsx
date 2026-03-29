'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useToast }                from '@/components/ui/toast'
import { Header }  from '@/components/layout/Header'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'

// Categorias por tipo
const CATEGORIAS = {
  receita:          ['Frete fixo mensal', 'Frete por viagem', 'Frete por km', 'Bônus/prêmio', 'Outros'],
  custo_fixo:       ['Parcela financiamento', 'Seguro do caminhão', 'IPVA / Licenciamento', 'Seguro de vida', 'Rastreador', 'RNTRC', 'Outros fixos'],
  custo_variavel:   ['Diesel / Combustível', 'Pedágio', 'Manutenção e peças', 'Pneus', 'Borracharia', 'Lavagem', 'Alimentação (viagem)', 'Hospedagem / Pernoite', 'Outros variáveis'],
  pessoal:          ['Ajudante / Parceiro', 'INSS / Previdência', 'Outros pessoal'],
}

const LABELS: Record<string, string> = {
  receita:        '💵 Receita',
  custo_fixo:     '📌 Custo Fixo',
  custo_variavel: '🔄 Custo Variável',
  pessoal:        '👤 Pessoal',
}

interface Vehicle { id: string; brand: string; model: string; plate: string; type: string }

export function LancamentoClient({
  period,
  preselectedType,
  vehicles,
}: {
  period: string
  preselectedType?: string
  vehicles: Vehicle[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { success, error: toastError } = useToast()

  const [tipo,        setTipo]        = useState<string>(preselectedType ?? 'receita')
  const [categoria,   setCategoria]   = useState('')
  const [descricao,   setDescricao]   = useState('')
  const [valor,       setValor]       = useState('')
  const [kmRodados,   setKmRodados]   = useState('')
  const [vehicleId,   setVehicleId]   = useState(vehicles[0]?.id ?? '')
  const [error,       setError]       = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const categorias = CATEGORIAS[tipo as keyof typeof CATEGORIAS] ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoria) { setError('Selecione uma categoria'); return }
    if (!valor || Number(valor.replace(',', '.')) <= 0) { setError('Valor inválido'); return }
    setError('')

    startTransition(async () => {
      const body: Record<string, unknown> = {
        period,
        entry_type:  tipo,
        category:    categoria,
        description: descricao || categoria,
        amount:      Number(valor.replace(',', '.')),
        vehicle_id:  vehicleId || undefined,
      }
      if (tipo === 'receita' && kmRodados) {
        body.km_reference = Number(kmRodados.replace(',', '.'))
      }

      const res = await fetch('/api/dre/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao salvar')
        return
      }

      success('Lançamento salvo!')
      setTimeout(() => {
        router.push('/gestao')
        router.refresh()
      }, 600)
    })
  }

  // Formatar valor monetário
  function handleValorChange(v: string) {
    const cleaned = v.replace(/[^\d,]/g, '')
    setValor(cleaned)
  }

  const [periodoLabel] = period.split('-').reverse().map(Number)
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [ano, mes] = period.split('-').map(Number)
  const labelPeriodo = `${meses[mes - 1]}/${ano}`

  return (
    <div className="flex flex-col h-full">
      <Header title="Novo lançamento" subtitle={labelPeriodo} />

      <main className="flex-1 px-lg py-xl md:px-xl overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-xl">

          {/* Tipo */}
          <div>
            <p className="text-body-sm font-medium text-ag-primary mb-md">Tipo de lançamento</p>
            <div className="grid grid-cols-2 gap-sm">
              {Object.entries(LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setTipo(key); setCategoria('') }}
                  className="p-md rounded-lg border transition-all text-left"
                  style={{
                    background:   tipo === key ? 'var(--color-accent)' : 'var(--color-bg)',
                    borderColor:  tipo === key ? 'var(--color-accent)' : 'var(--color-border)',
                    color:        tipo === key ? 'var(--color-cta-text)' : 'var(--color-text-primary)',
                  }}
                >
                  <span className="text-body-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <p className="text-body-sm font-medium text-ag-primary mb-md">Categoria</p>
            <div className="flex flex-wrap gap-sm">
              {categorias.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoria(cat)}
                  className="px-md py-sm rounded-pill border text-body-sm transition-all"
                  style={{
                    background:  categoria === cat ? 'var(--color-accent)' : 'transparent',
                    borderColor: categoria === cat ? 'var(--color-accent)' : 'var(--color-border)',
                    color:       categoria === cat ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição (opcional) */}
          <Input
            label="Descrição (opcional)"
            name="descricao"
            placeholder={categoria || 'Ex: Diesel posto BR — rodada SP→BH'}
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />

          {/* Valor */}
          <Input
            label="Valor (R$)"
            name="valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            required
            value={valor}
            onChange={e => handleValorChange(e.target.value)}
          />

          {/* Km — só para receita */}
          {tipo === 'receita' && (
            <Input
              label="Km rodados (opcional)"
              name="km"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 1250"
              value={kmRodados}
              onChange={e => setKmRodados(e.target.value.replace(/[^\d,]/g, ''))}
            />
          )}

          {/* Veículo */}
          {vehicles.length > 1 && (
            <div>
              <p className="text-body-sm font-medium text-ag-primary mb-sm">Veículo</p>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full px-md py-md border border-ag-border rounded-md text-body bg-ag-bg text-ag-primary"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</option>
                ))}
              </select>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="px-md py-sm rounded-md text-body-sm"
              style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}>
              ⚠ {error}
            </div>
          )}

          {showSuccess && (
            <div className="px-md py-sm rounded-md text-body-sm"
              style={{ background: '#F0FDF4', color: '#15803D' }}>
              ✓ Lançamento salvo!
            </div>
          )}

          <div className="flex gap-md">
            <Button type="button" variant="secondary" fullWidth onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth loading={isPending}>
              Salvar lançamento
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
