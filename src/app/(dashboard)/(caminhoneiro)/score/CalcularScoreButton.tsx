'use client'
import { useTransition } from 'react'
import { useRouter }     from 'next/navigation'
import { useToast }      from '@/components/ui/toast'
import { Button }        from '@/components/ui/button'

export function CalcularScoreButton({ hasData, hasScore }: { hasData: boolean; hasScore: boolean }) {
  const [isPending, startTransition] = useTransition()
  const { success, error, warning }  = useToast()
  const router = useRouter()

  function handleCalcular() {
    if (!hasData) { warning('Lance receitas e custos no DRE primeiro.'); return }
    startTransition(async () => {
      const res = await fetch('/api/score', {
        method: 'POST', credentials: 'same-origin',
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'NO_DATA') warning('Lance mais dados no DRE para calcular o score.')
        else error(data.error ?? 'Erro ao calcular score')
        return
      }
      success(`Score calculado: ${data.score} pontos`)
      router.refresh()
    })
  }

  return (
    <Button fullWidth loading={isPending} onClick={handleCalcular}
      variant={hasData ? 'primary' : 'secondary'}>
      {hasScore ? '🔄 Recalcular score' : '📊 Calcular meu score'}
    </Button>
  )
}
