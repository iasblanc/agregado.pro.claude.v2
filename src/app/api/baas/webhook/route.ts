export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { handleBaaSWebhook, validateWebhookSignature } from '@/services/banking/webhook-handler'
import type { BaaSWebhookPayload } from '@/services/banking/webhook-handler'

/**
 * POST /api/baas/webhook
 *
 * Endpoint do webhook do parceiro BaaS (Celcoin ou Swap).
 * Recebe eventos de transação do cartão de débito.
 *
 * Segurança obrigatória:
 * 1. Validação HMAC-SHA256 da assinatura
 * 2. Idempotência via external_id
 * 3. Timeout curto (BaaS retentará automaticamente)
 * 4. Service role key — sem sessão de usuário
 *
 * Retorna 200 em todos os casos gerenciados (evitar retentativas desnecessárias).
 * Retorna 401 apenas para assinatura inválida.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Ler body como texto para validação HMAC (antes de parsear)
    const rawBody  = await request.text()
    const signature = request.headers.get('x-baas-signature') ?? ''

    // 2. Validar assinatura HMAC
    const secret = process.env.BAAS_WEBHOOK_SECRET
    if (!secret) {
      console.error('[BaaS Webhook] BAAS_WEBHOOK_SECRET não configurado')
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
    }

    if (!signature || !validateWebhookSignature(rawBody, signature, secret)) {
      console.warn('[BaaS Webhook] Assinatura inválida — request rejeitado')
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }

    // 3. Parsear payload
    let payload: BaaSWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    // 4. Validar campos obrigatórios
    if (!payload.external_id || !payload.user_token || !payload.amount) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    // 5. Processar com timeout de 10s (BaaS aceita até 30s antes de retentar)
    const result = await Promise.race([
      handleBaaSWebhook(payload),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10_000)
      ),
    ])

    const elapsed = Date.now() - startTime
    console.info(`[BaaS Webhook] ${payload.event} — ${result.action} (${elapsed}ms)`)

    return NextResponse.json(
      { received: true, transactionId: result.transactionId, action: result.action },
      { status: 200 }
    )
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[BaaS Webhook] Erro após ${elapsed}ms:`, err)

    // Retornar 200 para evitar retentativas em loop por erros internos
    // O BaaS deve retentar apenas para erros 5xx de conectividade
    return NextResponse.json(
      { received: false, error: 'Erro interno — registrado para análise' },
      { status: 200 }
    )
  }
}

// Rejeitar outros métodos explicitamente
export async function GET() {
  return NextResponse.json({ error: 'Método não permitido' }, { status: 405 })
}
