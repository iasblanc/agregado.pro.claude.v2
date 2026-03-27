'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { profileUpdateSchema } from '@/lib/validations'
import type { AuthActionState } from '@/app/(auth)/login/actions'

export async function updateProfileAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return { error: 'Sessão expirada.' }

  const raw = {
    full_name: formData.get('full_name') as string,
    phone:     formData.get('phone')     as string,
  }

  const parsed = profileUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      error:  'Corrija os erros abaixo.',
      fields: Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v?.[0] ?? ''])),
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name:  parsed.data.full_name ?? undefined,
      phone:      parsed.data.phone     ?? null,
    })
    .eq('user_id', user.id)

  if (error) return { error: 'Erro ao atualizar perfil.' }

  try {
    const admin = createAdminClient()
    await admin.from('audit_events').insert({
      user_id:       user.id,
      action:        'profile_updated',
      resource_type: 'profile',
      metadata:      { fields: Object.keys(parsed.data) },
    })
  } catch { /* não bloquear */ }

  revalidatePath('/perfil')

  return { success: 'Perfil atualizado com sucesso.' }
}
