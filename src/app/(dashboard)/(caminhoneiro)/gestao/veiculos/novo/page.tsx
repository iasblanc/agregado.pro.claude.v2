import type { Metadata } from 'next'
import Link              from 'next/link'
import { Header }        from '@/components/layout/Header'
import { VehicleForm }   from '../VehicleForm'

export const metadata: Metadata = { title: 'Novo Veículo' }

export default function NovoVeiculoPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Novo veículo" />

      <main className="flex-1 px-lg py-xl md:px-xl">
        <div className="max-w-lg mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-sm mb-xl text-body-sm text-ag-muted" aria-label="Breadcrumb">
            <Link href="/gestao"          className="hover:text-ag-primary transition-colors">Gestão</Link>
            <span aria-hidden="true">›</span>
            <Link href="/gestao/veiculos" className="hover:text-ag-primary transition-colors">Veículos</Link>
            <span aria-hidden="true">›</span>
            <span className="text-ag-primary">Novo</span>
          </nav>

          <div className="mb-xl space-y-xs">
            <p className="overline">Cadastrar</p>
            <h1 className="font-display text-display-md font-medium text-ag-primary">
              Novo veículo
            </h1>
            <p className="text-body text-ag-secondary">
              Cadastre seu caminhão para associar lançamentos e calcular o DRE por veículo.
            </p>
          </div>

          <div className="bg-ag-surface rounded-xl border border-ag-border p-lg shadow-sm">
            <VehicleForm />
          </div>
        </div>
      </main>
    </div>
  )
}
