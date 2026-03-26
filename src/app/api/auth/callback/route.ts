export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME_ROUTES, type UserRole } from '@/lib/constants'

/**
 * GET /api/auth/callback
 *
 * Rota de callback do Supabase Auth.
 * Chamada após:
 * - Confirmação de e-mail no cadastro
 * - Link de reset de senha
 * - OAuth (futuro)
 *
 * Segurança:
 * - Troca o code por sessão no servidor
 * - Nunca expõe tokens no cliente
 * - Valida origin via Supabase
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Validar next — apenas paths relativos (evitar open redirect)
  const safeNext = next.startsWith('/') ? next : '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // Se vier de reset de senha — redirecionar para nova-senha
  if (safeNext === '/nova-senha') {
    return NextResponse.redirect(`${origin}/nova-senha`)
  }

  // Buscar role para redirecionar para área correta
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.session.user.id)
    .single()

  const role  = (profile?.role as UserRole) ?? 'caminhoneiro'
  const route = ROLE_HOME_ROUTES[role] ?? '/gestao'

  return NextResponse.redirect(`${origin}${route}`)
}
