export const dynamic = 'force-dynamic'

import { redirect }    from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }      from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { PerfilTRForm } from './PerfilTRForm'

export default async function PerfilTransportadoraPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles')
    .select('id, role, full_name, email, phone, cnpj, company_name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'transportadora') redirect('/gestao')

  const { data: contracts } = await admin.from('contracts')
    .select('id, status').eq('publisher_id', profile.id)

  const stats = {
    total:    contracts?.length ?? 0,
    ativos:   contracts?.filter(c => c.status === 'publicado').length ?? 0,
    fechados: contracts?.filter(c => c.status === 'fechado').length ?? 0,
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Perfil da Empresa" subtitle="Dados da transportadora" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-md">
          {[['Total', stats.total], ['Publicados', stats.ativos], ['Fechados', stats.fechados]].map(([k, v]) => (
            <Card key={k}>
              <CardBody>
                <p className="caption text-ag-muted mb-xs">{k}</p>
                <p className="font-display text-display-sm font-medium text-ag-primary">{v}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <PerfilTRForm profile={profile} userEmail={user.email ?? ''} />
      </main>
    </div>
  )
}
