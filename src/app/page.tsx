export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { ROLE_HOME_ROUTES, type UserRole } from '@/lib/constants'

/**
 * Rota raiz — /
 *
 * Redireciona:
 * - Usuário autenticado → área do seu role
 * - Usuário não autenticado → /login
 *
 * Nunca renderiza conteúdo — é sempre um redirect.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role  = (profile?.role as UserRole) ?? 'caminhoneiro'
  redirect(ROLE_HOME_ROUTES[role] ?? '/gestao')
}
