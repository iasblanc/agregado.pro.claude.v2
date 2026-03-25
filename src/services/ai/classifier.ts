import 'server-only'

// ─── Tipos ────────────────────────────────────────────────────────

export interface TransactionContext {
  merchantName:    string
  merchantMcc:     string | null
  merchantCnpj:    string | null
  merchantCity:    string | null
  merchantState:   string | null
  amount:          number
  transactedAt:    Date
  latitude?:       number | null
  longitude?:      number | null
}

export interface ClassificationResult {
  dreCategory:   string
  entryType:     'custo_fixo' | 'custo_variavel' | 'pessoal'
  isOperational: boolean
  confidence:    number   // 0–1
  source:        'sistema' | 'ia_automatica' | 'ia_sugestao'
  reasoning?:    string   // Para debug/transparência
}

// ─── MCC determinísticos (confiança 1.0) ─────────────────────────
// Merchant Category Codes com mapeamento direto e inequívoco

const MCC_MAP: Record<string, { category: string; entryType: 'custo_variavel' | 'custo_fixo' | 'pessoal'; confidence: number }> = {
  // Combustível
  '5541': { category: 'diesel',           entryType: 'custo_variavel', confidence: 0.99 },
  '5542': { category: 'diesel',           entryType: 'custo_variavel', confidence: 0.99 },
  '5983': { category: 'diesel',           entryType: 'custo_variavel', confidence: 0.99 },

  // Pedágio
  '4784': { category: 'pedagio',          entryType: 'custo_variavel', confidence: 1.00 },
  '7523': { category: 'pedagio',          entryType: 'custo_variavel', confidence: 0.95 },

  // Estacionamento / Pátio
  '7521': { category: 'outros_variaveis', entryType: 'custo_variavel', confidence: 0.90 },

  // Manutenção / Mecânica
  '7531': { category: 'manutencao',       entryType: 'custo_variavel', confidence: 0.95 },
  '7534': { category: 'manutencao',       entryType: 'custo_variavel', confidence: 0.95 },
  '7535': { category: 'manutencao',       entryType: 'custo_variavel', confidence: 0.95 },
  '5013': { category: 'manutencao',       entryType: 'custo_variavel', confidence: 0.88 }, // Autopeças
  '5571': { category: 'manutencao',       entryType: 'custo_variavel', confidence: 0.85 },

  // Pneus
  '5014': { category: 'pneus',            entryType: 'custo_variavel', confidence: 0.92 },

  // Alimentação em restaurantes (contexto de viagem = operacional)
  '5812': { category: 'alimentacao_viagem', entryType: 'custo_variavel', confidence: 0.75 },
  '5814': { category: 'alimentacao_viagem', entryType: 'custo_variavel', confidence: 0.75 },

  // Hospedagem / Pernoite
  '7011': { category: 'hospedagem',       entryType: 'custo_variavel', confidence: 0.80 },
  '7012': { category: 'hospedagem',       entryType: 'custo_variavel', confidence: 0.80 },

  // Seguros
  '6311': { category: 'seguro',           entryType: 'custo_fixo',     confidence: 0.90 },
  '6321': { category: 'seguro',           entryType: 'custo_fixo',     confidence: 0.90 },
  '6399': { category: 'seguro',           entryType: 'custo_fixo',     confidence: 0.85 },

  // DETRAN / Documentação
  '9399': { category: 'licenciamento',    entryType: 'custo_fixo',     confidence: 0.70 },

  // Compras pessoais (claramente pessoal)
  '5411': { category: 'pessoal_supermercado', entryType: 'pessoal', confidence: 0.85 },
  '5912': { category: 'pessoal_farmacia',     entryType: 'pessoal', confidence: 0.90 },
  '5999': { category: 'pessoal_outros',       entryType: 'pessoal', confidence: 0.70 },
}

// ─── Palavras-chave no nome do estabelecimento ────────────────────

