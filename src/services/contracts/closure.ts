import 'server-only'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Fechamento bilateral ─────────────────────────────────────────

/**
 * Transportadora aceita candidatura.
 * Status: pendente → aceita
 * Dados sensíveis ainda NÃO liberados.
 */
export async function acceptCandidature(candidatureId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'transportadora') {
    throw new Error('Apenas transportadoras podem aceitar candidaturas')
  }

  // Verificar que a candidatura pertence a um contrato desta transportadora
  const { data: cand } = await supabase
    .from('candidatures')
    .select('id, status, contract_id, contracts!inner(publisher_id)')
    .eq('id', candidatureId)
    .single()

  if (!cand) throw new Error('Candidatura não encontrada')
  if (cand.status !== 'pendente') throw new Error('Candidatura não está pendente')

  const { error } = await supabase
    .from('candidatures')
    .update({ status: 'aceita', accepted_at: new Date().toISOString() })
    .eq('id', candidatureId)

  if (error) throw new Error(error.message)

  // Atualizar status do contrato para em_negociacao
  await supabase
    .from('contracts')
    .update({ status: 'em_negociacao' })
    .eq('id', cand.contract_id)

  // Auditoria
  const admin = createAdminClient()
  await admin.from('audit_events').insert({
    user_id:       user.id,
    action:        'candidature_accepted',
    resource_type: 'candidature',
    resource_id:   candidatureId,
    metadata:      { contract_id: cand.contract_id },
  })
}

/**
 * Caminhoneiro confirma candidatura aceita.
 * Status: aceita → confirmada → contrato FECHADO
 * Dados sensíveis liberados após este passo.
 */
export async function confirmCandidature(candidatureId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'caminhoneiro') {
    throw new Error('Apenas caminhoneiros podem confirmar candidaturas')
  }

  const { data: cand } = await supabase
    .from('candidatures')
    .select('id, status, contract_id, candidate_id')
    .eq('id', candidatureId)
    .eq('candidate_id', profile.id)
    .single()

  if (!cand) throw new Error('Candidatura não encontrada')
  if (cand.status !== 'aceita') throw new Error('Candidatura não está no status aceita')

  const now = new Date().toISOString()

  // Fechar candidatura
  await supabase
    .from('candidatures')
    .update({ status: 'confirmada', confirmed_at: now })
    .eq('id', candidatureId)

  // Fechar contrato — dados sensíveis agora liberados pelo RLS
  await supabase
    .from('contracts')
    .update({ status: 'fechado', closed_at: now })
    .eq('id', cand.contract_id)

  // Atualizar candidaturas pendentes para canceladas
  await supabase
    .from('candidatures')
    .update({ status: 'cancelada' })
    .eq('contract_id', cand.contract_id)
    .neq('id', candidatureId)
    .eq('status', 'pendente')

  // Auditoria
  const admin = createAdminClient()
  await admin.from('audit_events').insert({
    user_id:       user.id,
    action:        'contract_closed',
    resource_type: 'contract',
    resource_id:   cand.contract_id,
    metadata:      { candidature_id: candidatureId },
  })
}

/**
 * Caminhoneiro cancela candidatura pendente.
 */
export async function cancelCandidature(candidatureId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) throw new Error('Perfil não encontrado')

  const { error } = await supabase
    .from('candidatures')
    .update({ status: 'cancelada' })
    .eq('id', candidatureId)
    .eq('candidate_id', profile.id)
    .in('status', ['pendente', 'aceita'])

  if (error) throw new Error(error.message)
}
