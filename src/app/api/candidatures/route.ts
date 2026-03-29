import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const applySchema = z.object({
  contract_id: z.string().uuid(),
  vehicle_id:  z.string().uuid().optional(),
  message:     z.string().optional(),
})

// POST — caminhoneiro se candidata
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body   = await request.json()
  const parsed = applySchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro')
    return NextResponse.json({ error: 'Apenas caminhoneiros podem se candidatar' }, { status: 403 })

  // Verificar se já candidatou
  const { data: existing } = await admin.from('candidatures')
    .select('id, status').eq('contract_id', parsed.data.contract_id).eq('candidate_id', profile.id).maybeSingle()

  if (existing && existing.status !== 'cancelada')
    return NextResponse.json({ error: 'Você já se candidatou a este contrato' }, { status: 409 })

  // Buscar custo/km atual do usuário
  const { data: dreEntries } = await admin.from('dre_entries')
    .select('amount, entry_type, km_reference')
    .eq('owner_id', profile.id)
    .order('period', { ascending: false })
    .limit(100)

  let costPerKm = null
  if (dreEntries && dreEntries.length > 0) {
    const totalCost = dreEntries.filter(e => e.entry_type !== 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const totalKm   = dreEntries.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
    if (totalKm > 0) costPerKm = totalCost / totalKm
  }

  const { data, error } = await admin.from('candidatures').insert({
    contract_id:           parsed.data.contract_id,
    candidate_id:          profile.id,
    vehicle_id:            parsed.data.vehicle_id ?? null,
    message:               parsed.data.message ?? null,
    cost_per_km_snapshot:  costPerKm,
    status:                'pendente',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Incrementar contador de candidatos no contrato
  await admin.rpc('increment_candidates_count', { contract_id: parsed.data.contract_id })
    .catch(() => null) // não bloquear se RPC não existir

  return NextResponse.json({ data }, { status: 201 })
}

// PATCH — transportadora aceita/rejeita candidatura
export async function PATCH(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { action } = await request.json()
  if (!['aceitar', 'rejeitar', 'cancelar'].includes(action))
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const statusMap: Record<string, string> = { aceitar: 'aceita', rejeitar: 'recusada', cancelar: 'cancelada' }
  const timestampMap: Record<string, string> = { aceitar: 'accepted_at', rejeitar: 'rejected_at' }

  const update: Record<string, unknown> = { status: statusMap[action], updated_at: new Date().toISOString() }
  if (timestampMap[action]) update[timestampMap[action]] = new Date().toISOString()

  const { error } = await admin.from('candidatures').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
