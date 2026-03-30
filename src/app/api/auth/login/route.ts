import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, COOKIE_ACCESS, COOKIE_REFRESH } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   60 * 60 * 24 * 7, // 7 dias
}

export async function POST(request: NextRequest) {
  // Log IP para auditoria — rate limiting via Supabase audit_events
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha obrigatórios.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', data.user.id).single()

  const roleRoutes: Record<string, string> = {
    caminhoneiro:   '/gestao',
    transportadora: '/meus-contratos',
    admin:          '/admin',
  }
  const redirectTo = roleRoutes[profile?.role ?? ''] ?? '/gestao'

  console.log('[LOGIN] success', data.user.email, '→', redirectTo)
  console.log('[LOGIN] access_token length:', data.session.access_token.length)

  const response = NextResponse.json({ redirectTo })
  response.cookies.set(COOKIE_ACCESS,  data.session.access_token,  COOKIE_OPTS)
  response.cookies.set(COOKIE_REFRESH, data.session.refresh_token, COOKIE_OPTS)
  return response
}
