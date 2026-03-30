'use client'
import { useTransition }  from 'react'
import { useRouter }      from 'next/navigation'
import { useToast }       from '@/components/ui/toast'

export function CandidaturaActions({ candidaturaId }: { candidaturaId: string }) {
  const [isPending, startTransition] = useTransition()
  const { success, error } = useToast()
  const router = useRouter()

  async function handleAction(action: 'aceitar' | 'rejeitar') {
    startTransition(async () => {
      const res = await fetch(`/api/candidatures?id=${candidaturaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action }),
      })
      if (!res.ok) { error('Erro ao atualizar candidatura'); return }
      success(action === 'aceitar' ? '✅ Candidatura aceita!' : 'Candidatura recusada')
      router.refresh()
    })
  }

  return (
    <div className="flex gap-sm shrink-0">
      <button onClick={() => handleAction('rejeitar')} disabled={isPending}
        className="px-sm py-xs rounded-md text-body-sm border border-ag-border text-ag-secondary hover:text-ag-primary transition-colors">
        Recusar
      </button>
      <button onClick={() => handleAction('aceitar')} disabled={isPending}
        className="px-sm py-xs rounded-md text-body-sm font-medium text-[var(--color-cta-text)] transition-colors"
        style={{ background: 'var(--color-accent)' }}>
        {isPending ? '...' : 'Aceitar'}
      </button>
    </div>
  )
}
