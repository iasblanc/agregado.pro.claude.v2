export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { Card, CardBody } from '@/components/ui/card'
import { Button }        from '@/components/ui/button'

export const metadata: Metadata = { title: 'Parceiros' }

const CATEGORIAS = [
  {
    categoria: '⛽ Combustível',
    parceiros: [
      { nome: 'Rede BR', desc: 'Postos BR parceiros', beneficio: '5% desconto no abastecimento', disponivel: true },
      { nome: 'Shell Select', desc: 'Postos Shell parceiros', beneficio: '4% cashback em pontos', disponivel: true },
    ],
  },
  {
    categoria: '🔧 Manutenção',
    parceiros: [
      { nome: 'Bosch Car Service', desc: 'Rede oficial de oficinas', beneficio: '10% mão de obra', disponivel: true },
      { nome: 'Borracharia Express', desc: 'Borracharias credenciadas', beneficio: 'Atendimento preferencial', disponivel: true },
    ],
  },
  {
    categoria: '🍽️ Alimentação & Descanso',
    parceiros: [
      { nome: 'Restaurantes de Estrada', desc: 'Rede de parceiros na BR', beneficio: '8% desconto nas refeições', disponivel: true },
      { nome: 'Áreas de Descanso', desc: 'Postos com estrutura para caminhoneiros', beneficio: 'Estacionamento gratuito', disponivel: true },
    ],
  },
  {
    categoria: '🛡️ Seguros & Proteção',
    parceiros: [
      { nome: 'Porto Seguro Caminhão', desc: 'Seguro de carga e veículo', beneficio: 'Condições exclusivas para agregados', disponivel: false },
      { nome: 'Assistência 24h', desc: 'Guincho e socorro mecânico', beneficio: 'Cobertura nacional', disponivel: false },
    ],
  },
]

export default async function ParceirosPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  const { data: loyalty } = await admin.from('loyalty_accounts')
    .select('tier').eq('owner_id', profile.id).maybeSingle()
  const tier = loyalty?.tier ?? 'bronze'

  return (
    <div className="flex flex-col h-full">
      <Header title="Parceiros" subtitle="Rede de vantagens exclusivas" />
      <main className="flex-1 px-lg py-xl md:px-xl space-y-xl overflow-auto max-w-2xl">

        <div className="flex items-center justify-between">
          <p className="text-body-sm text-ag-secondary">
            Seu nível: <strong className="text-ag-primary capitalize">{tier}</strong>
          </p>
          <Link href="/beneficios">
            <Button size="sm" variant="secondary">← Benefícios</Button>
          </Link>
        </div>

        {CATEGORIAS.map(cat => (
          <Card key={cat.categoria}>
            <CardBody>
              <p className="text-body-sm font-medium text-ag-primary mb-md">{cat.categoria}</p>
              <div className="space-y-md">
                {cat.parceiros.map(p => (
                  <div key={p.nome} className={`flex items-center gap-md py-sm border-b border-ag-border last:border-0 ${!p.disponivel ? 'opacity-40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm mb-xs">
                        <p className="text-body-sm font-medium text-ag-primary">{p.nome}</p>
                        {!p.disponivel && (
                          <span className="caption text-ag-muted border border-ag-border px-sm py-xs rounded-md">Em breve</span>
                        )}
                      </div>
                      <p className="caption text-ag-muted">{p.desc}</p>
                    </div>
                    <span className="text-body-sm font-medium shrink-0 text-right max-w-[120px]"
                      style={{ color: p.disponivel ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                      {p.beneficio}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </main>
    </div>
  )
}
