'use server'

import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { dreEntrySchema }    from '@/lib/validations'
import { headers }           from 'next/headers'
import type { AuthActionState } from '@/app/(auth)/login/actions'

// ─── Criar lançamento ─────────────────────────────────────────────

export async function createDreEntryAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient()

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  // Parsear e validar dados
  const raw = {
    vehicle_id:   (formData.get('vehicle_id') as string) || null,
    period:       formData.get('period')       as string,
    entry_type:   formData.get('entry_type')   as string,
    category:     formData.get('category')     as string,
    description:  formData.get('description')  as string,
    amount:       parseFloat(formData.get('amount') as string),
    km_reference: formData.get('km_reference')
      ? parseFloat(formData.get('km_reference') as string)
      : null,
    notes: (formData.get('notes') as string) || null,
  }

  const parsed = dreEntrySchema.safeParse(raw)
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      error:  'Corrija os erros abaixo.',
      fields: Object.fromEntries(
        Object.entries(errs).map(([k, v]) => [k, v?.[0] ?? ''])
      ),
    }
  }

  // Buscar profile do usuário
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (profileErr || !profile) return { error: 'Perfil não encontrado.' }

  // Apenas caminhoneiros podem lançar no DRE
  if (profile.role !== 'caminhoneiro') {
    return { error: 'Apenas caminhoneiros podem registrar lançamentos.' }
  }

  // Inserir lançamento
  const { error: insertErr } = await supabase
    .from('dre_entries')
    .insert({
      owner_id:     profile.id,
      vehicle_id:   parsed.data.vehicle_id   ?? null,
      period:       parsed.data.period,
      entry_type:   parsed.data.entry_type,
      category:     parsed.data.category,
      description:  parsed.data.description,
      amount:       parsed.data.amount,
      km_reference: parsed.data.km_reference ?? null,
      notes:        parsed.data.notes        ?? null,
    })

  if (insertErr) {
    return { error: `Erro ao salvar lançamento: ${insertErr.message}` }
  }

  // Auditoria
  try {
    const admin = createAdminClient()
    const reqHeaders = await headers()
    await admin.from('audit_events').insert({
      user_id:       user.id,
      action:        'dre_entry_created',
      resource_type: 'dre_entry',
      ip_address:    reqHeaders.get('x-forwarded-for') ?? undefined,
      metadata: {
        period:     parsed.data.period,
        entry_type: parsed.data.entry_type,
        category:   parsed.data.category,
        amount:     parsed.data.amount,
      },
    })
  } catch { /* não bloquear */ }

  // Invalidar cache das páginas de DRE
  revalidatePath('/gestao')
  revalidatePath('/dre')

  return { success: 'Lançamento registrado com sucesso.' }
}

// ─── Deletar lançamento ───────────────────────────────────────────

export async function deleteDreEntryAction(entryId: string): Promise<AuthActionState> {
  if (!entryId) return { error: 'ID do lançamento inválido.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  // RLS garante que só o dono pode deletar — mas validamos explicitamente
  const { data: entry } = await supabase
    .from('dre_entries')
    .select('id, owner_id, profiles!inner(user_id)')
    .eq('id', entryId)
    .single()

  if (!entry) return { error: 'Lançamento não encontrado.' }

  const { error } = await supabase
    .from('dre_entries')
    .delete()
    .eq('id', entryId)

  if (error) return { error: 'Erro ao remover lançamento.' }

  // Auditoria
  try {
    const admin = createAdminClient()
    await admin.from('audit_events').insert({
      user_id:       user.id,
      action:        'dre_entry_deleted',
      resource_type: 'dre_entry',
      resource_id:   entryId,
    })
  } catch { /* não bloquear */ }

  revalidatePath('/gestao')
  revalidatePath('/dre')

  return { success: 'Lançamento removido.' }
}
