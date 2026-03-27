import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha obrigatórios.' }, { status: 400 })
  }

  // Acumular cookies — setAll É chamado de forma síncrona dentro do
  // await signInWithPassword (via _notifyAllSubscribers + Promise.all)
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // chamado DENTRO do await signInWithPassword — síncrono
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  // neste ponto pendingCookies JÁ está populado

  if (error || !data.user) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .single()

  const roleRoutes: Record<string, string> = {
    caminhoneiro:   '/gestao',
    transportadora: '/meus-contratos',
    admin:          '/admin',
    credit_analyst: '/admin/credito',
    compliance:     '/admin/auditoria',
  }
  const redirectTo = roleRoutes[profile?.role ?? ''] ?? '/gestao'

  // Criar o response ÚNICO e aplicar cookies diretamente nele
  const response = NextResponse.json({ redirectTo })

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...(options as Parameters<typeof response.cookies.set>[2]),
      path:     '/',
      sameSite: 'lax',
      secure:   true,
      httpOnly: false,  // browser client precisa ler para rehydration
    })
  })

  return response
}
