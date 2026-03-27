export const dynamic = 'force-dynamic'

import type { Metadata }  from 'next'
import { redirect }        from 'next/navigation'
import { createClient }    from '@/lib/supabase/server'
import { Header }          from '@/components/layout/Header'
import { ProfileForm }     from './ProfileForm'
import { RoleBadge }       from '@/components/ui/badge'
import { formatDate, formatCPF } from '@/lib/utils'

export const metadata: Metadata = { title: 'Meu Perfil' }

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="flex flex-col h-full">
      <Header title="Meu Perfil" />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-lg mx-auto space-y-xl">

          {/* Identidade */}
          <section className="bg-ag-surface border border-ag-border rounded-xl p-lg shadow-sm space-y-md">
            <div className="flex items-center gap-lg">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium shrink-0"
                style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}
                aria-hidden="true"
              >
                {profile.full_name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-display-sm font-medium text-ag-primary truncate">
                  {profile.full_name}
                </h1>
                <p className="caption truncate">{profile.email}</p>
                <div className="mt-xs">
                  <RoleBadge role={profile.role} />
                </div>
              </div>
            </div>

            {/* Dados do documento */}
            <div className="pt-md border-t border-ag-border grid grid-cols-2 gap-sm">
              {profile.cpf && (
                <div>
                  <p className="caption">CPF</p>
                  <p className="text-body-sm font-medium text-ag-primary">
                    {/* Mascarar CPF — LGPD */}
                    {formatCPF(profile.cpf).replace(/(\d{3})\.\d{3}\.(\d{3}-\d{2})/, '$1.***.***-**')}
                  </p>
                </div>
              )}
              {profile.cnpj && (
                <div>
                  <p className="caption">CNPJ</p>
                  <p className="text-body-sm font-medium text-ag-primary">
                    {profile.cnpj.replace(/(\d{2}\.\d{3})\.\d{3}\//, '$1.***./')}
                  </p>
                </div>
              )}
              <div>
                <p className="caption">Membro desde</p>
                <p className="text-body-sm font-medium text-ag-primary">
                  {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          </section>

          {/* Editar perfil */}
          <section className="bg-ag-surface border border-ag-border rounded-xl p-lg shadow-sm">
            <h2 className="font-display text-display-sm font-medium text-ag-primary mb-lg">
              Editar dados
            </h2>
            <ProfileForm
              defaultValues={{
                full_name: profile.full_name,
                phone:     profile.phone ?? '',
              }}
            />
          </section>

          {/* Nota LGPD */}
          <section
            className="rounded-xl p-lg text-body-sm space-y-sm"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}
          >
            <p className="font-medium">🔒 Seus dados são seus</p>
            <p>
              Todos os seus dados financeiros e transacionais são de sua propriedade exclusiva.
              O Agregado.Pro não vende nem compartilha suas informações com terceiros sem sua autorização.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
