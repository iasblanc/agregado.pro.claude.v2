import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const vehicleSchema = z.object({
  type:           z.enum(['Automóvel','Van','3/4','Toco','Truck','Cavalo 4x2','Cavalo 6x2','Cavalo 6x4']),
  brand:          z.string().min(1),
  model:          z.string().min(1),
  year:           z.number().int().min(1990).max(2026),
  plate:          z.string().min(7).max(8),
  equipment_type: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body   = await request.json()
  const parsed = vehicleSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const { data, error } = await admin.from('vehicles').insert({
    ...parsed.data,
    plate:    parsed.data.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
    owner_id: profile.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  // Soft delete
  const { error } = await admin.from('vehicles')
    .update({ is_active: false }).eq('id', id).eq('owner_id', profile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
