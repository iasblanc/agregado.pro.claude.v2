import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * middleware.ts — Raiz do projeto
 *
 * Responsabilidades:
 * 1. Renovar sessão Supabase em cada request
 * 2. Proteger rotas autenticadas
 * 3. Redirecionar usuários não autenticados para login
 *
 * ⚠️ SEGURANÇA:
 * - Nunca confiar apenas neste middleware para segurança
 * - Server Components e API Routes devem validar sessão independentemente
 * - RLS no Supabase é a última linha de defesa real
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Executar em todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - Arquivos de imagem (.png, .jpg, .svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
