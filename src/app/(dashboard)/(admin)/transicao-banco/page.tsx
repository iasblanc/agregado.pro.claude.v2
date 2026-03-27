import type { Metadata }          from 'next'
import { redirect }                from 'next/navigation'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { Header }                  from '@/components/layout/Header'
import { Badge }                   from '@/components/ui/badge'
import { evaluateTransitionReadiness } from '@/services/bank-transition'
import { formatBRL }               from '@/lib/utils'

export const metadata: Metadata = { title: 'Transição Banco Próprio' }
export const dynamic = 'force-dynamic'  // Reavalia a cada 1 hora

export default async function TransicaoBancoPage() {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user) return null  // layout já redireciona

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/gestao')

  const readiness = await evaluateTransitionReadiness()

  const PHASE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    baas:          { label: 'BaaS (Celcoin)',       color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    pre_transicao: { label: 'Pré-transição',        color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    migracao:      { label: 'Migração em andamento', color: '#1D4ED8',             bg: '#EFF6FF' },
    banco_proprio: { label: 'Banco Próprio',        color: 'var(--color-text-primary)', bg: 'var(--color-surface)' },
  }

  const phaseConfig = PHASE_LABELS[readiness.phase] ?? PHASE_LABELS.baas!

  return (
    <div className="flex flex-col h-full">
      <Header title="Transição Banco Próprio" subtitle="Monitoramento do threshold e checklist BC" />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-2xl mx-auto space-y-xl">

          {/* Status atual */}
          <div
            className="rounded-xl p-xl space-y-lg"
            style={{ background: phaseConfig.bg, border: `1px solid ${phaseConfig.color}33` }}
          >
            <div className="flex items-center justify-between gap-md flex-wrap">
              <div>
                <p className="overline" style={{ color: phaseConfig.color }}>Fase atual</p>
                <h2 className="font-display text-display-md font-medium text-ag-primary">
                  {phaseConfig.label}
                </h2>
              </div>
              <Badge variant={readiness.isThresholdReached ? 'success' : 'warning'} dot>
                {readiness.isThresholdReached ? 'Threshold atingido' : 'Aguardando threshold'}
              </Badge>
            </div>
            <p className="text-body text-ag-secondary">{readiness.recommendation}</p>
          </div>

          {/* Progresso do threshold */}
          <section className="bg-ag-surface border border-ag-border rounded-xl p-lg space-y-lg shadow-sm">
            <h3 className="font-display text-display-sm font-medium text-ag-primary">
              Threshold de usuários
            </h3>

            <div className="flex items-end justify-between gap-md">
              <div>
                <p className="overline">Usuários ativos</p>
                <p className="font-display text-[48px] font-medium leading-none text-ag-primary">
                  {readiness.activeUsers.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="caption text-ag-muted">Meta mínima</p>
                <p className="font-display text-[28px] font-medium text-ag-muted">
                  {readiness.threshold.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="space-y-sm">
              <div className="w-full h-4 rounded-full bg-ag-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width:      `${readiness.progressPercent}%`,
                    background: readiness.isThresholdReached
                      ? 'var(--color-success)'
                      : 'linear-gradient(90deg, var(--color-warning) 0%, #F59E0B 100%)',
                  }}
                  role="progressbar"
                  aria-valuenow={readiness.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="flex justify-between">
                <span className="caption text-ag-muted">{readiness.progressPercent}% do threshold</span>
                <span className="caption text-ag-muted">
                  Faltam {Math.max(0, readiness.threshold - readiness.activeUsers).toLocaleString('pt-BR')} usuários
                </span>
              </div>
            </div>

            {/* Métricas financeiras */}
            <div className="grid grid-cols-2 gap-sm pt-md border-t border-ag-border">
              <div className="bg-ag-bg border border-ag-border rounded-lg p-md">
                <p className="caption text-ag-muted">Receita estimada/mês</p>
                <p className="font-display text-[22px] font-medium text-ag-primary">
                  {formatBRL(readiness.monthlyRevenue)}
                </p>
                <p className="caption text-ag-muted">via interchange BaaS</p>
              </div>
              <div className="bg-ag-bg border border-ag-border rounded-lg p-md">
                <p className="caption text-ag-muted">Volume de cartão/mês</p>
                <p className="font-display text-[22px] font-medium text-ag-primary">
                  {formatBRL(readiness.cardVolume)}
                </p>
                <p className="caption text-ag-muted">últimos 30 dias</p>
              </div>
            </div>
          </section>

          {/* Checklist para licença BC */}
          <section className="bg-ag-surface border border-ag-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-lg py-md border-b border-ag-border">
              <p className="overline">Resolução CMN 4.656/2018</p>
              <h3 className="font-display text-display-sm font-medium text-ag-primary mt-xs">
                Checklist para Banco Próprio
              </h3>
            </div>

            <div className="divide-y divide-ag-border">
              {readiness.checklistBC.map((item, i) => {
                const statusConfig = {
                  pendente:       { color: 'var(--color-text-muted)', icon: '○', badge: 'muted'   as const },
                  em_andamento:   { color: 'var(--color-warning)',    icon: '◐', badge: 'warning' as const },
                  concluido:      { color: 'var(--color-success)',    icon: '●', badge: 'success' as const },
                }
                const cfg = statusConfig[item.status]

                return (
                  <div key={i} className="px-lg py-md flex items-start gap-md">
                    <span
                      className="shrink-0 mt-px text-[16px]"
                      style={{ color: cfg.color }}
                      aria-hidden="true"
                    >
                      {cfg.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={[
                        'text-body-sm',
                        item.status === 'concluido' ? 'line-through text-ag-muted' : 'text-ag-primary',
                      ].join(' ')}>
                        {item.item}
                      </p>
                      {!item.required && (
                        <p className="caption text-ag-muted">Opcional</p>
                      )}
                    </div>
                    <Badge variant={cfg.badge}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Próximo milestone */}
          <div
            className="rounded-xl p-lg space-y-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-body-sm font-medium text-ag-primary">
              🎯 Próximo marco
            </p>
            <p className="text-body text-ag-secondary">{readiness.nextMilestone}</p>
            <p className="caption text-ag-muted">
              Conforme master.md: transição apenas após 50K–100K usuários ativos e receita financeira consistente.
              Nunca antecipar por ambição regulatória.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
