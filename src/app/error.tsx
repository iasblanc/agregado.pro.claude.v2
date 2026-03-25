'use client'

import { useEffect } from 'react'
import { Button }    from '@/components/ui/button'

interface ErrorPageProps {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log do erro para monitoramento (Sentry em produção)
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-ag-bg flex flex-col items-center justify-center px-lg text-center">
      <p className="overline mb-sm">Algo deu errado</p>
      <h1 className="font-display text-display-md font-medium text-ag-primary mb-md">
        Erro inesperado
      </h1>
      <p className="text-body text-ag-secondary max-w-sm mb-xl">
        Tente novamente. Se o erro persistir, entre em contato com o suporte.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <details className="mb-xl text-left max-w-lg">
          <summary className="caption cursor-pointer text-ag-muted mb-sm">
            Detalhes do erro (dev only)
          </summary>
          <pre className="text-caption bg-ag-surface border border-ag-border rounded-md p-md overflow-auto text-ag-secondary">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        </details>
      )}
      <div className="flex gap-sm">
        <Button variant="secondary" onClick={() => (window.location.href = '/gestao')}>
          Início
        </Button>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  )
}
