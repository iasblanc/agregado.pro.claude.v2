'use server'

import { redirect }      from 'next/navigation'
import { headers }       from 'next/headers'
import { createClient }  from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { loginSchema }   from '@/lib/validations'
import { ROLE_HOME_ROUTES, type UserRole } from '@/lib/constants'

// ─── Tipos ────────────────────────────────────────────────────────

export interface AuthActionState {
  error?:   string
  success?: string
  fields?:  Record<string, string>
}

// ─── Rate Limiting simples (em memória) ───────────────────────────
// Em produção, substituir por Redis/Upstash

const loginAttempts = new Map<string, { count: number; resetAt: number }>()

const MAX_ATTEMPTS    = 5
const WINDOW_MS       = 15 * 60 * 1000  // 15 minutos

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now    = Date.now()
  const record = loginAttempts.get(ip)

  if (!record || record.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count }
}

function resetRateLimit(ip: string) {
  loginAttempts.delete(ip)
}

// ─── Login Action ─────────────────────────────────────────────────

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for') ?? requestHeaders.get('x-real-ip') ?? 'unknown'

  // Rate limiting
  const { allowed } = checkRateLimit(ip)
  if (!allowed) {
    return {
      error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.',
    }
  }

  // Validação dos dados
  const raw = {
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return {
      error:  'Dados inválidos.',
      fields: {
        email:    fieldErrors.email?.[0]    ?? '',
        password: fieldErrors.password?.[0] ?? '',
      },
    }
  }

  const supabase = await createClient()

  // Tentativa de login
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    // Auditoria de falha de login
    try {
      const admin = createAdminClient()
      await admin.from('audit_events').insert({
        action:        'login_failure',
        resource_type: 'auth',
        ip_address:    ip,
        metadata:      { email: parsed.data.email, reason: error?.message },
      })
    } catch { /* não bloquear o fluxo por falha de auditoria */ }

    // Mensagem genérica — não revelar se email existe ou não
    return { error: 'E-mail ou senha incorretos.' }
  }

  // Reset de rate limit após sucesso
  resetRateLimit(ip)

  // Auditoria de login bem-sucedido
  try {
    const admin = createAdminClient()
    await admin.from('audit_events').insert({
      user_id:       data.user.id,
      action:        'login_success',
      resource_type: 'auth',
      ip_address:    ip,
    })
  } catch { /* não bloquear o fluxo */ }

  // Buscar role do usuário para redirecionar para área correta
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .single()

  const role  = (profile?.role as UserRole) ?? 'caminhoneiro'
  const route = ROLE_HOME_ROUTES[role] ?? '/gestao'

  redirect(route)
}

// ─── Logout Action ────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    try {
      const admin = createAdminClient()
      await admin.from('audit_events').insert({
        user_id:       user.id,
        action:        'logout',
        resource_type: 'auth',
      })
    } catch { /* não bloquear */ }
  }

  await supabase.auth.signOut()
  redirect('/login')
}
