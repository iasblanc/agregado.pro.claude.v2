import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll()
  const cookieNames = allCookies.map(c => c.name)
  let user = null, userError = null
  try {
    const supabase = await createClient()
    user = await getServerUser() ? { id: data.user.id, email: data.user.email } : null
    userError = error?.message ?? null
  } catch (e: unknown) { userError = String(e) }

  return NextResponse.json({ cookieCount: allCookies.length, cookieNames, user, userError })
}
