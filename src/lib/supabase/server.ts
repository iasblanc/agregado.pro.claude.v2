import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

const COOKIE_ACCESS  = 'sb-access-token'
const COOKIE_REFRESH = 'sb-refresh-token'

/**
 * Lê o access token do cookie e verifica com Supabase.
 * Sem @supabase/ssr — JWT direto, zero magic.
 */
export async function getServerUser() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(COOKIE_ACCESS)?.value
  if (!accessToken) return null

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(accessToken)
  if (error || !data.user) return null
  return data.user
}

/**
 * Retorna um client Supabase com o JWT do usuário autenticado.
 * Para queries com RLS.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(COOKIE_ACCESS)?.value

  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}
  )
  return client
}

/**
 * Admin client — bypassa RLS.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export { COOKIE_ACCESS, COOKIE_REFRESH }
