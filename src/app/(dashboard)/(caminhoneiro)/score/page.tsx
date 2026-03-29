export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { formatBRL, formatDate }      from '@/lib/utils'
import { CalcularScoreButton }        from './CalcularScoreButton'

export const metadata: Metadata = { title: 'Score de Crédito' }

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  excelente:   { label: 'Excelente',   color: '#059669', bg: '#D1FAE5', desc: 'Acesso a melhores condições de crédito' },
  muito_bom:   { label: 'Muito Bom',   color: '#2563EB', bg: '#DBEAFE', desc: 'Elegível para crédito com boas condições' },
  bom:         { label: 'Bom',         color: '#7C3AED', bg: '#EDE9FE', desc: 'Elegível para crédito padrão' },
  regular:     { label: 'Regular',     color: '#D97706', bg: '#FEF3C7', desc: 'Crédito disponível com revisão' },
  baixo:       { label: 'Baixo',       color: '#DC2626', bg: '#FEE2E2', desc: 'Necessita mais histórico financeiro' },
  insuficiente:{ label: 'Insuficiente',color: '#6B7280', bg: '#F3F4F6', desc: 'Lance mais dados para calcular o score' },
}

function ScoreGauge({ score }: { score: number }) {
  const pct     = (score / 1000) * 100
  const radius  = 70
  const cx      = 90
  const cy      = 90
  const strokeW = 12
  const circ    = 2 * Math.PI * radius
  const arcPct  = 0.75  // 270° arco
  const dashArr = circ * arcPct
  const dashOff = circ * arcPct * (1 - pct / 100)
  const startAngle = 135
  const color =
    score >= 800 ? '#059669' : score >= 650 ? '#2563EB' :
    score >= 500 ? '#7C3AED' : score >= 350 ? '#D97706' : '#DC2626'

  return (
    <svg viewBox="0 0 180 120" className="w-full max-w-[200px] mx-auto">
      {/* Track */}
      <circle cx={cx} cy={cy} r={radius} fill="none"
        stroke="var(--color-surface)" strokeWidth={strokeW}
        strokeDasharray={`${dashArr} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${startAngle} ${cx} ${cy})`} />
      {/* Progress */}
      <circle cx={cx} cy={cy} r={radius} fill="none"
        stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dashArr} ${circ}`}
        strokeDashoffset={dashOff}
        strokeLinecap="round"
        transform={`rotate(${startAngle} ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      {/* Score text */}
      <text x={cx} y={cy - 5} textAnchor="middle"
        fontFamily="var(--font-display, serif)" fontSize="28" fontWeight="600" fill={color}>
        {score}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        fontFamily="var(--font-body, sans-serif)" fontSize="11" fill="var(--color-text-muted)">
        de 1000
      </text>
    </svg>
  )
}

