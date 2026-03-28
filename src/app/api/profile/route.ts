import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  full_name:    z.string().min(2),
  phone:        z.string().optional(),
  cpf:          z.string().optional(),
  cnpj:         z.string().optional(),
  company_name: z.string().optional(),
})

export async function PATCH(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body   = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({
    full_name:    parsed.data.full_name,
    phone:        parsed.data.phone        || null,
    cpf:          parsed.data.cpf          || null,
    cnpj:         parsed.data.cnpj         || null,
    company_name: parsed.data.company_name || null,
    updated_at:   new Date().toISOString(),
  }).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
