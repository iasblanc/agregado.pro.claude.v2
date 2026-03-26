export const dynamic = 'force-dynamic'

import { redirect }      from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient }  from '@/lib/supabase/server'
import { Sidebar }       from '@/components/layout/Sidebar'
import { MobileNav }     from '@/components/layout/MobileNav'

/**
 * Layout do dashboard — todas as rotas autenticadas.
 *
 * Segurança (server-side):
 * 1. Verifica sessão ativa — sem sessão → /login
 * 2. Verifica profile existe — sem profile → erro
 * 3. Verifica is_active — conta inativa → /login
 *
 * O middleware.ts faz a verificação primária de sessão.
 * Este layout faz a verificação secundária com dados do banco.
 * RLS no Supabase é a terceira e definitiva camada.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  // Verificar sessão
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser()

  if (sessionError || !user) {
    redirect('/login')
  }

  // Verificar profile e status
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    // Profile não criado ainda (race condition no trigger) — aguardar
    redirect('/login?error=profile_not_found')
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=account_inactive')
  }

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
