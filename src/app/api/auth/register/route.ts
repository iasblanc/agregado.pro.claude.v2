import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, COOKIE_ACCESS, COOKIE_REFRESH } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const COOKIE_OPTS = {
  httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7,
}

const schema = z.object({
  full_name:        z.string().min(3),
  email:            z.string().email(),
  password:         z.string().min(8),
  confirm_password: z.string(),
  role:             z.enum(['caminhoneiro', 'transportadora']),
  phone:            z.string().optional(),
  cpf:              z.string().optional(),
  cnpj:             z.string().optional(),
  company_name:     z.string().optional(),
}).refine(d => d.password === d.confirm_password, {
  message: 'As senhas não coincidem.', path: ['confirm_password'],
})

export async function POST(request: NextRequest) {
  const body   = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { full_name, email, password, role, phone, cpf, cnpj, company_name } = parsed.data

  const admin = createAdminClient()

  // Criar usuário via Admin API (confirma email automaticamente)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role, phone: phone || null, cpf: cpf || null, cnpj: cnpj || null, company_name: company_name || null },
  })
  if (createErr) {
    if (createErr.message.includes('already') || createErr.message.includes('registered')) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
  }

  // Atualizar profile com dados extras (trigger cria o básico)
  if (created.user) {
    await admin.from('profiles').update({
      phone: phone || null, cpf: cpf || null, cnpj: cnpj || null, company_name: company_name || null,
    }).eq('user_id', created.user.id)
  }

  // Login automático
  const { data: session, error: signInErr } = await admin.auth.signInWithPassword({ email, password })
  if (signInErr || !session.session) {
    return NextResponse.json({ redirectTo: '/login', message: 'Conta criada! Faça login.' })
  }

  const roleRoutes: Record<string, string> = {
    caminhoneiro:  '/gestao',
    transportadora: '/meus-contratos',
  }
  const redirectTo = roleRoutes[role] ?? '/gestao'

  const response = NextResponse.json({ redirectTo })
  response.cookies.set(COOKIE_ACCESS,  session.session.access_token,  COOKIE_OPTS)
  response.cookies.set(COOKIE_REFRESH, session.session.refresh_token, COOKIE_OPTS)
  return response
}
