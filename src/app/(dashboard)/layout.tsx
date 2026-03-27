import type { ReactNode } from 'react'
import { Sidebar }          from '@/components/layout/Sidebar'
import { MobileNav }        from '@/components/layout/MobileNav'
import { SessionRefresher } from '@/components/SessionRefresher'

/**
 * Layout autenticado — envolve TODAS as rotas protegidas.
 * SessionRefresher garante que tokens Supabase permaneçam válidos.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ag-bg">
      {/* Mantém sessão Supabase viva (client-side) */}
      <SessionRefresher />

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
