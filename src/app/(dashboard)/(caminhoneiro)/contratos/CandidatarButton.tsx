'use client'
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useToast }  from '@/components/ui/toast'
import { Button }    from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'

interface Vehicle { id: string; brand: string; model: string; year: number; plate: string; type: string }

export function CandidatarButton({
  contractId,
  profileId,
  custoKmReal,
  vehicles = [],
  vehicleType,
}: {
  contractId: string
  profileId:  string
  custoKmReal?: number | null
  vehicles?:   Vehicle[]
  vehicleType?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [done,      setDone]      = useState(false)
  const [open,      setOpen]      = useState(false)
  const [message,   setMessage]   = useState('')
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const { success, error: toastError } = useToast()
  const router = useRouter()

  // Filtrar veículos compatíveis com o tipo do contrato
  const compatibleVehicles = vehicleType
    ? vehicles.filter(v => v.type?.toLowerCase().includes(vehicleType.toLowerCase()) || vehicleType.toLowerCase().includes(v.type?.toLowerCase() ?? ''))
    : vehicles
  const showVehicles = vehicles.length > 0

  async function handleCandidatar() {
    startTransition(async () => {
      const res = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          contract_id:          contractId,
          vehicle_id:           vehicleId || undefined,
          message:              message || undefined,
          cost_per_km_snapshot: custoKmReal ?? 0,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        toastError(d.error ?? 'Erro ao candidatar')
        return
      }
      success('✅ Candidatura enviada!')
      setDone(true); setOpen(false)
      router.refresh()
    })
  }

  if (done) return (
    <div className="px-md py-sm rounded-md text-body-sm text-center"
      style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
      ✅ Candidatura enviada
    </div>
  )

  if (open) return (
    <div className="space-y-md p-md rounded-xl border border-ag-border"
      style={{ background: 'var(--color-surface)' }}>
      <p className="text-body-sm font-medium text-ag-primary">Confirmar candidatura</p>

      {/* Seletor de veículo */}
      {showVehicles && (
        <div>
          <p className="caption text-ag-muted mb-xs">Selecionar veículo</p>
          <div className="space-y-xs">
            {vehicles.map(v => (
              <label key={v.id}
                className="flex items-center gap-sm py-sm px-md rounded-md border cursor-pointer transition-all"
                style={{
                  background:  vehicleId === v.id ? 'var(--color-surface)' : 'var(--color-bg)',
                  borderColor: vehicleId === v.id ? 'var(--color-accent)' : 'var(--color-border)',
                }}>
                <input type="radio" name="vehicle" value={v.id} checked={vehicleId === v.id}
                  onChange={() => setVehicleId(v.id)} className="sr-only" />
                <span className="text-[18px]">🚛</span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-ag-primary">{v.brand} {v.model} {v.year}</p>
                  <p className="caption text-ag-muted">{v.type} · {v.plate}</p>
                </div>
                {vehicleId === v.id && <span className="text-[var(--color-accent)]">✓</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Custo/km real */}
      {custoKmReal && custoKmReal > 0 && (
        <p className="caption text-ag-muted">
          💰 Seu custo/km do DRE: <strong>{formatBRL(custoKmReal)}/km</strong> — enviado automaticamente
        </p>
      )}

      {/* Mensagem */}
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Mensagem para a transportadora (opcional)..."
        maxLength={300}
        rows={2}
        className="w-full px-md py-sm border border-ag-border rounded-md text-body-sm bg-ag-bg text-ag-primary resize-none focus:outline-none focus:border-ag-accent"
      />

      <div className="flex gap-sm">
        <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>Cancelar</Button>
        <Button fullWidth loading={isPending} onClick={handleCandidatar}>
          Confirmar
        </Button>
      </div>
    </div>
  )

  return (
    <Button fullWidth onClick={() => setOpen(true)}>
      Me candidatar
    </Button>
  )
}
