export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect }       from 'next/navigation'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/server'
import { Header }         from '@/components/layout/Header'
import { getCurrentScore } from '@/services/credit'
import { AntecipacaoClient } from './AntecipacaoClient'

export const metadata: Metadata = { title: 'Antecipar Recebíveis' }

export default async function AntecipacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') redirect('/gestao')

  const scoreData = await getCurrentScore()

  if (!scoreData?.score.isEligible) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Antecipar Recebíveis" />
        <main className="flex-1 px-lg py-xl text-center">
          <p className="text-body text-ag-secondary">
            Score insuficiente para antecipação. Mínimo de 3 meses de histórico necessário.
          </p>
          <Link href="/credito" className="text-body-sm text-ag-secondary underline mt-md inline-block">
            Voltar ao crédito
          </Link>
        </main>
      </div>
    )
  }

  const { data: receivables } = await supabase
    .from('receivables')
    .select('id, amount, due_date, payer_name')
    .eq('owner_id', profile.id)
    .eq('status', 'pendente')
    .eq('is_anticipated', false)
    .gte('due_date', new Date().toISOString().split('T')[0]!)
    .order('due_date', { ascending: true })

  const receivablesData = (receivables ?? []).map((r) => ({
    id:         r.id,
    amount:     Number(r.amount),
    due_date:   r.due_date,
    payer_name: r.payer_name ?? 'Transportadora',
  }))

  return (
    <div className="flex flex-col h-full">
      <Header title="Antecipar Recebíveis" subtitle="Receba antes do vencimento" />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-xl mx-auto space-y-xl">
          <div>
            <Link href="/credito" className="caption text-ag-muted hover:text-ag-secondary transition-colors">
              ← Voltar ao crédito
            </Link>
            <div className="mt-md space-y-xs">
              <p className="overline">Antecipação de recebíveis</p>
              <h1 className="font-display text-display-md font-medium text-ag-primary">
                Receba agora
              </h1>
              <p className="text-body text-ag-secondary">
                Antecipe pagamentos de contratos fechados com desconto baseado no seu score.
                Quanto melhor seu score, menor a taxa.
              </p>
            </div>
          </div>

          {receivablesData.length > 0 ? (
            <AntecipacaoClient
              receivables={receivablesData}
              score={scoreData.score.score}
            />
          ) : (
            <div className="text-center py-[var(--space-4xl)] space-y-md">
              <p className="text-[40px]" aria-hidden="true">📋</p>
              <p className="text-body text-ag-secondary">
                Sem recebíveis disponíveis para antecipação no momento.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
