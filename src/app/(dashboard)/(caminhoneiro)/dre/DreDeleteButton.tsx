'use client'

import { useTransition } from 'react'
import { useRouter }     from 'next/navigation'

export function DreDeleteButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm('Excluir este lançamento?')) return
    startTransition(async () => {
      await fetch(`/api/dre/entries?id=${entryId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-ag-muted hover:text-[var(--color-danger)] transition-colors p-xs"
      aria-label="Excluir lançamento"
    >
      {isPending ? '...' : '✕'}
    </button>
  )
}
