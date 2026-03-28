'use server'

import { revalidatePath }    from 'next/cache'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { vehicleSchema }     from '@/lib/validations'
import { headers }           from 'next/headers'
import type { AuthActionState } from '@/app/(auth)/login/actions'

// ─── Criar veículo ─────────────────────────────────────────────────

export async function createVehicleAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  const raw = {
    type:           formData.get('type')           as string,
    brand:          formData.get('brand')          as string,
    model:          formData.get('model')          as string,
    year:           parseInt(formData.get('year')  as string, 10),
    plate:          (formData.get('plate') as string).toUpperCase().trim(),
    equipment_type: (formData.get('equipment_type') as string) || null,
  }

  const parsed = vehicleSchema.safeParse(raw)
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      error:  'Corrija os erros abaixo.',
      fields: Object.fromEntries(
        Object.entries(errs).map(([k, v]) => [k, v?.[0] ?? ''])
      ),
    }
  }

  // Verificar se placa já existe
  const { data: existing } = await supabase
    .from('vehicles')
    .select('id')
    .eq('plate', parsed.data.plate)
    .maybeSingle()

  if (existing) return { error: `Placa ${parsed.data.plate} já cadastrada.` }

  // Buscar profile
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') {
    return { error: 'Apenas caminhoneiros podem cadastrar veículos.' }
  }

  const { data: vehicle, error: insertErr } = await supabase
    .from('vehicles')
    .insert({
      owner_id:       profile.id,
      type:           parsed.data.type,
      brand:          parsed.data.brand,
      model:          parsed.data.model,
      year:           parsed.data.year,
      plate:          parsed.data.plate,
      equipment_type: parsed.data.equipment_type ?? null,
    })
    .select('id')
    .single()

  if (insertErr) return { error: `Erro ao cadastrar veículo: ${insertErr.message}` }

  try {
    const admin = createAdminClient()
    const reqH  = await headers()
    await admin.from('audit_events').insert({
      user_id:       user.id,
      action:        'vehicle_created',
      resource_type: 'vehicle',
      resource_id:   vehicle.id,
      ip_address:    reqH.get('x-forwarded-for') ?? undefined,
      metadata:      { plate: parsed.data.plate, type: parsed.data.type },
    })
  } catch { /* não bloquear */ }

  revalidatePath('/gestao/veiculos')
  revalidatePath('/gestao')

  return { success: `Veículo ${parsed.data.plate} cadastrado com sucesso!` }
}

// ─── Desativar veículo (soft delete) ─────────────────────────────

export async function deactivateVehicleAction(vehicleId: string): Promise<AuthActionState> {
  if (!vehicleId) return { error: 'ID inválido.' }

  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return { error: 'Sessão expirada.' }

  const { error } = await supabase
    .from('vehicles')
    .update({ is_active: false })
    .eq('id', vehicleId)

  if (error) return { error: 'Erro ao remover veículo.' }

  try {
    const admin = createAdminClient()
    await admin.from('audit_events').insert({
      user_id:       user.id,
      action:        'vehicle_deactivated',
      resource_type: 'vehicle',
      resource_id:   vehicleId,
    })
  } catch { /* não bloquear */ }

  revalidatePath('/gestao/veiculos')
  return { success: 'Veículo removido.' }
}
