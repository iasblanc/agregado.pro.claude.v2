'use client'
import { useTransition } from 'react'
import { useRouter }     from 'next/navigation'

export function PublicarContratoButton({ contractId }: { contractId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handlePublish() {
    startTransition(async () => {
      await fetch(`/api/marketplace?id=${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'publicado' }),
      })
      router.refresh()
    })
  }

  return (
    <button onClick={handlePublish} disabled={isPending}
      className="text-body-sm font-medium px-sm py-xs rounded-md transition-colors"
      style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}>
      {isPending ? '...' : 'Publicar'}
    </button>
  )
}
