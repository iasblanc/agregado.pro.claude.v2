export const dynamic = 'force-dynamic'

import { redirect }    from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }      from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { PerfilForm }  from './PerfilForm'

export default async function PerfilPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name, email, phone, cpf, cnpj, company_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Stats por role
  let stats: { label: string; value: number }[] = []

  if (profile.role === 'caminhoneiro') {
    const [{ data: vehicles }, { count: dreCount }] = await Promise.all([
      admin.from('vehicles').select('id, type, brand, model, year, plate').eq('owner_id', profile.id).eq('is_active', true),
      admin.from('dre_entries').select('id', { count: 'exact', head: true }).eq('owner_id', profile.id),
    ])
    stats = [
      { label: 'Veículos',     value: vehicles?.length ?? 0 },
      { label: 'Lançamentos',  value: dreCount ?? 0 },
    ]
    return (
      <div className="flex flex-col h-full">
        <Header title="Meu Perfil" subtitle="Caminhoneiro" />
        <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">
          <div className="grid grid-cols-2 gap-md">
            {stats.map(s => (
              <Card key={s.label}>
                <CardBody>
                  <p className="caption text-ag-muted mb-xs">{s.label}</p>
                  <p className="font-display text-display-sm font-medium text-ag-primary">{s.value}</p>
                </CardBody>
              </Card>
            ))}
          </div>
          <PerfilForm profile={profile} userEmail={user.email ?? ''} vehicles={vehicles ?? []} />
        </main>
      </div>
    )
  }

  // Transportadora
  const { data: contracts } = await admin.from('contracts')
    .select('id, status').eq('publisher_id', profile.id)
  stats = [
    { label: 'Contratos',  value: contracts?.length ?? 0 },
    { label: 'Publicados', value: contracts?.filter(c => c.status === 'publicado').length ?? 0 },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header title="Perfil da Empresa" subtitle="Transportadora" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">
        <div className="grid grid-cols-2 gap-md">
          {stats.map(s => (
            <Card key={s.label}>
              <CardBody>
                <p className="caption text-ag-muted mb-xs">{s.label}</p>
                <p className="font-display text-display-sm font-medium text-ag-primary">{s.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        <PerfilForm profile={profile} userEmail={user.email ?? ''} vehicles={[]} />
      </main>
    </div>
  )
}
