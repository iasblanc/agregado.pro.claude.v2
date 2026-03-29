import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  title:                  z.string().min(5),
  route_origin:           z.string().min(2),
  route_destination:      z.string().min(2),
  route_km:               z.number().positive(),
  vehicle_type:           z.string().min(1),
  equipment_type:         z.string().optional(),
  contract_value:         z.number().positive(),
  payment_type:           z.enum(['por_viagem', 'por_km', 'mensal', 'por_tonelada']),
  duration_months:        z.number().int().min(1).max(60).optional(),
  start_date:             z.string().optional(),
  has_risk_management:    z.boolean().default(false),
  requires_own_truck:     z.boolean().default(true),
  requires_own_equipment: z.boolean().default(false),
  description:            z.string().optional(),
  status:                 z.enum(['rascunho', 'publicado']).default('rascunho'),
})

// POST — criar contrato (transportadora)
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body   = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'transportadora')
    return NextResponse.json({ error: 'Apenas transportadoras podem publicar contratos' }, { status: 403 })

  const { data, error } = await admin.from('contracts').insert({
    ...parsed.data,
    publisher_id: profile.id,
    published_at: parsed.data.status === 'publicado' ? new Date().toISOString() : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

// PATCH — atualizar status (publicar/cancelar)
export async function PATCH(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const body  = await request.json()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const update = { ...body, updated_at: new Date().toISOString() }
  if (body.status === 'publicado') update.published_at = new Date().toISOString()

  const { error } = await admin.from('contracts').update(update)
    .eq('id', id).eq('publisher_id', profile.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
