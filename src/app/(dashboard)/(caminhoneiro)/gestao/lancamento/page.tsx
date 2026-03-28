export const dynamic = 'force-dynamic'

import { redirect }    from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { LancamentoClient } from './LancamentoClient'
import { getCurrentPeriod } from '@/lib/utils'

export default async function LancamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; type?: string }>
}) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const params  = await searchParams
  const period  = params.period ?? getCurrentPeriod()

  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, brand, model, plate, type')
    .eq('owner_id', profile.id)
    .eq('is_active', true)

  return <LancamentoClient period={period} preselectedType={params.type} vehicles={vehicles ?? []} />
}
