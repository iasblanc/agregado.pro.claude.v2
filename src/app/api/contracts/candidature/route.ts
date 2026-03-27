export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient }   from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { z }              from 'zod'

const candidatureSchema = z.object({
  contractId:         z.string().uuid(),
  message:            z.string().max(500).optional(),
  costPerKmSnapshot:  z.number().min(0),
})

// POST /api/contracts/candidature — candidatar
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body   = await request.json()
    const parsed = candidatureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'caminhoneiro') {
      return NextResponse.json({ error: 'Apenas caminhoneiros podem se candidatar' }, { status: 403 })
    }

    // Verificar contrato publicado
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('id', parsed.data.contractId)
      .eq('status', 'publicado')
      .single()

    if (!contract) {
      return NextResponse.json({ error: 'Contrato não disponível' }, { status: 404 })
    }

    // Verificar candidatura duplicada
    const { data: existing } = await supabase
      .from('candidatures')
      .select('id')
      .eq('contract_id', parsed.data.contractId)
      .eq('candidate_id', profile.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Você já se candidatou a este contrato' }, { status: 409 })
    }

    const { data: candidature, error } = await supabase
      .from('candidatures')
      .insert({
        contract_id:          parsed.data.contractId,
        candidate_id:         profile.id,
        message:              parsed.data.message ?? null,
        cost_per_km_snapshot: parsed.data.costPerKmSnapshot,
      })
      .select('id, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Incrementar contador de candidatos no contrato
    await supabase.rpc('increment_candidates_count', { contract_id: parsed.data.contractId })
      .catch(() => {/* não crítico */})

    return NextResponse.json(candidature, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
