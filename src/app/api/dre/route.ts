import { NextRequest, NextResponse }   from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import { calculateDre }               from '@/services/dre/calculator'
import { drePeriodFilterSchema }      from '@/lib/validations'
import { getCurrentPeriod }           from '@/lib/utils'

/**
 * GET /api/dre?period=YYYY-MM&vehicle_id=uuid
 *
 * Retorna o DRE calculado do período para o usuário autenticado.
 * Usado pelo useDre hook e por integrações futuras (BaaS webhook).
 *
 * Segurança:
 * - Autenticação via sessão Supabase
 * - RLS garante isolamento por tenant
 * - Validação de inputs via Zod
 * - Rate limiting implícito via Supabase (configurável)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Autenticação
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Validar parâmetros
    const { searchParams } = new URL(request.url)
    const parsed = drePeriodFilterSchema.safeParse({
      period:     searchParams.get('period')     ?? getCurrentPeriod(),
      vehicle_id: searchParams.get('vehicle_id') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Buscar lançamentos (RLS filtra automaticamente pelo usuário)
    let query = supabase
      .from('dre_entries')
      .select('*')
      .eq('period', parsed.data.period)
      .order('created_at', { ascending: false })

    if (parsed.data.vehicle_id) {
      query = query.eq('vehicle_id', parsed.data.vehicle_id)
    }

    const { data: entries, error: dbErr } = await query

    if (dbErr) {
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    const dre = calculateDre(entries ?? [], parsed.data.period, parsed.data.vehicle_id)

    return NextResponse.json(dre, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
      },
    })
  } catch (err) {
    console.error('[GET /api/dre]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
