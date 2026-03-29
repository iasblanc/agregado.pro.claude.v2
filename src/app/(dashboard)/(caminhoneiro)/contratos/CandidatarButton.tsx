'use client'
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Button } from '@/components/ui/button'

export function CandidatarButton({ contractId, profileId }: { contractId: string; profileId: string }) {
  const [isPending, startTransition] = useTransition()
  const [done,  setDone]  = useState(false)
  const [error, setError] = useState('')
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
        setError(d.error ?? 'Erro ao candidatar')
        return
      }
      setDone(true)
      router.refresh()
    })
  }

  if (done) return (
    <span className="px-md py-sm rounded-md text-body-sm font-medium"
      style={{ background: '#D1FAE5', color: '#059669' }}>
      ✓ Candidatura enviada
    </span>
  )

  if (error) return (
    <span className="text-body-sm" style={{ color: 'var(--color-danger)' }}>⚠ {error}</span>
  )

  return (
    <Button size="sm" loading={isPending} onClick={handleCandidatar}>
      Candidatar-se
    </Button>
  )
}
