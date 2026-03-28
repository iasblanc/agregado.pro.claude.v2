export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { Card, CardBody } from '@/components/ui/card'
import { VeiculosClient } from './VeiculosClient'

export default async function VeiculosPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, type, brand, model, year, plate, equipment_type, is_active')
    .eq('owner_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return <VeiculosClient vehicles={vehicles ?? []} />
}
