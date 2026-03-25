'use server'

import { createClient } from '@/lib/supabase/server'
import { z }            from 'zod'
import type { AuthActionState } from '../login/actions'

// ─── Recuperar Senha — Step 1: enviar email ───────────────────────

const emailSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw    = { email: formData.get('email') as string }
  const parsed = emailSchema.safeParse(raw)

  if (!parsed.success) {
    return { fields: { email: parsed.error.flatten().fieldErrors.email?.[0] ?? '' } }
  }

  const supabase = await createClient()

  // Sempre retornar sucesso — não revelar se o email existe (segurança)
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXTAUTH_URL}/api/auth/callback?next=/nova-senha`,
  })

  return {
    success:
      'Se este e-mail estiver cadastrado, você receberá um link em instantes.',
  }
}

// ─── Nova Senha — Step 2: após clicar no link do email ───────────

const newPasswordSchema = z
  .object({
    password:         z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Senhas não coincidem',
    path:    ['confirm_password'],
  })

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    password:         formData.get('password')         as string,
    confirm_password: formData.get('confirm_password') as string,
  }

  const parsed = newPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      error:  'Corrija os erros abaixo.',
      fields: {
        password:         errs.password?.[0]         ?? '',
        confirm_password: errs.confirm_password?.[0] ?? '',
      },
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) return { error: 'Erro ao atualizar senha. O link pode ter expirado.' }

  return { success: 'Senha atualizada com sucesso! Você já pode fazer login.' }
}
