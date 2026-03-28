import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createClient, getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Button }        from '@/components/ui/button'
import { Badge }         from '@/components/ui/badge'
import { getMyContracts } from '@/services/contracts'
import { formatBRL, formatKm, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Meus Contratos' }
export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'muted' | 'danger' }> = {
  rascunho:      { label: 'Rascunho',      variant: 'muted'    },
  publicado:     { label: 'Publicado',     variant: 'success'  },
  em_negociacao: { label: 'Em negociação', variant: 'warning'  },
  fechado:       { label: 'Fechado',       variant: 'info'     },
  cancelado:     { label: 'Cancelado',     variant: 'danger'   },
  encerrado:     { label: 'Encerrado',     variant: 'muted'    },
}

export default async function TransportadoraContratosPage() {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return null  // layout já redireciona
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'transportadora') redirect('/gestao')

  const contracts = await getMyContracts()

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Contratos"
        subtitle={`${contracts.length} ${contracts.length === 1 ? 'contrato' : 'contratos'}`}
      />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl">
        <div className="flex justify-end">
          <Link href="/contratos/novo">
            <Button>+ Publicar contrato</Button>
          </Link>
        </div>

        {contracts.length > 0 ? (
          <div className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-md px-lg py-sm bg-ag-bg border-b border-ag-border">
              <span className="caption font-medium">Contrato</span>
              <span className="caption font-medium">Valor</span>
              <span className="caption font-medium">Candidatos</span>
              <span className="caption font-medium">Status</span>
              <span className="caption font-medium">Ações</span>
            </div>
            <div className="divide-y divide-ag-border">
              {contracts.map((c: any) => {
                const statusCfg = STATUS_BADGE[c.status] ?? { label: c.status, variant: 'muted' as const }
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-md px-lg py-md items-center hover:bg-ag-overlay transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-ag-primary truncate">{c.title}</p>
                      <p className="caption text-ag-muted">
                        {formatKm(Number(c.route_km))} · {c.published_at ? formatDate(c.published_at) : 'Não publicado'}
                      </p>
                    </div>
                    <span className="text-body-sm font-medium text-ag-primary whitespace-nowrap">
                      {formatBRL(Number(c.contract_value))}
                    </span>
                    <span className="text-body-sm text-ag-secondary text-center">
                      {c.candidates_count}
                    </span>
                    <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
                    <Link
                      href={`/contratos/${c.id}/candidatos`}
                      className="text-body-sm text-ag-secondary hover:text-ag-primary underline underline-offset-2 whitespace-nowrap"
                    >
                      Ver candidatos
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-[var(--space-4xl)] space-y-xl max-w-sm mx-auto">
            <div className="text-[56px]" aria-hidden="true">📋</div>
            <div className="space-y-md">
              <h2 className="font-display text-display-sm font-medium text-ag-primary">
                Publique seu primeiro contrato
              </h2>
              <p className="text-body text-ag-secondary">
                Encontre caminhoneiros agregados para sua operação com análise de viabilidade automática.
              </p>
            </div>
            <Link href="/contratos/novo">
              <Button size="lg" fullWidth>Publicar contrato</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
