'use client'
import { useTransition } from 'react'
import { useRouter }     from 'next/navigation'
import { useToast }      from '@/components/ui/toast'

export function PublicarContratoButton({ contractId }: { contractId: string }) {
  const [isPending, startTransition] = useTransition()
  const { success, error } = useToast()
  const router = useRouter()

  function handlePublish() {
    startTransition(async () => {
      const res = await fetch(`/api/marketplace?id=${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'publicado' }),
      })
      if (!res.ok) { error('Erro ao publicar contrato'); return }
      success('Contrato publicado!')
      router.refresh()
    })
  }

  return (
    <button onClick={handlePublish} disabled={isPending}
      className="text-body-sm font-medium px-sm py-xs rounded-md transition-all"
      style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)',
               opacity: isPending ? 0.7 : 1 }}>
      {isPending ? '...' : 'Publicar'}
    </button>
  )
}
