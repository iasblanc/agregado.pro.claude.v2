'use client'
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useToast }  from '@/components/ui/toast'
import { Button }    from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'

export function CandidatarButton({
  contractId, profileId, custoKmReal,
}: {
  contractId: string; profileId: string; custoKmReal?: number | null
}) {
  const [isPending, startTransition] = useTransition()
  const [done,    setDone]    = useState(false)
  const [open,    setOpen]    = useState(false)
  const [message, setMessage] = useState('')
  const { success, error: toastError } = useToast()
  const router = useRouter()

  async function handleCandidatar() {
    startTransition(async () => {
      const res = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          contract_id:           contractId,
          message:               message || undefined,
          cost_per_km_snapshot:  custoKmReal ?? 0,
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
    <div className="space-y-md p-md rounded-xl border border-ag-border" style={{ background: 'var(--color-surface)' }}>
      <p className="text-body-sm font-medium text-ag-primary">Enviar candidatura</p>
      {custoKmReal && custoKmReal > 0 && (
        <p className="caption text-ag-muted">
          Seu custo/km atual: <strong>{formatBRL(custoKmReal)}/km</strong> (capturado do DRE)
        </p>
      )}
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Apresentação opcional — experiência, disponibilidade, veículo..."
        maxLength={300}
        rows={3}
        className="w-full px-md py-sm border border-ag-border rounded-md text-body-sm bg-ag-bg text-ag-primary resize-none focus:outline-none focus:border-ag-accent"
      />
      <div className="flex gap-sm">
        <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>Cancelar</Button>
        <Button fullWidth loading={isPending} onClick={handleCandidatar}>
          Confirmar candidatura
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
