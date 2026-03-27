import 'server-only'
import { createClient }  from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import type { ContractPublicData } from './viability'

// ─── Busca de contratos ───────────────────────────────────────────

/**
 * Lista contratos publicados para o marketplace do caminhoneiro.
 * RLS garante que apenas publicados são retornados.
 * Dados sensíveis (sensitive_contact, sensitive_address) NUNCA são selecionados aqui.
 */
export async function getPublishedContracts(filters?: {
  vehicleType?: string
  minValue?:    number
  maxValue?:    number
  search?:      string
}): Promise<ContractPublicData[]> {
  const supabase = await createClient()

  let query = supabase
    .from('contracts')
    .select(`
      id, title, route_origin, route_destination, route_km,
      vehicle_type, equipment_type, contract_value, payment_type,
      duration_months, start_date, publisher_id,
      candidates_count, published_at, status
    `)
    .eq('status', 'publicado')
    .order('published_at', { ascending: false })

  if (filters?.vehicleType) {
    query = query.eq('vehicle_type', filters.vehicleType)
  }
  if (filters?.minValue) {
    query = query.gte('contract_value', filters.minValue)
  }
  if (filters?.maxValue) {
    query = query.lte('contract_value', filters.maxValue)
  }

  const { data, error } = await query

  if (error) throw new Error(`Erro ao buscar contratos: ${error.message}`)
  return (data ?? []) as ContractPublicData[]
}

/**
 * Retorna um contrato pelo ID.
 * Dados sensíveis incluídos APENAS se o contrato está fechado
 * e o usuário é parte do fechamento.
 */
export async function getContractById(contractId: string) {
  const supabase = await createClient()

  const user = await getServerUser()
  if (!user) return null

  const { data: contract, error } = await supabase
    .from('contracts')
    .select(`
      id, title, description, route_origin, route_destination, route_km,
      vehicle_type, equipment_type, contract_value, payment_type,
      duration_months, start_date, publisher_id,
      candidates_count, published_at, status, closed_at,
      requires_own_truck, requires_own_equipment, has_risk_management
    `)
    .eq('id', contractId)
    .single()

  if (error || !contract) return null

  return contract
}

/**
 * Lista contratos da transportadora logada (inclui rascunhos).
 */
export async function getMyContracts() {
  const supabase = await createClient()

  const user = await getServerUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return []

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id, title, route_origin, route_destination, route_km,
      contract_value, status, candidates_count, published_at, created_at
    `)
    .eq('publisher_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Lista candidaturas do caminhoneiro logado.
 */
export async function getMyCandidatures() {
  const supabase = await createClient()

  const user = await getServerUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return []

  const { data, error } = await supabase
    .from('candidatures')
    .select(`
      id, status, created_at, cost_per_km_snapshot,
      contracts (
        id, title, route_origin, route_destination,
        contract_value, route_km, status
      )
    `)
    .eq('candidate_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Lista candidatos de um contrato (para a transportadora).
 * Score e dados do veículo incluídos para análise.
 */
export async function getContractCandidates(contractId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidatures')
    .select(`
      id, status, message, cost_per_km_snapshot, created_at,
      profiles!candidate_id (
        id, full_name, phone
      ),
      vehicles (
        type, brand, model, year, plate, equipment_type
      )
    `)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}