const MERCHANT_KEYWORDS: Array<{
  keywords:    RegExp
  category:    string
  entryType:   'custo_variavel' | 'custo_fixo' | 'pessoal'
  confidence:  number
}> = [
  { keywords: /\b(petrobras|br posto|shell|ipiranga|raizen|ale|graal)\b/i, category: 'diesel',           entryType: 'custo_variavel', confidence: 0.98 },
  { keywords: /\b(arteris|ccr|ecorodovias|rodovias|triangulo tag|semparar|veloe|viapass)\b/i, category: 'pedagio', entryType: 'custo_variavel', confidence: 0.99 },
  { keywords: /\b(borracharia|pneustore|bridgestone|michelin|pirelli|goodyear|continental pneu)\b/i, category: 'pneus', entryType: 'custo_variavel', confidence: 0.95 },
  { keywords: /\b(trucksul|randon|librelato|oficina|mecanica|retifica|cambio|suspensao)\b/i,  category: 'manutencao', entryType: 'custo_variavel', confidence: 0.90 },
  { keywords: /\b(porto seguro|bradesco seguros|allianz|mapfre|hdi|sompo|itau seguros)\b/i,  category: 'seguro', entryType: 'custo_fixo', confidence: 0.92 },
  { keywords: /\b(detran|senatran|despachante|vistoria)\b/i, category: 'licenciamento', entryType: 'custo_fixo', confidence: 0.88 },
  { keywords: /\b(rodoviaria|truckpad|pousada rota|hotel beira)\b/i, category: 'hospedagem', entryType: 'custo_variavel', confidence: 0.85 },
]

// ─── Classificador determinístico (MCC + keywords) ───────────────

/**
 * Classificação determinística — rápida, sem IA, sem custo.
 * Tenta classificar pela MCC e pelo nome do estabelecimento.
 * Confiança alta = lança automaticamente no DRE.
 */
export function classifyDeterministic(ctx: TransactionContext): ClassificationResult | null {
  // 1. Tentar MCC primeiro (mais confiável)
  if (ctx.merchantMcc) {
    const mccResult = MCC_MAP[ctx.merchantMcc]
    if (mccResult) {
      return {
        dreCategory:   mccResult.category,
        entryType:     mccResult.entryType,
        isOperational: mccResult.entryType !== 'pessoal',
        confidence:    mccResult.confidence,
        source:        'sistema',
        reasoning:     `MCC ${ctx.merchantMcc} → ${mccResult.category}`,
      }
    }
  }

  // 2. Tentar keywords no nome
  const nameLower = ctx.merchantName.toLowerCase()
  for (const rule of MERCHANT_KEYWORDS) {
    if (rule.keywords.test(nameLower)) {
      return {
        dreCategory:   rule.category,
        entryType:     rule.entryType,
        isOperational: rule.entryType !== 'pessoal',
        confidence:    rule.confidence,
        source:        'sistema',
        reasoning:     `Keyword match: "${ctx.merchantName}"`,
      }
    }
  }

  return null  // Não conseguiu classificar deterministicamente
}

// ─── Classificador por IA (Claude API) ───────────────────────────

const IA_CONFIDENCE_THRESHOLD_AUTO    = 0.85  // Acima disso: lança automaticamente
const IA_CONFIDENCE_THRESHOLD_SUGGEST = 0.60  // Acima disso: sugere ao usuário

/**
 * Classifica uma transação usando Claude (Anthropic API).
 * Chamado apenas quando a classificação determinística não é suficiente.
 *
 * Retorna null se a API falhar — nunca bloquear o fluxo por falha de IA.
 */
