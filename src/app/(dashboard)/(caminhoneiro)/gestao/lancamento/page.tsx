import type { Metadata }     from 'next'
import Link                   from 'next/link'
import { Header }             from '@/components/layout/Header'
import { LancamentoForm }     from './LancamentoForm'
import { getCurrentPeriod, formatPeriod } from '@/lib/utils'

export const metadata: Metadata = { title: 'Novo Lançamento' }

export default function LancamentoPage() {
  const period = getCurrentPeriod()

  return (
    <div className="flex flex-col h-full">
      <Header title="Novo lançamento" subtitle={`Período: ${formatPeriod(period)}`} />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-lg mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-sm mb-xl text-body-sm text-ag-muted">
            <Link href="/gestao" className="hover:text-ag-primary transition-colors">
              Gestão
            </Link>
            <span aria-hidden="true">›</span>
            <span className="text-ag-primary">Novo lançamento</span>
          </div>

          {/* Intro */}
          <div className="mb-xl space-y-xs">
            <p className="overline">Registrar</p>
            <h1 className="font-display text-display-md font-medium text-ag-primary">
              Novo lançamento
            </h1>
            <p className="text-body text-ag-secondary">
              Registre receitas e custos para manter seu DRE atualizado.
            </p>
          </div>

          {/* Formulário */}
          <div
            className="bg-ag-surface rounded-xl border border-ag-border p-lg shadow-sm"
          >
            <LancamentoForm period={period} />
          </div>

          {/* Dica */}
          <div
            className="mt-lg px-md py-sm rounded-md text-body-sm"
            style={{
              background: '#EFF6FF',
              border:     '1px solid #BFDBFE',
              color:      '#1D4ED8',
            }}
          >
            <span className="font-medium">💡 Dica:</span>{' '}
            Ao registrar a receita, informe os KM rodados para calcular seu custo por km automaticamente.
          </div>
        </div>
      </main>
    </div>
  )
}
