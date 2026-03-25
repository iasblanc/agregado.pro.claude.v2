import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { classifyTransaction, CLASSIFICATION_THRESHOLDS } from '@/services/ai/classifier'
import { getCurrentPeriod } from '@/lib/utils'
import crypto from 'node:crypto'

// ─── Tipos do webhook BaaS ────────────────────────────────────────

export interface BaaSWebhookPayload {
  event:       'transaction.created' | 'transaction.settled' | 'transaction.cancelled'
  external_id: string
  user_token:  string   // Token do usuário no BaaS — mapeia para owner_id
  amount:      number
  currency:    string
  status:      string
  merchant: {
    name:   string
    mcc:    string | null
    cnpj:   string | null
    city:   string | null
    state:  string | null
  }
  card_last4:    string | null
  transacted_at: string  // ISO 8601
  location?: {
    latitude:  number
    longitude: number
  } | null
}

// ─── Validação HMAC ───────────────────────────────────────────────

/**
 * Valida a assinatura HMAC-SHA256 do webhook.
 * Regra de segurança: NUNCA processar webhooks sem validação de assinatura.
 */
export function validateWebhookSignature(
  payload:   string,
  signature: string,
  secret:    string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')

  // Comparação segura contra timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  )
}

// ─── Handler principal ────────────────────────────────────────────

export async function handleBaaSWebhook(payload: BaaSWebhookPayload): Promise<{
  success: boolean
  transactionId?: string
  action?: string
  error?: string
}> {
  const admin = createAdminClient()

  // 1. Resolver owner_id a partir do user_token do BaaS
  const { data: bankingAccount } = await admin
    .from('profiles')
    .select('id')
    .eq('id', payload.user_token)  // Assumindo que user_token = profile.id
    .single()

  if (!bankingAccount) {
    return { success: false, error: 'Usuário não encontrado para este token' }
  }

  const ownerId = bankingAccount.id

  // 2. Idempotência: verificar se transação já foi processada
  const { data: existing } = await admin
    .from('banking_transactions')
    .select('id, status')
    .eq('owner_id', ownerId)
    .eq('external_id', payload.external_id)
    .maybeSingle()

  // Evento de cancelamento/estorno
  if (payload.event === 'transaction.cancelled' && existing) {
    await admin
      .from('banking_transactions')
      .update({ status: 'cancelada' })
      .eq('id', existing.id)

    // Se havia lançamento no DRE, remover
    const { data: txn } = await admin
      .from('banking_transactions')
      .select('dre_entry_id')
      .eq('id', existing.id)
      .single()

    if (txn?.dre_entry_id) {
      await admin.from('dre_entries').delete().eq('id', txn.dre_entry_id)
    }

    return { success: true, transactionId: existing.id, action: 'cancelled' }
  }

  // Já processada e liquidada — ignorar duplicata
  if (existing?.status === 'liquidada') {
    return { success: true, transactionId: existing.id, action: 'duplicate_ignored' }
  }

  // 3. Classificar a transação
  const transactedAt = new Date(payload.transacted_at)

  // Buscar histórico recente de reclassificações (personalização)
  const { data: history } = await admin
    .from('banking_transactions')
    .select('merchant_name, dre_category')
    .eq('owner_id', ownerId)
    .eq('classification_source', 'manual')
    .order('updated_at', { ascending: false })
    .limit(20)

  const userHistory = history?.map(h => ({
    merchantName: h.merchant_name,
    category:     h.dre_category ?? '',
  })) ?? []

  const classification = await classifyTransaction(
    {
      merchantName:  payload.merchant.name,
      merchantMcc:   payload.merchant.mcc,
      merchantCnpj:  payload.merchant.cnpj,
      merchantCity:  payload.merchant.city,
      merchantState: payload.merchant.state,
      amount:        payload.amount,
      transactedAt,
      latitude:      payload.location?.latitude,
      longitude:     payload.location?.longitude,
    },
    userHistory
  )

  const period = `${transactedAt.getFullYear()}-${String(transactedAt.getMonth() + 1).padStart(2, '0')}`
  const isAutomatic = classification.confidence >= CLASSIFICATION_THRESHOLDS.AUTO

  // 4. Inserir ou atualizar transação
  const txnData = {
    owner_id:             ownerId,
    external_id:          payload.external_id,
    card_last4:           payload.card_last4,
    amount:               payload.amount,
    currency:             payload.currency,
    status:               payload.event === 'transaction.settled' ? 'liquidada' as const : 'pendente' as const,
    merchant_name:        payload.merchant.name,
    merchant_mcc:         payload.merchant.mcc,
    merchant_cnpj:        payload.merchant.cnpj,
    merchant_city:        payload.merchant.city,
    merchant_state:       payload.merchant.state,
    latitude:             payload.location?.latitude ?? null,
    longitude:            payload.location?.longitude ?? null,
    transacted_at:        payload.transacted_at,
    settled_at:           payload.event === 'transaction.settled' ? new Date().toISOString() : null,
    dre_category:         isAutomatic ? classification.dreCategory : null,
    entry_type:           isAutomatic ? classification.entryType : null,
    classification_source: isAutomatic ? classification.source : 'ia_sugestao' as const,
    ia_confidence:        classification.confidence,
    ia_suggested_category: !isAutomatic ? classification.dreCategory : null,
    is_operational:       classification.isOperational,
    dre_period:           period,
  }

  const upsertQuery = existing
    ? admin.from('banking_transactions').update(txnData).eq('id', existing.id).select('id').single()
    : admin.from('banking_transactions').insert(txnData).select('id').single()

  const { data: txn, error: txnErr } = await upsertQuery

  if (txnErr || !txn) {
    return { success: false, error: txnErr?.message ?? 'Falha ao salvar transação' }
  }

  // 5. Lançamento automático no DRE (apenas se alta confiança + operacional + liquidada)
  if (
    isAutomatic &&
    classification.isOperational &&
    payload.event === 'transaction.settled'
  ) {
    const { data: dreEntry } = await admin
      .from('dre_entries')
      .insert({
        owner_id:    ownerId,
        period,
        entry_type:  classification.entryType === 'custo_fixo' ? 'custo_fixo' : 'custo_variavel',
        category:    classification.dreCategory,
        description: `${payload.merchant.name} (cartão •••• ${payload.card_last4 ?? '****'})`,
        amount:      payload.amount,
        notes:       `Classificação automática — ${Math.round(classification.confidence * 100)}% confiança`,
      })
      .select('id')
      .single()

    if (dreEntry) {
      await admin
        .from('banking_transactions')
        .update({ dre_entry_id: dreEntry.id })
        .eq('id', txn.id)
    }
  }

  // 6. Auditoria
  await admin.from('audit_events').insert({
    user_id:       null,  // Sistema, não usuário
    action:        `baas_webhook_${payload.event}`,
    resource_type: 'banking_transaction',
    resource_id:   txn.id,
    metadata:      {
      external_id:   payload.external_id,
      amount:        payload.amount,
      merchant:      payload.merchant.name,
      classification: classification.dreCategory,
      confidence:    classification.confidence,
      auto_launched: isAutomatic && classification.isOperational,
    },
  })

  return {
    success: true,
    transactionId: txn.id,
    action: existing ? 'updated' : 'created',
  }
}