export async function classifyWithAI(
  ctx:          TransactionContext,
  userHistory?: Array<{ merchantName: string; category: string }> // últimas reclassificações
): Promise<ClassificationResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[AI Classifier] ANTHROPIC_API_KEY não configurada — pulando IA')
    return null
  }

  const categories = [
    'diesel',
    'pedagio',
    'manutencao',
    'pneus',
    'seguro',
    'licenciamento',
    'rastreador',
    'parcela_caminhao',
    'alimentacao_viagem',
    'hospedagem',
    'outros_variaveis',
    'outros_fixos',
    'pessoal',
  ]

  // Histórico recente do usuário para personalização
  const historyContext = userHistory && userHistory.length > 0
    ? `\nHistórico recente de reclassificações do usuário:\n${
        userHistory.slice(0, 10).map(h => `- "${h.merchantName}" → ${h.category}`).join('\n')
      }`
    : ''

  const hora   = ctx.transactedAt.getHours()
  const diaSemana = ctx.transactedAt.toLocaleDateString('pt-BR', { weekday: 'long' })

  const prompt = `Você é um classificador de despesas de caminhoneiro agregado brasileiro.

Classifique a transação abaixo em UMA das categorias listadas.
Responda APENAS com JSON válido, sem texto adicional.

TRANSAÇÃO:
- Estabelecimento: ${ctx.merchantName}
- MCC: ${ctx.merchantMcc ?? 'desconhecido'}
- Valor: R$ ${ctx.amount.toFixed(2)}
- Horário: ${hora}h de ${diaSemana}
- Cidade: ${ctx.merchantCity ?? 'não informada'}, ${ctx.merchantState ?? ''}
${historyContext}

CATEGORIAS DISPONÍVEIS:
${categories.map(c => `- ${c}`).join('\n')}

REGRAS:
- Se parece despesa operacional do caminhão → categoria de custo
- Se parece pessoal (farmácia, supermercado geral, roupas) → "pessoal"
- Alimentação em restaurante de beira de estrada em horário de viagem → alimentacao_viagem
- Dê confidence entre 0.0 e 1.0

RESPOSTA (JSON puro, sem markdown):
{
  "category": "nome_da_categoria",
  "entry_type": "custo_fixo|custo_variavel|pessoal",
  "is_operational": true|false,
  "confidence": 0.85,
  "reasoning": "motivo em 1 frase"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',  // Haiku: rápido e barato para classificação
        max_tokens: 200,
        messages:   [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(8_000),  // 8s timeout
    })

    if (!response.ok) {
      console.error('[AI Classifier] API error:', response.status)
      return null
    }

    const data   = await response.json()
    const text   = data.content?.[0]?.text ?? ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    if (!parsed.category || !categories.includes(parsed.category)) {
      console.warn('[AI Classifier] Categoria inválida retornada:', parsed.category)
      return null
    }

    const confidence = parseFloat(parsed.confidence) || 0

    return {
      dreCategory:   parsed.category,
      entryType:     parsed.entry_type ?? 'custo_variavel',
      isOperational: parsed.is_operational ?? true,
      confidence,
      source:        confidence >= IA_CONFIDENCE_THRESHOLD_AUTO
        ? 'ia_automatica'
        : 'ia_sugestao',
      reasoning:     parsed.reasoning,
    }
  } catch (err) {
    console.error('[AI Classifier] Falha na classificação:', err)
    return null  // NUNCA bloquear o fluxo por falha de IA
  }
}

// ─── Pipeline completo de classificação ──────────────────────────

/**
 * Pipeline principal: determinístico → IA → fallback manual.
 *
 * Regra do master.md:
 * - Classificações com baixa confiança → sugestão com 1 toque de confirmação
 * - NUNCA lançar silenciosamente em categoria errada
 * - Reclassificação manual = feedback obrigatório ao modelo
 */
export async function classifyTransaction(
  ctx:          TransactionContext,
  userHistory?: Array<{ merchantName: string; category: string }>
): Promise<ClassificationResult> {
  // 1. Tentar classificação determinística (sem custo, instantânea)
  const deterministic = classifyDeterministic(ctx)
  if (deterministic && deterministic.confidence >= IA_CONFIDENCE_THRESHOLD_AUTO) {
    return deterministic
  }

  // 2. Tentar IA (Claude Haiku — rápido e barato)
  const aiResult = await classifyWithAI(ctx, userHistory)
  if (aiResult) {
    // Se determinístico tinha resultado mas IA tem confiança maior, usar IA
    if (!deterministic || aiResult.confidence > deterministic.confidence) {
      return aiResult
    }
    return deterministic
  }

  // 3. Fallback: se determinístico teve resultado (mas confiança menor), usar como sugestão
  if (deterministic) {
    return { ...deterministic, source: 'ia_sugestao' }
  }

  // 4. Último fallback: sem classificação → manual obrigatório
  return {
    dreCategory:   'outros_variaveis',
    entryType:     'custo_variavel',
    isOperational: true,
    confidence:    0.10,
    source:        'ia_sugestao',
    reasoning:     'Não foi possível classificar automaticamente. Revisão manual necessária.',
  }
}

// ─── Thresholds exportados para uso no service layer ─────────────

export const CLASSIFICATION_THRESHOLDS = {
  AUTO:    IA_CONFIDENCE_THRESHOLD_AUTO,    // 0.85
  SUGGEST: IA_CONFIDENCE_THRESHOLD_SUGGEST, // 0.60
} as const
