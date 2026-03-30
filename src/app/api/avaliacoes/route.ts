import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  contract_id:   z.string().uuid(),
  candidature_id: z.string().uuid(),
  evaluated_id:  z.string().uuid(),
  score:         z.number().int().min(1).max(5),
  comment:       z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body   = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  // Verificar se já avaliou esta candidatura
  const { data: existing } = await admin.from('evaluations')
    .select('id').eq('contract_id', parsed.data.contract_id)
    .eq('candidature_id', parsed.data.candidature_id)
    .eq('evaluator_id', profile.id).maybeSingle()

  if (existing) return NextResponse.json({ error: 'Você já avaliou este contrato' }, { status: 409 })

  const role: 'caminhoneiro_avalia_transportadora' | 'transportadora_avalia_caminhoneiro' =
    profile.role === 'caminhoneiro' ? 'caminhoneiro_avalia_transportadora' : 'transportadora_avalia_caminhoneiro'

  const { data, error } = await admin.from('evaluations').insert({
    contract_id:    parsed.data.contract_id,
    candidature_id: parsed.data.candidature_id,
    evaluator_id:   profile.id,
    evaluated_id:   parsed.data.evaluated_id,
    role,
    score:          parsed.data.score,
    comment:        parsed.data.comment ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
