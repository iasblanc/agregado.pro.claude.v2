export const dynamic = 'force-dynamic'

import { redirect }          from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }            from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { PerfilForm }        from './PerfilForm'

export default async function PerfilPage() {
  const user  = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, type, brand, model, year, plate')
    .eq('owner_id', profile.id)
    .eq('is_active', true)

  return (
    <div className="flex flex-col h-full">
      <Header title="Meu Perfil" subtitle="Suas informações pessoais" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">
        <PerfilForm profile={profile} vehicles={vehicles ?? []} userEmail={user.email ?? ''} />
      </main>
    </div>
  )
}
