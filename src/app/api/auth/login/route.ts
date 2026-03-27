import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha obrigatórios.' }, { status: 400 })
  }

  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) { pendingCookies.push(...cookiesToSet) },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
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

  // Log para debug
  console.log('[LOGIN] pendingCookies count:', pendingCookies.length)
  console.log('[LOGIN] cookie names:', pendingCookies.map(c => c.name))

  const response = NextResponse.json({
    redirectTo,
    _debug: { cookieCount: pendingCookies.length, cookieNames: pendingCookies.map(c => c.name) }
  })

  for (const { name, value, options } of pendingCookies) {
    const cookieOpts = {
      ...(options as Record<string, unknown>),
      httpOnly: false,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path:     '/',
    }
    console.log('[LOGIN] setting cookie:', name, 'opts:', cookieOpts)
    response.cookies.set(name, value, cookieOpts)
  }

  // Verificar que cookies foram realmente adicionados
  const setCookieHeader = response.headers.getSetCookie?.() ?? []
  console.log('[LOGIN] Set-Cookie headers count:', setCookieHeader.length)

  return response
}
