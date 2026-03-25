'use client'

import { useState }    from 'react'
import Link            from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * EntradaRapida — Botão de Ação Flutuante (FAB) para mobile.
 *
 * Permite ao caminhoneiro lançar uma despesa ou receita com 1 toque,
 * sem precisar navegar pelo menu. Aparece apenas nas páginas de gestão e DRE.
 *
 * Mobile-first: o caminhoneiro usa smartphone na estrada.
 */
export function EntradaRapida() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Apenas em páginas relevantes
  const showOn = ['/gestao', '/dre']
  if (!showOn.some((p) => pathname.startsWith(p))) return null

  const actions = [
    { href: '/gestao/lancamento?type=receita',        label: 'Receita',    icon: '📥', color: 'var(--color-success)' },
    { href: '/gestao/lancamento?type=custo_variavel', label: 'Despesa',    icon: '⛽', color: 'var(--color-danger)'  },
    { href: '/gestao/lancamento?type=custo_fixo',     label: 'Custo fixo', icon: '📌', color: 'var(--color-warning)' },
  ]

  return (
    <div className="md:hidden fixed bottom-20 right-lg z-50" aria-label="Ações rápidas">
      {/* Ações expandidas */}
      {open && (
        <div className="flex flex-col gap-sm items-end mb-sm animate-[fadeInUp_0.15s_ease-out]">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-sm px-md py-sm rounded-pill shadow-md text-body-sm font-medium"
              style={{
                background: 'var(--color-bg)',
                border:     `1px solid ${action.color}44`,
                color:      'var(--color-text-primary)',
              }}
            >
              <span aria-hidden="true">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      )}

      {/* Botão principal */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fechar ações rápidas' : 'Novo lançamento rápido'}
        className={[
          'w-14 h-14 rounded-full shadow-lg flex items-center justify-center',
          'text-[24px] transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ag-accent',
          open
            ? 'rotate-45 bg-ag-accent text-ag-cta-text'
            : 'bg-ag-cta text-ag-cta-text hover:opacity-90',
        ].join(' ')}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
}
