import { type NextRequest, NextResponse } from 'next/server'

/**
 * middleware.ts — Passthrough minimal.
 *
 * Auth é feita diretamente em cada Server Component via createClient().
 * O Supabase SSR não é compatível com Edge Runtime (usa __dirname).
 * RLS no banco é a linha de defesa real.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],  // não executar em nenhuma rota
}
