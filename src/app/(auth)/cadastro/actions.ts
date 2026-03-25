'use server'

import { redirect }          from 'next/navigation'
import { headers }           from 'next/headers'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { registerSchema }    from '@/lib/validations'
import type { AuthActionState } from '../login/actions'

// ─── Register Action ──────────────────────────────────────────────

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for') ?? 'unknown'

  // Coletar dados do formulário
  const raw = {
    full_name:        formData.get('full_name')        as string,
    email:            formData.get('email')            as string,
    password:         formData.get('password')         as string,
    confirm_password: formData.get('confirm_password') as string,
    role:             formData.get('role')             as string,
    phone:            formData.get('phone')            as string | undefined,
    cpf:              formData.get('cpf')              as string | undefined,
    cnpj:             formData.get('cnpj')             as string | undefined,
    company_name:     formData.get('company_name')     as string | undefined,
  }

  // Validação com Zod
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return {
      error: 'Corrija os erros abaixo.',
      fields: Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])
      ),
    }
  }

  const supabase = await createClient()

  // Registrar usuário no Supabase Auth
  // O trigger handle_new_user cria o perfil automaticamente
  const { data, error } = await supabase.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name:    parsed.data.full_name,
        role:         parsed.data.role,
        phone:        parsed.data.phone ?? null,
        cpf:          parsed.data.cpf ?? null,
        cnpj:         parsed.data.cnpj ?? null,
        company_name: parsed.data.company_name ?? null,
      },
      // URL de callback após confirmação de email
      emailRedirectTo: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
    },
  })

  if (error) {
    // E-mail já cadastrado — mensagem genérica por segurança
    if (error.message.includes('already registered')) {
      return { error: 'Este e-mail já está cadastrado. Tente fazer login.' }
    }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  // Auditoria
  try {
    const admin = createAdminClient()
    await admin.from('audit_events').insert({
      user_id:       data.user?.id ?? null,
      action:        'register',
      resource_type: 'auth',
      ip_address:    ip,
      metadata:      { role: parsed.data.role },
    })
  } catch { /* não bloquear */ }

  // Se email confirm estiver desligado no Supabase (dev) → redirecionar direto
  // Se ligado → mostrar mensagem de confirmação
  if (data.session) {
    redirect(parsed.data.role === 'transportadora' ? '/contratos' : '/gestao')
  }

  return {
    success:
      'Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.',
  }
}
