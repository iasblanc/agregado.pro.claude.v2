'use client'

import Link                        from 'next/link'
import { usePathname }             from 'next/navigation'
import { useUser }                 from '@/hooks/useUser'
import { RoleBadge }               from '@/components/ui/badge'
import { getInitials }             from '@/lib/utils'

// ─── Navegação por role ───────────────────────────────────────────

type NavItem = {
  href:  string
  label: string
  icon:  string
  phase: 1 | 2 | 3 | 4 | 5
}

const CAMINHONEIRO_NAV: NavItem[] = [
  { href: '/gestao',     label: 'Gestão',     icon: '📊', phase: 1 },
  { href: '/dre',        label: 'DRE',        icon: '📈', phase: 1 },
  { href: '/contratos',  label: 'Contratos',  icon: '📋', phase: 2 },
  { href: '/banco',      label: 'Banco',      icon: '💳', phase: 2 },
  { href: '/score',      label: 'Score',      icon: '🎯', phase: 3 },
  { href: '/credito',    label: 'Crédito',    icon: '💰', phase: 4 },
  { href: '/beneficios', label: 'Benefícios', icon: '🏆', phase: 5 },
]

const TRANSPORTADORA_NAV: NavItem[] = [
  { href: '/contratos', label: 'Contratos', icon: '📋', phase: 2 },
  { href: '/perfil',    label: 'Perfil',    icon: '🏢', phase: 1 },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/usuarios',   label: 'Usuários',   icon: '👥', phase: 1 },
  { href: '/admin/contratos',  label: 'Contratos',  icon: '📋', phase: 2 },
  { href: '/admin/auditoria',  label: 'Auditoria',  icon: '🔍', phase: 1 },
  { href: '/admin/credito',    label: 'Crédito',    icon: '💰', phase: 3 },
]

// ─── Componente ───────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const { profile, role, isLoading } = useUser()

  const navItems =
    role === 'transportadora' ? TRANSPORTADORA_NAV :
    role === 'admin'          ? ADMIN_NAV           :
    CAMINHONEIRO_NAV

  const CURRENT_PHASE = 5  // Phase 5 ativa — ecossistema completo

  return (
    <aside
      className="hidden md:flex flex-col w-[240px] shrink-0 bg-ag-surface border-r border-ag-border min-h-screen"
      aria-label="Navegação principal"
    >
      {/* Logo */}
      <div className="px-lg py-[var(--space-xl)] border-b border-ag-border">
        <span className="font-display text-[18px] font-medium text-ag-primary">
          Agregado.Pro
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-sm py-md space-y-xs" aria-label="Menu">
        {navItems.map((item) => {
          const isActive   = pathname.startsWith(item.href)
          const isLocked   = item.phase > CURRENT_PHASE

          return (
            <div key={item.href}>
              {isLocked ? (
                // Item bloqueado — fase futura
                <div
                  className={[
                    'flex items-center gap-sm px-md py-sm rounded-md',
                    'text-ag-muted cursor-not-allowed opacity-50',
                  ].join(' ')}
                  aria-disabled="true"
                  title={`Disponível na Phase ${item.phase}`}
                >
                  <span className="text-[16px]" aria-hidden="true">{item.icon}</span>
                  <span className="text-body-sm">{item.label}</span>
                  <span className="ml-auto caption">P{item.phase}</span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={[
                    'flex items-center gap-sm px-md py-sm rounded-md transition-colors duration-150',
                    'text-body-sm font-medium',
                    isActive
                      ? 'bg-ag-bg text-ag-primary shadow-sm border border-ag-border'
                      : 'text-ag-secondary hover:bg-ag-bg hover:text-ag-primary',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="text-[16px]" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* Perfil do usuário */}
      <div className="px-sm py-md border-t border-ag-border">
        {isLoading ? (
          <div className="h-10 bg-ag-bg animate-pulse rounded-md" />
        ) : profile ? (
          <Link
            href="/perfil"
            className="flex items-center gap-sm px-md py-sm rounded-md hover:bg-ag-bg transition-colors group"
          >
            {/* Avatar com iniciais */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-caption font-medium"
              style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}
              aria-hidden="true"
            >
              {getInitials(profile.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-ag-primary truncate">
                {profile.full_name.split(' ')[0]}
              </p>
              <RoleBadge role={profile.role} />
            </div>
          </Link>
        ) : null}
      </div>
    </aside>
  )
}
