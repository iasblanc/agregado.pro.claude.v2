import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

/**
 * updateSession — Renova a sessão do Supabase em cada request.
 * Chamado pelo middleware.ts na raiz do projeto.
 *
 * Garante que:
 * - Tokens de sessão são sempre frescos
 * - Cookies são sincronizados entre cliente e servidor
 * - Usuários não autenticados são redirecionados para login
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Não executar em _next/static, _next/image, favicon
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // Verificar sessão ativa
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas públicas — não requer auth
  const publicRoutes = ['/login', '/cadastro', '/recuperar-senha', '/']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Sem sessão + rota protegida → redirecionar para login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Com sessão + rota de auth → redirecionar para dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/cadastro')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
