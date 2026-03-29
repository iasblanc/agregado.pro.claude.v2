'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-ag-bg flex items-center justify-center px-lg">
      <div className="text-center space-y-xl max-w-sm">
        <div className="text-[64px]">⚠️</div>
        <div className="space-y-sm">
          <p className="overline" style={{ color: 'var(--color-danger)' }}>Algo deu errado</p>
          <h1 className="font-display text-display-sm font-medium text-ag-primary">Erro inesperado</h1>
          <p className="text-body text-ag-secondary">
            Tente novamente. Se o erro persistir, entre em contato com o suporte.
          </p>
        </div>
        <div className="flex gap-md justify-center">
          <Button variant="secondary" onClick={() => window.location.href = '/gestao'}>
            Início
          </Button>
          <Button onClick={reset}>Tentar novamente</Button>
        </div>
      </div>
    </div>
  )
}
