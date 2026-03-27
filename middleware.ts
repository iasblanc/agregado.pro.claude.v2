import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware mínimo — apenas renova cookies de sessão Supabase.
 * SEM lógica de redirect (evita incompatibilidades com Edge Runtime).
 * O auth guard é feito em cada Server Component individualmente.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  try {
    createServerClient(
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
  } catch {
    // Edge Runtime pode não suportar todos os módulos — ignorar silenciosamente
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Apenas rotas autenticadas — excluir auth, api, estáticos
    '/(gestao|contratos|dre|banco|score|credito|beneficios|perfil|meus-contratos|transicao-banco)(.*)',
  ],
}
