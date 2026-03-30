'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'

export function ContratoSearch({
  currentQuery,
  currentTipo,
}: {
  currentQuery: string
  currentTipo:  string
}) {
  const [q, setQ]           = useState(currentQuery)
  const [isPending, start]  = useTransition()
  const router              = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (currentTipo) params.set('tipo', currentTipo)
    if (q.trim())    params.set('q', q.trim())
    start(() => { router.push(`/contratos?${params.toString()}`) })
  }

  function handleClear() {
    setQ('')
    const params = new URLSearchParams()
    if (currentTipo) params.set('tipo', currentTipo)
    start(() => { router.push(`/contratos?${params.toString()}`) })
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-sm">
      <div className="relative flex-1">
        <span className="absolute left-md top-1/2 -translate-y-1/2 text-ag-muted text-[14px]">🔍</span>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por rota, veículo, cidade..."
          className="w-full pl-[36px] pr-md py-sm rounded-lg border border-ag-border bg-ag-bg text-body-sm text-ag-primary placeholder:text-ag-muted focus:outline-none focus:border-ag-accent transition-colors"
        />
        {q && (
          <button type="button" onClick={handleClear}
            className="absolute right-sm top-1/2 -translate-y-1/2 text-ag-muted hover:text-ag-primary transition-colors">
            ×
          </button>
        )}
      </div>
      <button type="submit" disabled={isPending}
        className="px-lg py-sm rounded-lg border border-ag-border text-body-sm font-medium text-ag-secondary hover:text-ag-primary hover:border-ag-accent transition-all whitespace-nowrap"
        style={{ opacity: isPending ? 0.6 : 1 }}>
        {isPending ? '...' : 'Buscar'}
      </button>
    </form>
  )
}