export default async function ScorePage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  // Score atual
  const { data: scoreRecord } = await admin.from('credit_scores')
    .select('*').eq('owner_id', profile.id).eq('is_current', true).maybeSingle()

  // Histórico de lançamentos para verificar se tem dados
  const { count: dreCount } = await admin.from('dre_entries')
    .select('id', { count: 'exact', head: true }).eq('owner_id', profile.id)

  const hasData  = (dreCount ?? 0) > 0
  const tier     = scoreRecord ? TIER_CONFIG[scoreRecord.tier] ?? TIER_CONFIG.insuficiente : null

  return (
    <div className="flex flex-col h-full">
      <Header title="Score de Crédito" subtitle="Baseado nos seus dados financeiros reais" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        {/* Score principal */}
        <Card elevated>
          <CardBody>
            {scoreRecord && tier ? (
              <div className="text-center space-y-md">
                <ScoreGauge score={scoreRecord.score} />
                <div>
                  <span className="px-md py-xs rounded-pill text-body-sm font-medium"
                    style={{ background: tier.bg, color: tier.color }}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-body-sm text-ag-secondary">{tier.desc}</p>
                <p className="caption text-ag-muted">
                  Calculado em {formatDate(scoreRecord.calculated_at)} · {scoreRecord.months_of_data} meses de histórico
                </p>
              </div>
            ) : (
              <div className="text-center py-lg space-y-md">
                <p className="text-[48px]">📊</p>
                <p className="text-body font-medium text-ag-primary">Score ainda não calculado</p>
                <p className="text-body-sm text-ag-secondary">
                  {hasData
                    ? 'Você tem lançamentos no DRE. Calcule agora o seu score.'
                    : 'Lance receitas e custos no DRE para gerar seu score de crédito.'}
                </p>
              </div>
            )}
            <div className="mt-lg">
              <CalcularScoreButton hasData={hasData} hasScore={!!scoreRecord} />
            </div>
          </CardBody>
        </Card>

        {/* Fatores do score */}
        {scoreRecord && (
          <Card>
            <CardHeader label="Fatores que compõem o score" />
            <CardBody>
              <div className="space-y-md">
                {[
                  { label: 'Estabilidade de receita', pts: scoreRecord.driver_receita_estabilidade, max: 250 },
                  { label: 'Margem operacional',      pts: scoreRecord.driver_margem_operacional,   max: 250 },
                  { label: 'Meses positivos',         pts: scoreRecord.driver_regularidade_contratos, max: 200 },
                  { label: 'Volume de histórico',     pts: scoreRecord.driver_historico_pagamentos, max: 150 },
                  { label: 'Tendência recente',       pts: scoreRecord.driver_custo_km_tendencia,  max: 150 },
                ].map(f => (
                  <div key={f.label}>
                    <div className="flex justify-between mb-xs">
                      <span className="text-body-sm text-ag-secondary">{f.label}</span>
                      <span className="text-body-sm font-medium text-ag-primary">{f.pts}/{f.max}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--color-surface)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${(f.pts / f.max) * 100}%`,
                        background: 'var(--color-accent)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Métricas financeiras */}
        {scoreRecord && (
          <Card>
            <CardHeader label="Suas métricas" />
            <CardBody>
              <div className="grid grid-cols-2 gap-md">
                {[
                  { label: 'Receita média/mês',  val: scoreRecord.receita_media_mensal ? formatBRL(scoreRecord.receita_media_mensal) : '—' },
                  { label: 'Margem média',        val: scoreRecord.margem_media_percent ? `${Number(scoreRecord.margem_media_percent).toFixed(1)}%` : '—' },
                  { label: 'Custo/km médio',      val: scoreRecord.custo_km_medio ? formatBRL(scoreRecord.custo_km_medio) + '/km' : '—' },
                  { label: 'Meses positivos',     val: `${scoreRecord.meses_positivos} de ${scoreRecord.months_of_data}` },
                ].map(m => (
                  <div key={m.label}>
                    <p className="caption text-ag-muted mb-xs">{m.label}</p>
                    <p className="text-body font-medium text-ag-primary">{m.val}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Limite sugerido */}
        {scoreRecord?.is_eligible && scoreRecord.limite_sugerido && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="caption text-ag-muted mb-xs">Limite pré-aprovado</p>
                  <p className="font-display text-[28px] font-medium" style={{ color: 'var(--color-success)' }}>
                    {formatBRL(Number(scoreRecord.limite_sugerido))}
                  </p>
                  <p className="caption text-ag-muted mt-xs">Baseado na sua receita média mensal</p>
                </div>
                <span className="text-[32px]">✅</span>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Como melhorar */}
        <Card>
          <CardHeader label="Como melhorar seu score" />
          <CardBody>
            <div className="space-y-sm">
              {[
                '📋 Lance receitas e custos regularmente todos os meses',
                '📈 Mantenha margem operacional acima de 15%',
                '📅 Quanto mais histórico, mais confiável o score',
                '🎯 Meses no positivo aumentam diretamente o score',
              ].map(tip => (
                <p key={tip} className="text-body-sm text-ag-secondary flex items-start gap-sm">
                  <span className="shrink-0">{tip.slice(0, 2)}</span>
                  <span>{tip.slice(3)}</span>
                </p>
              ))}
            </div>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}
