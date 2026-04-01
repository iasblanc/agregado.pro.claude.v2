'use client'

import { useState, useTransition } from 'react'
import { useRouter }
import { useToast }  from '@/components/ui/toast'               from 'next/navigation'
import { Header }    from '@/components/layout/Header'
import { Card, CardBody } from '@/components/ui/card'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'

const TIPOS = ['Toco','Truck','Cavalo 4x2','Cavalo 6x2','Cavalo 6x4','3/4','Van','Automóvel']
const IMPLEMENTOS = ['Baú seco','Baú refrigerado','Graneleiro','Tanque','Plataforma','Cegonha','Caçamba','Sem implemento']

interface Vehicle {
  id: string; type: string; brand: string; model: string
  year: number; plate: string; equipment_type?: string | null; is_active: boolean
}

export function VeiculosClient({ vehicles: initial }: { vehicles: Vehicle[] }) {
  const router  = useRouter()
  const { success, error: toastErr } = useToast()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(initial.length === 0)
  const [error,    setError]    = useState('')

  const [form, setForm] = useState({
    type: 'Truck', brand: '', model: '', year: new Date().getFullYear(), plate: '', equipment_type: ''
  })

  function set(k: string, v: string | number) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brand || !form.model || !form.plate) { setError('Preencha todos os campos obrigatórios'); return }
    setError('')

    startTransition(async () => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ...form, year: Number(form.year) }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao salvar')
        return
      }
      router.refresh()
      setShowForm(false)
      setForm({ type: 'Truck', brand: '', model: '', year: new Date().getFullYear(), plate: '', equipment_type: '' })
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este veículo?')) return
    startTransition(async () => {
      await fetch(`/api/vehicles?id=${id}`, { method: 'DELETE', credentials: 'same-origin' })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Meus Veículos" subtitle="Sua frota cadastrada" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Lista */}
        {initial.length > 0 && (
          <div className="space-y-md">
            {initial.map(v => (
              <Card key={v.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-md">
                    <div>
                      <p className="text-[24px] mb-xs">🚛</p>
                      <p className="text-body font-medium text-ag-primary">{v.brand} {v.model} {v.year}</p>
                      <p className="caption text-ag-muted">{v.type} · {v.plate}</p>
                      {v.equipment_type && <p className="caption text-ag-muted">{v.equipment_type}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="text-ag-muted hover:text-[var(--color-danger)] transition-colors p-xs caption"
                    >
                      Remover
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {initial.length === 0 && !showForm && (
          <Card>
            <CardBody className="text-center py-xl">
              <p className="text-[48px] mb-md">🚛</p>
              <p className="text-body text-ag-secondary mb-xl">Nenhum veículo cadastrado ainda.</p>
            </CardBody>
          </Card>
        )}

        {/* Botão adicionar */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} fullWidth>+ Adicionar veículo</Button>
        )}

        {/* Formulário */}
        {showForm && (
          <Card>
            <CardBody>
              <p className="text-body font-medium text-ag-primary mb-xl">Novo veículo</p>
              <form onSubmit={handleSubmit} className="space-y-lg">
                {/* Tipo */}
                <div>
                  <p className="text-body-sm font-medium text-ag-primary mb-sm">Tipo de veículo *</p>
                  <div className="flex flex-wrap gap-sm">
                    {TIPOS.map(t => (
                      <button key={t} type="button" onClick={() => set('type', t)}
                        className="px-md py-sm rounded-pill border text-body-sm transition-all"
                        style={{
                          background:  form.type === t ? 'var(--color-accent)' : 'transparent',
                          borderColor: form.type === t ? 'var(--color-accent)' : 'var(--color-border)',
                          color:       form.type === t ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
                        }}>{t}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <Input label="Marca *" name="brand" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ex: Scania" required />
                  <Input label="Modelo *" name="model" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Ex: R450" required />
                  <Input label="Ano *" name="year" type="number" value={String(form.year)} onChange={e => set('year', Number(e.target.value))} required />
                  <Input label="Placa *" name="plate" value={form.plate} onChange={e => set('plate', e.target.value.toUpperCase())} placeholder="ABC1234" required />
                </div>

                {/* Implemento */}
                <div>
                  <p className="text-body-sm font-medium text-ag-primary mb-sm">Implemento / Carroceria</p>
                  <div className="flex flex-wrap gap-sm">
                    {IMPLEMENTOS.map(i => (
                      <button key={i} type="button" onClick={() => set('equipment_type', i === 'Sem implemento' ? '' : i)}
                        className="px-md py-sm rounded-pill border text-body-sm transition-all"
                        style={{
                          background:  (i === 'Sem implemento' ? !form.equipment_type : form.equipment_type === i) ? 'var(--color-accent)' : 'transparent',
                          borderColor: (i === 'Sem implemento' ? !form.equipment_type : form.equipment_type === i) ? 'var(--color-accent)' : 'var(--color-border)',
                          color:       (i === 'Sem implemento' ? !form.equipment_type : form.equipment_type === i) ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
                        }}>{i}</button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="px-md py-sm rounded-md text-body-sm"
                    style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}>
                    ⚠ {error}
                  </div>
                )}

                <div className="flex gap-md">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" fullWidth loading={isPending}>Salvar veículo</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
