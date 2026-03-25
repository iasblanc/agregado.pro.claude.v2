import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

/**
 * Supabase Server Client — Server Components e API Routes.
 *
 * ⚠️ REGRA CRÍTICA:
 * - Importa 'server-only' — erro em build se importado no cliente
 * - Usa cookies() do Next.js para gerenciar sessão no servidor
 * - Toda operação filtrada pelo RLS do Supabase
 * - Para operações admin (sem RLS) → usar createAdminClient
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component read-only — ignorar em RSC
          }
        },
      },
    }
  )
}

/**
 * Supabase Admin Client — bypassa o RLS.
 *
 * ⚠️ USO EXTREMAMENTE RESTRITO:
 * - Apenas em Edge Functions e operações de sistema
 * - Nunca expor no frontend ou em rotas de usuário
 * - Requer SUPABASE_SERVICE_ROLE_KEY (nunca NEXT_PUBLIC_)
 * - Toda operação deve ser auditada manualmente
 */
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
