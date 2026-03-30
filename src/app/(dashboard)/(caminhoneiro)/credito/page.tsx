export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }        from '@/components/ui/button'
import { formatBRL, formatDate }      from '@/lib/utils'
import { AntecipacaoForm }  from './AntecipacaoForm'

export const metadata: Metadata = { title: 'Crédito e Antecipação' }

export default async function CreditoPage({
  searchParams,
}: {
  searchParams: Promise<{ antecipar?: string }>
}) {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role, full_name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const params = await searchParams

  // Score atual
  const { data: score } = await admin.from('credit_scores')
    .select('*').eq('owner_id', profile.id).eq('is_current', true).maybeSingle()

  // Histórico de antecipações
  const { data: antecipacoes } = await admin.from('anticipations')
    .select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }).limit(10)

  // Candidaturas/contratos fechados (recebíveis potenciais)
  const { data: candidaturas } = await admin.from('candidatures')
    .select(`id, status, created_at, contract:contracts!candidatures_contract_id_fkey(title, contract_value, route_origin, route_destination)`)
    .eq('candidate_id', profile.id)
    .eq('status', 'aceita')
    .order('created_at', { ascending: false })
    .limit(5)

  const isEligible     = score?.is_eligible ?? false
  const limiteSugerido = score?.limite_sugerido ? Number(score.limite_sugerido) : 0

  if (params.antecipar === '1' && isEligible) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Antecipar Recebível" subtitle="Receba antes do prazo com desconto" />
        <main className="flex-1 px-lg py-xl md:px-xl overflow-auto max-w-xl">
          <AntecipacaoForm limiteSugerido={limiteSugerido} />
        </main>
      </div>
    )
  }

  const STATUS_ANT: Record<string, { label: string; color: string }> = {
    solicitada: { label: 'Solicitada', color: '#D97706' },
    aprovada:   { label: 'Aprovada',   color: '#059669' },
    liquidada:  { label: 'Liquidada',  color: '#2563EB' },
    negada:     { label: 'Negada',     color: '#DC2626' },
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Crédito" subtitle="Antecipação e serviços financeiros" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Status de elegibilidade */}
        {score ? (
          <Card elevated>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="caption text-ag-muted mb-xs">Seu score atual</p>
                  <p className="font-display text-[32px] font-medium text-ag-primary">{score.score}</p>
                  <p className="text-body-sm mt-xs" style={{ color: isEligible ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {isEligible ? '✅ Elegível para crédito' : '⚠️ Score abaixo do mínimo (350)'}
                  </p>
                </div>
                <Link href="/score">
                  <button className="text-body-sm text-ag-secondary hover:text-ag-primary border border-ag-border px-md py-sm rounded-md">
                    Ver detalhes →
                  </button>
                </Link>
              </div>
              {isEligible && limiteSugerido > 0 && (
                <div className="mt-md pt-md border-t border-ag-border">
                  <div className="flex justify-between items-center">
                    <p className="text-body-sm text-ag-secondary">Limite disponível para antecipação</p>
                    <p className="text-body font-medium" style={{ color: 'var(--color-success)' }}>
                      {formatBRL(limiteSugerido)}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-md">
                <div>
                  <p className="text-body font-medium text-ag-primary">Score não calculado</p>
                  <p className="text-body-sm text-ag-secondary mt-xs">Calcule seu score para acessar crédito</p>
                </div>
                <Link href="/score">
                  <Button size="sm">Calcular score</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Antecipação de recebíveis */}
        <Card>
          <CardHeader label="Antecipação de recebíveis" />
          <CardBody>
            <p className="text-body-sm text-ag-secondary mb-lg">
              Antecipe o recebimento de contratos fechados com uma taxa de 2,5% ao mês. 
              O valor cai direto na sua conta em até 1 dia útil.
            </p>
            {candidaturas && candidaturas.length > 0 ? (
              <div className="space-y-sm mb-lg">
                <p className="caption text-ag-muted">Contratos com candidatura aceita:</p>
                {candidaturas.map((c: Record<string, unknown>) => {
                  const contract = c.contract as { title?: string; contract_value?: number; route_origin?: string; route_destination?: string } | null
                  return (
                    <div key={c.id as string} className="flex items-center justify-between py-sm border-b border-ag-border last:border-0">
                      <div>
                        <p className="text-body-sm font-medium text-ag-primary">{contract?.title ?? 'Contrato'}</p>
                        <p className="caption text-ag-muted">{contract?.route_origin} → {contract?.route_destination}</p>
                      </div>
                      <span className="text-body-sm font-medium text-ag-primary">
                        {contract?.contract_value ? formatBRL(Number(contract.contract_value)) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-body-sm text-ag-muted mb-lg">Nenhum contrato aceito ainda.</p>
            )}
            {isEligible && limiteSugerido > 0 && (
              <SimuladorAntecipacao limite={limiteSugerido} />
            )}
            {isEligible ? (
              <Link href="/credito?antecipar=1">
                <Button fullWidth>Solicitar antecipação</Button>
              </Link>
            ) : (
              <Button fullWidth variant="secondary" disabled>
                Disponível a partir de 350 pontos
              </Button>
            )}
          </CardBody>
        </Card>

        {/* Histórico de antecipações */}
        {antecipacoes && antecipacoes.length > 0 && (
          <Card>
            <CardHeader label="Histórico de antecipações" />
            <CardBody>
              <div className="divide-y divide-ag-border">
                {antecipacoes.map(a => {
                  const st = STATUS_ANT[a.status] ?? { label: a.status, color: '#6B7280' }
                  return (
                    <div key={a.id} className="py-sm flex items-center justify-between">
                      <div>
                        <p className="text-body-sm font-medium text-ag-primary">{formatBRL(Number(a.total_receivable))}</p>
                        <p className="caption text-ag-muted">
                          Taxa: {(Number(a.fee_rate) * 100).toFixed(2)}% · Líquido: {formatBRL(Number(a.net_amount))}
                        </p>
                        <p className="caption text-ag-muted">{formatDate(a.created_at)}</p>
                      </div>
                      <span className="text-body-sm font-medium px-sm py-xs rounded-md"
                        style={{ background: st.color + '20', color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Próximas features */}
        <Card>
          <CardHeader label="Em breve" />
          <CardBody>
            <div className="space-y-sm">
              {[
                { icon: '💳', title: 'Cartão de crédito', desc: 'Limite baseado no seu DRE real' },
                { icon: '🏦', title: 'Conta digital',     desc: 'Conta e cartão integrados ao sistema' },
                { icon: '📊', title: 'Open Finance',      desc: 'Integre seus outros bancos' },
              ].map(f => (
                <div key={f.title} className="flex items-center gap-md py-sm">
                  <span className="text-[24px] shrink-0">{f.icon}</span>
                  <div>
                    <p className="text-body-sm font-medium text-ag-primary">{f.title}</p>
                    <p className="caption text-ag-muted">{f.desc}</p>
                  </div>
                  <span className="ml-auto text-caption text-ag-muted border border-ag-border px-sm py-xs rounded-md">
                    Em breve
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}
