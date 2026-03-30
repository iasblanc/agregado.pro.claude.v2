import { NextResponse } from 'next/server'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ notifications: [] })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ notifications: [] })

  const notifications: Array<{ id: string; type: string; message: string; href: string; created_at: string }> = []

  if (profile.role === 'caminhoneiro') {
    // Candidaturas aceitas/recusadas recentemente
    const { data: cands } = await admin.from('candidatures')
      .select(`id, status, updated_at, contract:contracts!candidatures_contract_id_fkey(title, route_origin, route_destination)`)
      .eq('candidate_id', profile.id)
      .in('status', ['aceita', 'recusada'])
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(10)

    for (const c of cands ?? []) {
      const contract = c.contract as { title?: string } | null
      notifications.push({
        id:         c.id,
        type:       c.status === 'aceita' ? 'success' : 'info',
        message:    c.status === 'aceita'
          ? `✅ Candidatura aceita: ${contract?.title ?? 'Contrato'}`
          : `Candidatura recusada: ${contract?.title ?? 'Contrato'}`,
        href:       '/contratos',
        created_at: c.updated_at,
      })
    }
  } else if (profile.role === 'transportadora') {
    // Candidaturas pendentes nos contratos da TR
    const { data: contracts } = await admin.from('contracts')
      .select('id, title').eq('publisher_id', profile.id).eq('status', 'publicado')

    if (contracts && contracts.length > 0) {
      const { data: pending } = await admin.from('candidatures')
        .select('id, contract_id, created_at')
        .in('contract_id', contracts.map(c => c.id))
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(20)

      const contractMap = Object.fromEntries(contracts.map(c => [c.id, c.title]))
      const byContract: Record<string, number> = {}
      for (const p of pending ?? []) {
        byContract[p.contract_id] = (byContract[p.contract_id] ?? 0) + 1
      }

      for (const [cId, count] of Object.entries(byContract)) {
        notifications.push({
          id:         cId,
          type:       'info',
          message:    `${count} candidatura${count > 1 ? 's' : ''} pendente${count > 1 ? 's' : ''}: ${contractMap[cId] ?? 'Contrato'}`,
          href:       `/meus-contratos/${cId}`,
          created_at: new Date().toISOString(),
        })
      }
    }
  }

  return NextResponse.json({ notifications, count: notifications.length })
}
