import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const entrySchema = z.object({
  period:       z.string().regex(/^\d{4}-\d{2}$/),
  entry_type:   z.enum(['receita', 'custo_fixo', 'custo_variavel', 'pessoal']),
  category:     z.string().min(1),
  description:  z.string().min(1),
  amount:       z.number().positive(),
  km_reference: z.number().optional(),
  vehicle_id:   z.string().uuid().optional(),
  notes:        z.string().optional(),
})

async function getProfile(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id, role').eq('user_id', userId).single()
  return data
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const parsed = entrySchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const profile = await getProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('dre_entries').insert({
    ...parsed.data,
    owner_id: profile.id,
    source: 'manual',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const profile = await getProfile(user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin.from('dre_entries').delete()
    .eq('id', id).eq('owner_id', profile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
