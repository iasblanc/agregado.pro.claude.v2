'use client'
import { useState, useTransition } from 'react'
import { useToast }  from '@/components/ui/toast'
import { Button }    from '@/components/ui/button'

export function AvaliacaoButton({ contractId, candidatureId, evaluatedId }: {
  contractId: string; candidatureId: string; evaluatedId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [open,   setOpen]  = useState(false)
  const [score,  setScore] = useState(5)
  const [comment, setComment] = useState('')
  const [done,   setDone]  = useState(false)
  const { success, error } = useToast()

  if (done) return (
    <div className="px-md py-sm rounded-md text-body-sm"
      style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
      ✓ Avaliação enviada — obrigado!
    </div>
  )

  if (!open) return (
    <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
      ⭐ Avaliar transportadora
    </Button>
  )

  function handleSubmit() {
    startTransition(async () => {
      const res = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ contract_id: contractId, candidature_id: candidatureId, evaluated_id: evaluatedId, score, comment }),
      })
      if (!res.ok) { const d = await res.json(); error(d.error ?? 'Erro ao avaliar'); return }
      success('Avaliação enviada!')
      setDone(true)
    })
  }

  return (
    <div className="border border-ag-border rounded-xl p-lg space-y-md"
      style={{ background: 'var(--color-surface)' }}>
      <p className="text-body-sm font-medium text-ag-primary">Avaliar transportadora</p>

      {/* Stars */}
      <div className="flex gap-sm">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button" onClick={() => setScore(s)}
            className="text-[28px] transition-transform hover:scale-110"
            style={{ opacity: s <= score ? 1 : 0.3 }}>
            ⭐
          </button>
        ))}
        <span className="text-body-sm text-ag-secondary self-center ml-sm">{score}/5</span>
      </div>

      {/* Comentário */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Comentário opcional (máx. 500 caracteres)"
        maxLength={500}
        rows={3}
        className="w-full px-md py-sm border border-ag-border rounded-md text-body-sm bg-ag-bg text-ag-primary resize-none"
        style={{ outline: 'none' }}
      />

      <div className="flex gap-md">
        <Button type="button" variant="secondary" fullWidth onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="button" fullWidth loading={isPending} onClick={handleSubmit}>Enviar avaliação</Button>
      </div>
    </div>
  )
}
