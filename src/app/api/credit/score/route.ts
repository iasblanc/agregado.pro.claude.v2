export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient }   from '@/lib/supabase/server'
import { calculateLiveScore, persistScore } from '@/services/credit'

/**
 * GET /api/credit/score
 * Calcula o score em tempo real para o usuário autenticado.
 *
 * Query params:
 * - persist=true → persiste o score calculado (usado pelo cron mensal)
 *
 * Segurança:
 * - Autenticação obrigatória
 * - RLS garante isolamento de dados
 * - persist=true requer header X-Cron-Secret para evitar abuso
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'caminhoneiro') {
      return NextResponse.json({ error: 'Apenas caminhoneiros têm score' }, { status: 403 })
    }

    const shouldPersist = request.nextUrl.searchParams.get('persist') === 'true'

    // Validar secret para persistência (apenas cron job oficial)
    if (shouldPersist) {
      const cronSecret = request.headers.get('x-cron-secret')
      if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Não autorizado para persistir' }, { status: 403 })
      }
    }

    // Calcular score
    const result = await calculateLiveScore(profile.id)

    if (!result) {
      return NextResponse.json(
        { error: 'Dados insuficientes para calcular score', code: 'INSUFFICIENT_DATA' },
        { status: 422 }
      )
    }

    // Persistir se solicitado
    let scoreId: string | null = null
    if (shouldPersist) {
      scoreId = await persistScore(profile.id, result)
    }

    return NextResponse.json(
      { score: result, scoreId, persisted: !!scoreId },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',   // 5 min
        },
      }
    )
  } catch (err) {
    console.error('[GET /api/credit/score]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
