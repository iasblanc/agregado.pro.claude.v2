export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Button }        from '@/components/ui/button'
import { Badge }         from '@/components/ui/badge'
import { formatDate }    from '@/lib/utils'
import type { Vehicle }  from '@/types/database.types'

export const metadata: Metadata = { title: 'Meus Veículos' }

export default async function VeiculosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/contratos')

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <Header title="Meus Veículos" subtitle="Sua frota cadastrada" />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl">
        {/* Header de seção */}
        <div className="flex items-center justify-between">
          <div>
            <p className="overline">Frota</p>
            <h1 className="font-display text-display-sm font-medium text-ag-primary">
              {vehicles?.length ?? 0} veículo{(vehicles?.length ?? 0) !== 1 ? 's' : ''} cadastrado{(vehicles?.length ?? 0) !== 1 ? 's' : ''}
            </h1>
          </div>
          <Link href="/gestao/veiculos/novo">
            <Button size="sm">+ Novo veículo</Button>
          </Link>
        </div>

        {/* Lista */}
        {vehicles && vehicles.length > 0 ? (
          <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <EmptyVehicles />
        )}
      </main>
    </div>
  )
}

// ─── Card de veículo ──────────────────────────────────────────────

function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  return (
    <article
      className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-md shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Placa em destaque */}
      <div className="flex items-center justify-between">
        <span className="font-display text-display-sm font-medium text-ag-primary tracking-wide">
          {v.plate}
        </span>
        <Badge variant="default">{v.type}</Badge>
      </div>

      {/* Marca / Modelo / Ano */}
      <div>
        <p className="text-body font-medium text-ag-primary">
          {v.brand} {v.model}
        </p>
        <p className="caption">{v.year}</p>
      </div>

      {/* Equipamento */}
      {v.equipment_type && (
        <Badge variant="muted" dot>
          {v.equipment_type}
        </Badge>
      )}

      {/* Rodapé */}
      <div className="pt-sm border-t border-ag-border flex items-center justify-between">
        <p className="caption">Desde {formatDate(v.created_at)}</p>
        <Link
          href={`/dre?vehicle=${v.id}`}
          className="text-body-sm text-ag-secondary hover:text-ag-primary underline underline-offset-2 transition-colors"
        >
          Ver DRE
        </Link>
      </div>
    </article>
  )
}

// ─── Estado vazio ──────────────────────────────────────────────────

function EmptyVehicles() {
  return (
    <div className="text-center py-[var(--space-4xl)] space-y-xl max-w-sm mx-auto">
      <div className="text-[56px]" aria-hidden="true">🚛</div>
      <div className="space-y-md">
        <h2 className="font-display text-display-sm font-medium text-ag-primary">
          Cadastre seu caminhão
        </h2>
        <p className="text-body text-ag-secondary">
          Adicione seu veículo para associar lançamentos do DRE e calcular o custo por km de cada caminhão separadamente.
        </p>
      </div>
      <Link href="/gestao/veiculos/novo">
        <Button size="lg" fullWidth>Cadastrar primeiro veículo</Button>
      </Link>
    </div>
  )
}
