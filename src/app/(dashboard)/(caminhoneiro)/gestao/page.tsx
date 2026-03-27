export const dynamic = 'force-dynamic'

import type { Metadata }  from 'next'
import { createClient }   from '@/lib/supabase/server'
import { redirect }       from 'next/navigation'
import { Header }         from '@/components/layout/Header'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { getCurrentPeriod, formatPeriod, formatBRL } from '@/lib/utils'

export const metadata: Metadata = { title: 'Gestão' }

/**
 * Página principal do caminhoneiro — Phase 1.
 * Mostra resumo do período atual e atalhos para lançamentos.
 *
 * Esta página é o ponto de entrada de toda a gestão financeira.
 * Critério de sucesso Phase 1: caminhoneiro consegue responder
 * "meu caminhão está dando lucro?" apenas com esta tela.
 */
export default async function GestaoPage() {
  const supabase = await createClient()

  // Guard de role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') {
    redirect('/contratos')  // Transportadora vai para contratos
  }

  const period      = getCurrentPeriod()
  const periodLabel = formatPeriod(period)

  // Buscar resumo do período via view dre_summary
  const { data: summary } = await supabase
    .from('dre_summary')
    .select('*')
    .eq('period', period)
    .is('vehicle_id', null)
    .maybeSingle()

  const primeiroNome = profile.full_name.split(' ')[0] ?? 'Motorista'

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Olá, ${primeiroNome} 👋`}
        subtitle={`Resumo de ${periodLabel}`}
      />

      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
          {/* Receita */}
          <Card>
            <CardHeader label="Receita do mês">
              <span className="text-display-sm">
                {formatBRL(Number(summary?.total_receita ?? 0))}
              </span>
            </CardHeader>
            <CardBody>
              <p className="caption">
                {summary ? 'Receita total registrada' : 'Nenhum lançamento ainda'}
              </p>
            </CardBody>
          </Card>

          {/* Custo total */}
          <Card>
            <CardHeader label="Custo total">
              <span className="text-display-sm">
                {formatBRL(Number(summary?.total_custo ?? 0))}
              </span>
            </CardHeader>
            <CardBody>
              <p className="caption">
                Fixo: {formatBRL(Number(summary?.total_fixo ?? 0))} ·{' '}
                Variável: {formatBRL(Number(summary?.total_variavel ?? 0))}
              </p>
            </CardBody>
          </Card>

          {/* Resultado */}
          <Card elevated>
            <CardHeader label="Resultado operacional">
              <span
                className="text-display-sm font-medium"
                style={{
                  color: !summary
                    ? 'var(--color-text-muted)'
                    : Number(summary.resultado_operacional) >= 0
                    ? 'var(--color-success)'
                    : 'var(--color-danger)',
                }}
              >
                {formatBRL(Number(summary?.resultado_operacional ?? 0))}
              </span>
            </CardHeader>
            <CardBody>
              <p className="caption">
                {!summary
                  ? 'Lance receitas e custos para ver o resultado'
                  : Number(summary.resultado_operacional) >= 0
                  ? '✅ Negócio no positivo este mês'
                  : '❌ Negócio no negativo — revise os custos'}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Custo por km */}
        {summary && Number(summary.km_total) > 0 && (
          <Card>
            <CardHeader label="Custo por km rodado" />
            <CardBody>
              <div className="flex items-baseline gap-sm">
                <span className="font-display text-[40px] font-medium text-ag-primary">
                  {formatBRL(Number(summary.custo_por_km ?? 0))}
                </span>
                <span className="text-body text-ag-muted">/km</span>
              </div>
              <p className="caption mt-sm">
                Base: {Number(summary.km_total).toLocaleString('pt-BR')} km em {periodLabel}
              </p>
            </CardBody>
          </Card>
        )}

        {/* CTA — primeiros passos */}
        {!summary && (
          <Card>
            <CardHeader label="Primeiros passos" />
            <CardBody>
              <div className="space-y-md">
                <p className="text-body text-ag-secondary">
                  Para calcular o resultado do seu negócio, comece registrando
                  seus custos e receitas do mês.
                </p>
                <div className="space-y-sm">
                  {[
                    '1. Registre sua receita (valor do frete + km rodados)',
                    '2. Lance os custos fixos (parcela, seguro, licenciamento)',
                    '3. Lance os custos variáveis (diesel, pedágio, manutenção)',
                    '4. Veja automaticamente se está no lucro ou prejuízo',
                  ].map((step) => (
                    <p key={step} className="text-body-sm text-ag-secondary flex items-start gap-sm">
                      <span className="text-[var(--color-success)] font-medium shrink-0">→</span>
                      {step}
                    </p>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
