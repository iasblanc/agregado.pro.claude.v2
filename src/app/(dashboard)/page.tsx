import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME_ROUTES, type UserRole } from '@/lib/constants'

/**
 * /dashboard — Redireciona para a área correta por role.
 *
 * Caminhoneiro   → /gestao
 * Transportadora → /contratos
 * Admin          → /admin/usuarios
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role  = (profile?.role as UserRole) ?? 'caminhoneiro'
  const route = ROLE_HOME_ROUTES[role] ?? '/gestao'

  redirect(route)
}
