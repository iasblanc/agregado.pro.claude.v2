'use client'

import Link           from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser }    from '@/hooks/useUser'

// ─── Nav por role ─────────────────────────────────────────────────

type MobileNavItem = { href: string; label: string; icon: string; phase: 1 | 2 | 3 }

const CAMINHONEIRO: MobileNavItem[] = [
  { href: '/gestao',    label: 'Gestão',    icon: '📊', phase: 1 },
  { href: '/dre',       label: 'DRE',       icon: '📈', phase: 1 },
  { href: '/contratos', label: 'Contratos', icon: '📋', phase: 2 },
  { href: '/banco',     label: 'Banco',     icon: '💳', phase: 2 },
]

const TRANSPORTADORA: MobileNavItem[] = [
  { href: '/contratos', label: 'Contratos', icon: '📋', phase: 2 },
  { href: '/perfil',    label: 'Perfil',    icon: '🏢', phase: 1 },
]

const CURRENT_PHASE = 1

// ─── Componente ───────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname()
  const { role } = useUser()

  const items = role === 'transportadora' ? TRANSPORTADORA : CAMINHONEIRO

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-ag-bg border-t border-ag-border z-50 safe-area-pb"
      aria-label="Navegação mobile"
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isLocked = item.phase > CURRENT_PHASE

          return (
            <div key={item.href} className="flex-1">
              {isLocked ? (
                <div
                  className="flex flex-col items-center justify-center gap-xs py-sm opacity-40 cursor-not-allowed"
                  aria-disabled="true"
                >
                  <span className="text-[18px]" aria-hidden="true">{item.icon}</span>
                  <span className="text-[10px] font-medium text-ag-muted">{item.label}</span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={[
                    'flex flex-col items-center justify-center gap-xs py-sm transition-colors',
                    isActive ? 'text-ag-primary' : 'text-ag-muted hover:text-ag-secondary',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="text-[18px]" aria-hidden="true">{item.icon}</span>
                  <span
                    className={[
                      'text-[10px] font-medium',
                      isActive ? 'text-ag-primary' : 'text-ag-muted',
                    ].join(' ')}
                  >
                    {item.label}
                  </span>
                  {/* Indicador ativo */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 w-5 h-[2px] rounded-full bg-ag-primary"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
