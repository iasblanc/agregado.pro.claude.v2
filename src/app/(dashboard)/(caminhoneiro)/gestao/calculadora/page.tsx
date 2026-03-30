export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { Header }        from '@/components/layout/Header'
import { CalculadoraClient } from './CalculadoraClient'
import { getCurrentPeriod } from '@/lib/utils'

export const metadata: Metadata = { title: 'Calculadora de Frete' }

export default async function CalculadoraPage() {
  const user = await getServerUser()
  if (!user) return null
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'caminhoneiro') redirect('/meus-contratos')

  // Buscar custo/km real do DRE (últimos 3 meses)
  const { data: entries } = await admin.from('dre_entries')
    .select('entry_type, amount, km_reference, period')
    .eq('owner_id', profile.id)
    .gte('period', (() => {
      const d = new Date()
      d.setMonth(d.getMonth() - 3)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })())

  let custoKmReal: number | null = null
  if (entries && entries.length > 0) {
    const totalCusto = entries.filter(e => e.entry_type !== 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const totalKm   = entries.filter(e => e.entry_type === 'receita').reduce((s, e) => s + Number(e.km_reference ?? 0), 0)
    if (totalCusto > 0 && totalKm > 0) custoKmReal = totalCusto / totalKm
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Calculadora de Frete" subtitle="Descubra se o contrato vale a pena" />
      <main className="flex-1 px-lg py-xl md:px-xl overflow-auto">
        <CalculadoraClient custoKmReal={custoKmReal} />
      </main>
    </div>
  )
}
