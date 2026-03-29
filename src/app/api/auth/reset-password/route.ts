import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Verificar se usuário existe (silenciosamente — não revelar por segurança)
  const { data: user } = await admin.auth.admin.listUsers()
  const exists = user?.users?.some(u => u.email === email)

  if (exists) {
    // Em produção: enviar email via Supabase Auth
    // Por ora apenas confirmar silenciosamente
    await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXTAUTH_URL}/api/auth/callback?type=recovery`,
    }).catch(() => null)
  }

  // Sempre retornar sucesso (não revelar se email existe)
  return NextResponse.json({ ok: true })
}
