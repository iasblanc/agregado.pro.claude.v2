import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'

/**
 * POST /api/auth/login
 *
 * Route Handler para login — controle TOTAL sobre cookies e resposta.
 * Diferente de Server Action, aqui o `NextResponse` garante que os
 * cookies de sessão são gravados ANTES do redirect ser enviado ao browser.
 */
export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha obrigatórios.' }, { status: 400 })
  }

  // Criar response para poder setar cookies nela
  const response = NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Gravar cookies DIRETAMENTE no response — garantido antes de retornar
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: false,   // browser client precisa ler
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              path: '/',
            })
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  // Buscar role para decidir rota de destino
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

  // Retornar redirectTo para o cliente setar window.location
  // (cookies já estão no response antes de retornar)
  return NextResponse.json({ redirectTo }, {
    status: 200,
    headers: response.headers,  // inclui Set-Cookie headers
  })
}
