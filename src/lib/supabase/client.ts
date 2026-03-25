import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Supabase Client — apenas para Client Components.
 *
 * ⚠️ REGRA CRÍTICA:
 * - Este cliente usa a ANON KEY (segura para expor no browser)
 * - Nunca usar em Server Components ou API Routes
 * - Para Server Components → usar @/lib/supabase/server
 * - Toda operação é filtrada pelo RLS do Supabase
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
