import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { calculateDre, calculateDreComparativo } from './calculator'
import { getLastPeriods } from '@/lib/utils'

// ─── Busca de dados ────────────────────────────────────────────────

/**
 * Retorna o DRE de um período para o usuário autenticado.
 * RLS garante isolamento automático por tenant.
 */
export async function getDreByPeriod(period: string, vehicleId?: string) {
  const supabase = await createClient()

  const { data: entries, error } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('period', period)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Erro ao buscar lançamentos: ${error.message}`)

  return calculateDre(entries ?? [], period, vehicleId)
}

/**
 * Retorna o DRE comparativo entre o período atual e o anterior.
 */
export async function getDreComparativo(period: string) {
  const supabase   = await createClient()
  const periods    = getLastPeriods(2)
  const periodoAtual    = period
  const periodoAnterior = periods[1] ?? null

  const [resAtual, resAnterior] = await Promise.all([
    supabase.from('dre_entries').select('*').eq('period', periodoAtual),
    periodoAnterior
      ? supabase.from('dre_entries').select('*').eq('period', periodoAnterior)
      : Promise.resolve({ data: null, error: null }),
  ])

  if (resAtual.error) throw new Error(resAtual.error.message)

  return calculateDreComparativo(
    resAtual.data ?? [],
    resAnterior.data ?? null,
    periodoAtual,
    periodoAnterior
  )
}

/**
 * Retorna o histórico de DRE dos últimos N meses.
 */
export async function getDreHistory(months = 6) {
  const supabase = await createClient()
  const periods  = getLastPeriods(months)

  const { data: entries, error } = await supabase
    .from('dre_entries')
    .select('*')
    .in('period', periods)
    .order('period', { ascending: false })

  if (error) throw new Error(error.message)

  return periods.map((period) =>
    calculateDre(
      (entries ?? []).filter((e) => e.period === period),
      period
    )
  )
}

/**
 * Insere um novo lançamento no DRE.
 * Validação de dados feita via Zod antes de chamar esta função.
 */
export async function createDreEntry(input: {
  vehicle_id?: string
  period: string
  entry_type: 'receita' | 'custo_fixo' | 'custo_variavel'
  category: string
  description: string
  amount: number
  km_reference?: number
  notes?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado')

  // Buscar profile_id do usuário
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil não encontrado')

  const { data, error } = await supabase
    .from('dre_entries')
    .insert({
      ...input,
      owner_id: profile.id,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar lançamento: ${error.message}`)

  return data
}

/**
 * Remove um lançamento do DRE (apenas o próprio usuário).
 * RLS garante que não pode remover lançamentos de outros.
 */
export async function deleteDreEntry(entryId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dre_entries')
    .delete()
    .eq('id', entryId)

  if (error) throw new Error(`Erro ao remover lançamento: ${error.message}`)

  return { success: true }
}
