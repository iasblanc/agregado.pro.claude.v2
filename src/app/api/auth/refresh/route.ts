import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, COOKIE_ACCESS, COOKIE_REFRESH } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const COOKIE_OPTS = {
  httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7,
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(COOKIE_REFRESH)?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'Sem refresh token' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.refreshSession({ refresh_token: refreshToken })

  if (error || !data.session) {
    const res = NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
    res.cookies.delete(COOKIE_ACCESS)
    res.cookies.delete(COOKIE_REFRESH)
    return res
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_ACCESS,  data.session.access_token,  COOKIE_OPTS)
  response.cookies.set(COOKIE_REFRESH, data.session.refresh_token, COOKIE_OPTS)
  return response
}
