import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  let query = admin.from('dre_entries')
    .select('period, entry_type, category, description, amount, km_reference, created_at')
    .eq('owner_id', profile.id)
    .order('period', { ascending: false })
    .order('created_at', { ascending: true })

  if (period) query = query.eq('period', period)

  const { data: entries, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gerar CSV
  const TYPE_LABELS: Record<string, string> = {
    receita: 'Receita', custo_fixo: 'Custo Fixo',
    custo_variavel: 'Custo Variável', pessoal: 'Pessoal',
  }

  const rows = [
    ['Período', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Km Referência', 'Data'],
    ...(entries ?? []).map(e => [
      e.period,
      TYPE_LABELS[e.entry_type] ?? e.entry_type,
      e.category,
      e.description,
      Number(e.amount).toFixed(2).replace('.', ','),
      e.km_reference ? String(e.km_reference) : '',
      new Date(e.created_at).toLocaleDateString('pt-BR'),
    ]),
  ]

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
       .join(';')
  ).join('\n')

  const filename = period
    ? `DRE_AgregadoPro_${period}.csv`
    : `DRE_AgregadoPro_completo.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
