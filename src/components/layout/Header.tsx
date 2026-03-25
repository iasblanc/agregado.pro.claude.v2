'use client'

import { useTransition } from 'react'
import { logoutAction }  from '@/app/(auth)/login/actions'
import { useUser }       from '@/hooks/useUser'
import { getInitials }   from '@/lib/utils'

interface HeaderProps {
  title?:    string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { profile, isLoading } = useUser()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <header className="flex items-center justify-between px-lg py-md bg-ag-bg border-b border-ag-border md:px-xl">
      {/* Título da página (quando fornecido) */}
      <div className="flex flex-col gap-xs min-w-0">
        {title && (
          <h1 className="font-display text-display-sm font-medium text-ag-primary truncate">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="caption truncate">{subtitle}</p>
        )}
      </div>

      {/* Ações do header */}
      <div className="flex items-center gap-sm ml-auto shrink-0">
        {/* Notificações — placeholder Phase 2 */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ag-surface transition-colors text-ag-secondary"
          aria-label="Notificações"
          title="Notificações (em breve)"
          disabled
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>

        {/* Avatar + logout */}
        {!isLoading && profile && (
          <div className="flex items-center gap-sm">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-medium shrink-0"
              style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}
              aria-hidden="true"
            >
              {getInitials(profile.full_name)}
            </div>
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="text-body-sm text-ag-secondary hover:text-ag-primary transition-colors disabled:opacity-50"
              aria-label="Sair da conta"
            >
              {isPending ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
