'use client'
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

const TIPOS_VEICULO = ['Toco','Truck','Cavalo 4x2','Cavalo 6x2','Cavalo 6x4','3/4','Van']
const TIPOS_PAGAMENTO = [
  { value: 'por_viagem', label: 'Por viagem' },
  { value: 'por_km',     label: 'Por km rodado' },
  { value: 'mensal',     label: 'Mensal fixo' },
  { value: 'por_tonelada', label: 'Por tonelada' },
]

export function NovoContratoForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState('')
  const [form, setForm]     = useState({
    title: '', route_origin: '', route_destination: '', route_km: '',
    vehicle_type: 'Truck', equipment_type: '', contract_value: '',
    payment_type: 'por_viagem', duration_months: '', description: '',
    has_risk_management: false, requires_own_truck: true, status: 'rascunho',
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault()
    if (!form.title || !form.route_origin || !form.route_destination || !form.contract_value)
      { setError('Preencha os campos obrigatórios'); return }
    setError('')

    startTransition(async () => {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...form,
          route_km:       Number(form.route_km.replace(',','.')),
          contract_value: Number(form.contract_value.replace(',','.')),
          duration_months: form.duration_months ? Number(form.duration_months) : undefined,
          status: publish ? 'publicado' : 'rascunho',
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro'); return }
      router.push('/meus-contratos')
      router.refresh()
    })
  }

  return (
    <form className="max-w-2xl mx-auto space-y-xl">
      {/* Tipo de veículo */}
      <div>
        <p className="text-body-sm font-medium text-ag-primary mb-sm">Tipo de veículo *</p>
        <div className="flex flex-wrap gap-sm">
          {TIPOS_VEICULO.map(t => (
            <button key={t} type="button" onClick={() => set('vehicle_type', t)}
              className="px-md py-sm rounded-pill border text-body-sm transition-all"
              style={{
                background:  form.vehicle_type === t ? 'var(--color-accent)' : 'transparent',
                borderColor: form.vehicle_type === t ? 'var(--color-accent)' : 'var(--color-border)',
                color:       form.vehicle_type === t ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
              }}>{t}</button>
          ))}
        </div>
      </div>

      <Input label="Título da vaga *" name="title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Agregado para rota SP-BH em Truck" required />

      <div className="grid grid-cols-2 gap-md">
        <Input label="Origem *" name="origin" value={form.route_origin} onChange={e => set('route_origin', e.target.value)} placeholder="São Paulo, SP" required />
        <Input label="Destino *" name="dest" value={form.route_destination} onChange={e => set('route_destination', e.target.value)} placeholder="Belo Horizonte, MG" required />
      </div>

      <Input label="Distância (km)" name="km" value={form.route_km} onChange={e => set('route_km', e.target.value)} placeholder="Ex: 1250" inputMode="decimal" />

      {/* Tipo de pagamento */}
      <div>
        <p className="text-body-sm font-medium text-ag-primary mb-sm">Forma de pagamento *</p>
        <div className="flex flex-wrap gap-sm">
          {TIPOS_PAGAMENTO.map(t => (
            <button key={t.value} type="button" onClick={() => set('payment_type', t.value)}
              className="px-md py-sm rounded-pill border text-body-sm transition-all"
              style={{
                background:  form.payment_type === t.value ? 'var(--color-accent)' : 'transparent',
                borderColor: form.payment_type === t.value ? 'var(--color-accent)' : 'var(--color-border)',
                color:       form.payment_type === t.value ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-md">
        <Input label="Valor (R$) *" name="value" value={form.contract_value} onChange={e => set('contract_value', e.target.value)} placeholder="Ex: 8000" inputMode="decimal" required />
        <Input label="Duração (meses)" name="dur" value={form.duration_months} onChange={e => set('duration_months', e.target.value)} placeholder="Ex: 12" inputMode="numeric" />
      </div>

      <div className="flex items-center gap-sm">
        <input type="checkbox" id="riskman" checked={form.has_risk_management}
          onChange={e => set('has_risk_management', e.target.checked)}
          className="w-4 h-4" />
        <label htmlFor="riskman" className="text-body-sm text-ag-secondary">
          Exige gerenciamento de risco
        </label>
      </div>

      {error && (
        <p className="text-body-sm" style={{ color: 'var(--color-danger)' }}>⚠ {error}</p>
      )}

      <div className="flex gap-md">
        <Button type="button" variant="secondary" fullWidth loading={isPending}
          onClick={e => handleSubmit(e as unknown as React.FormEvent, false)}>
          Salvar rascunho
        </Button>
        <Button type="button" fullWidth loading={isPending}
          onClick={e => handleSubmit(e as unknown as React.FormEvent, true)}>
          Publicar agora
        </Button>
      </div>
    </form>
  )
}
