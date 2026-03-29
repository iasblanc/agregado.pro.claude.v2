import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  amount:           z.number().positive(),
  days_anticipated: z.number().int().min(1).max(90),
  description:      z.string().optional(),
})

// Taxa: 2.5% ao mês (0.083%/dia)
const TAXA_DIARIA = 0.00083

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body   = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro')
    return NextResponse.json({ error: 'Apenas caminhoneiros' }, { status: 403 })

  // Verificar score
  const { data: score } = await admin.from('credit_scores')
    .select('score, is_eligible, limite_sugerido').eq('owner_id', profile.id).eq('is_current', true).maybeSingle()

  if (!score?.is_eligible)
    return NextResponse.json({ error: 'Score insuficiente para antecipação', code: 'NOT_ELIGIBLE' }, { status: 422 })

  const { amount, days_anticipated } = parsed.data
  const fee_rate   = TAXA_DIARIA * days_anticipated
  const fee_amount = amount * fee_rate
  const net_amount = amount - fee_amount

  const { data, error } = await admin.from('anticipations').insert({
    owner_id:         profile.id,
    receivable_ids:   [],
    total_receivable: amount,
    fee_rate,
    fee_amount,
    net_amount,
    days_anticipated,
    status:           'solicitada',
    dre_margem_current: null,
    score_current:    score.score,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, fee_rate, fee_amount, net_amount }, { status: 201 })
}

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const { data } = await admin.from('anticipations')
    .select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }).limit(20)

  return NextResponse.json({ data: data ?? [] })
}
