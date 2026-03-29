'use client'
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useToast }  from '@/components/ui/toast'
import { Button }    from '@/components/ui/button'

export function CandidatarButton({ contractId, profileId }: { contractId: string; profileId: string }) {
  const [isPending, startTransition] = useTransition()
  const [done,  setDone]  = useState(false)
  const { success, error: toastError } = useToast()
  const router = useRouter()

  async function handleCandidatar() {
    startTransition(async () => {
      const res = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ contract_id: contractId }),
      })
      if (!res.ok) {
        const d = await res.json()
        toastError(d.error ?? 'Erro ao candidatar')
        return
      }
      success('Candidatura enviada com sucesso!')
      setDone(true)
      router.refresh()
    })
  }

  if (done) return (
    <span className="px-md py-sm rounded-md text-body-sm font-medium"
      style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
      ✓ Candidatura enviada
    </span>
  )

  return <Button size="sm" loading={isPending} onClick={handleCandidatar}>Candidatar-se</Button>
}
