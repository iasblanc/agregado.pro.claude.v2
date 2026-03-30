'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser }     from '@/hooks/useUser'

type NavItem = { href: string; label: string; icon: string }

const CAMINHONEIRO: NavItem[] = [
  { href: '/gestao',              label: 'Gestão',  icon: '📊' },
  { href: '/dre',                 label: 'DRE',     icon: '📈' },
  { href: '/contratos',           label: 'Vagas',   icon: '📋' },
  { href: '/gestao/calculadora',  label: 'Calcular', icon: '🧮' },
  { href: '/score',               label: 'Score',   icon: '🎯' },
]

const TRANSPORTADORA: NavItem[] = [
  { href: '/meus-contratos', label: 'Contratos', icon: '📋' },
  { href: '/perfil',         label: 'Perfil',    icon: '🏢' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { role }  = useUser()

  const items = role === 'transportadora' ? TRANSPORTADORA : CAMINHONEIRO

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
      style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}
      aria-label="Navegação mobile">
      <div className="flex items-stretch">
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} prefetch={false}
              className="flex-1 flex flex-col items-center justify-center gap-xs py-sm transition-colors"
              style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
              aria-current={isActive ? 'page' : undefined}>
              <span className="text-[18px]" aria-hidden="true">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-[2px] rounded-full"
                  style={{ background: 'var(--color-text-primary)' }} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
