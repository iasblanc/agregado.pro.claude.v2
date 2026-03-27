export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient }   from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateAnticipationFee } from '@/services/credit/limit-calculator'
import { calculateLiveScore }       from '@/services/credit'
import { z }              from 'zod'

const schema = z.object({
  receivableIds: z.array(z.string().uuid()).min(1).max(10),
  reason:        z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body   = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'caminhoneiro') {
      return NextResponse.json({ error: 'Apenas caminhoneiros podem antecipar recebíveis' }, { status: 403 })
    }

    // Buscar recebíveis e validar ownership
    const { data: receivables, error: recErr } = await supabase
      .from('receivables')
      .select('id, amount, due_date, status, is_anticipated')
      .eq('owner_id', profile.id)
      .in('id', parsed.data.receivableIds)
      .eq('status', 'pendente')
      .eq('is_anticipated', false)

    if (recErr || !receivables?.length) {
      return NextResponse.json({ error: 'Recebíveis não encontrados ou já antecipados' }, { status: 404 })
    }

    if (receivables.length !== parsed.data.receivableIds.length) {
      return NextResponse.json({ error: 'Alguns recebíveis não estão disponíveis' }, { status: 409 })
    }

    // Score do usuário
    const scoreResult = await calculateLiveScore(profile.id)
    if (!scoreResult?.isEligible) {
      return NextResponse.json({ error: 'Score insuficiente para antecipação' }, { status: 422 })
    }

    // Calcular taxas
    const today = new Date()
    let totalReceivable = 0
    let totalFee        = 0
    let totalNet        = 0

    for (const r of receivables) {
      const days = Math.max(1, Math.ceil((new Date(r.due_date).getTime() - today.getTime()) / 86_400_000))
      const calc = calculateAnticipationFee({ score: scoreResult.score, daysAnticipated: days, amount: Number(r.amount) })
      totalReceivable += Number(r.amount)
      totalFee        += calc.feeAmount
      totalNet        += calc.netAmount
    }

    const feeRate = totalReceivable > 0 ? totalFee / totalReceivable : 0

    // Criar antecipação
    const admin = createAdminClient()
    const { data: anticipation, error: antErr } = await admin
      .from('anticipations')
      .insert({
        owner_id:          profile.id,
        receivable_ids:    parsed.data.receivableIds,
        total_receivable:  totalReceivable,
        fee_rate:          feeRate,
        fee_amount:        totalFee,
        net_amount:        totalNet,
        days_anticipated:  0,   // média
        status:            'solicitada',
        score_current:     scoreResult.score,
        reason:            parsed.data.reason ?? null,
      })
      .select('id')
      .single()

    if (antErr || !anticipation) {
      return NextResponse.json({ error: 'Erro ao criar antecipação' }, { status: 500 })
    }

    // Marcar recebíveis como antecipados
    await admin
      .from('receivables')
      .update({ is_anticipated: true, anticipated_amount: totalNet, anticipated_at: new Date().toISOString() })
      .in('id', parsed.data.receivableIds)

    // Auditoria
    await admin.from('audit_events').insert({
      user_id:       user.id,
      action:        'anticipation_requested',
      resource_type: 'anticipation',
      resource_id:   anticipation.id,
      metadata: {
        total_receivable: totalReceivable,
        total_fee:        totalFee,
        net_amount:       totalNet,
        score:            scoreResult.score,
        receivable_count: receivables.length,
      },
    })

    return NextResponse.json({
      anticipationId:   anticipation.id,
      totalReceivable,
      totalFee,
      netAmount:        totalNet,
      estimatedCredit:  '1 dia útil',
    }, { status: 201 })

  } catch (err) {
    console.error('[POST /api/credit/anticipate]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
