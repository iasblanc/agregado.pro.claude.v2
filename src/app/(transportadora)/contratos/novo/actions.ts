'use server'

import { redirect }          from 'next/navigation'
import { revalidatePath }    from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z }                 from 'zod'
import { VEHICLE_TYPES, EQUIPMENT_TYPES } from '@/lib/constants'
import type { AuthActionState } from '@/app/(auth)/login/actions'

// ─── Schema ───────────────────────────────────────────────────────

const contractPublishSchema = z.object({
  title:              z.string().min(5, 'Título muito curto').max(120),
  description:        z.string().max(2000).optional(),
  route_origin:       z.string().min(3, 'Informe a cidade de origem'),
  route_destination:  z.string().min(3, 'Informe a cidade de destino'),
  route_km:           z.number().positive('KM deve ser positivo').max(10_000),
  vehicle_type:       z.enum(VEHICLE_TYPES as unknown as [string, ...string[]]),
  equipment_type:     z.string().optional().nullable(),
  contract_value:     z.number().positive('Valor deve ser positivo').max(999_999),
  payment_type:       z.enum(['por_viagem', 'por_km', 'por_tonelada']).default('por_viagem'),
  duration_months:    z.number().int().min(1).max(60).optional().nullable(),
  start_date:         z.string().optional().nullable(),
  requires_own_truck: z.boolean().default(true),
  // Dados sensíveis — só liberados após fechamento
  sensitive_contact:  z.string().max(200).optional().nullable(),
  sensitive_address:  z.string().max(500).optional().nullable(),
  // Publicar imediatamente ou salvar como rascunho
  publish_now:        z.boolean().default(false),
})

// ─── Action ───────────────────────────────────────────────────────

export async function publishContractAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'transportadora') {
    return { error: 'Apenas transportadoras podem publicar contratos.' }
  }

  const raw = {
    title:              formData.get('title')              as string,
    description:        (formData.get('description') as string) || undefined,
    route_origin:       formData.get('route_origin')       as string,
    route_destination:  formData.get('route_destination')  as string,
    route_km:           parseFloat(formData.get('route_km') as string),
    vehicle_type:       formData.get('vehicle_type')       as string,
    equipment_type:     (formData.get('equipment_type') as string) || null,
    contract_value:     parseFloat(formData.get('contract_value') as string),
    payment_type:       (formData.get('payment_type') as string) ?? 'por_viagem',
    duration_months:    formData.get('duration_months')
      ? parseInt(formData.get('duration_months') as string, 10)
      : null,
    start_date:         (formData.get('start_date') as string) || null,
    requires_own_truck: formData.get('requires_own_truck') === 'true',
    sensitive_contact:  (formData.get('sensitive_contact') as string) || null,
    sensitive_address:  (formData.get('sensitive_address') as string) || null,
    publish_now:        formData.get('publish_now') === 'true',
  }

  const parsed = contractPublishSchema.safeParse(raw)
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      error:  'Corrija os erros abaixo.',
      fields: Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v?.[0] ?? ''])),
    }
  }

  const now    = new Date().toISOString()
  const status = parsed.data.publish_now ? 'publicado' : 'rascunho'

  const { data: contract, error: insertErr } = await supabase
    .from('contracts')
    .insert({
      publisher_id:       profile.id,
      title:              parsed.data.title,
      description:        parsed.data.description ?? null,
      route_origin:       parsed.data.route_origin,
      route_destination:  parsed.data.route_destination,
      route_km:           parsed.data.route_km,
      vehicle_type:       parsed.data.vehicle_type,
      equipment_type:     parsed.data.equipment_type,
      contract_value:     parsed.data.contract_value,
      payment_type:       parsed.data.payment_type,
      duration_months:    parsed.data.duration_months,
      start_date:         parsed.data.start_date,
      requires_own_truck: parsed.data.requires_own_truck,
      sensitive_contact:  parsed.data.sensitive_contact,
      sensitive_address:  parsed.data.sensitive_address,
      status,
      published_at:       status === 'publicado' ? now : null,
    })
    .select('id')
    .single()

  if (insertErr) return { error: `Erro ao criar contrato: ${insertErr.message}` }

  try {
    const admin = createAdminClient()
    await admin.from('audit_events').insert({
      user_id:       user.id,
      action:        status === 'publicado' ? 'contract_published' : 'contract_draft_saved',
      resource_type: 'contract',
      resource_id:   contract.id,
      metadata:      { title: parsed.data.title, value: parsed.data.contract_value },
    })
  } catch { /* não bloquear */ }

  revalidatePath('/contratos')

  redirect(`/contratos/${contract.id}/candidatos`)
}
