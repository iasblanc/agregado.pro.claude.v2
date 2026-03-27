import type { ReactNode } from 'react'
import { Sidebar }    from '@/components/layout/Sidebar'
import { MobileNav }  from '@/components/layout/MobileNav'

/**
 * Layout autenticado — envolve TODAS as rotas protegidas.
 * Sidebar (desktop) + MobileNav (mobile) + área de conteúdo.
 * Auth check feito em cada page individualmente via createClient().
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ag-bg">
      {/* Sidebar — desktop */}
      <Sidebar />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 pb-[60px] md:pb-0">
        {children}
      </div>

      {/* Nav mobile — fixada na parte inferior */}
      <MobileNav />
    </div>
  )
}
