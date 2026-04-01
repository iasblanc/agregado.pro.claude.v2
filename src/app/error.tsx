'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-lg"
      style={{ background: 'var(--color-bg)' }}>
      <p className="text-[60px] mb-lg leading-none">⚠️</p>
      <h2 className="font-display text-display-sm font-medium text-ag-primary mb-sm">
        Algo deu errado
      </h2>
      <p className="text-body text-ag-secondary mb-xl max-w-sm">
        Ocorreu um erro inesperado. Tente novamente — se persistir, fale com o suporte.
      </p>
      <button onClick={reset}
        className="px-xl py-md rounded-pill text-body font-medium transition-all"
        style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}>
        Tentar novamente
      </button>
    </div>
  )
}
