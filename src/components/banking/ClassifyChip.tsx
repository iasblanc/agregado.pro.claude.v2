'use client'

import { useState, useTransition } from 'react'
import { VARIABLE_COST_LABELS, FIXED_COST_LABELS } from '@/lib/constants'

// ─── Tipos ────────────────────────────────────────────────────────

interface ClassifyChipProps {
  transactionId:    string
  currentCategory:  string | null
  suggestedCategory: string | null
  confidence:       number | null
  source:           string | null
  onReclassify?:    (newCategory: string) => void
}

// ─── Categorias disponíveis ───────────────────────────────────────

const ALL_CATEGORIES = {
  ...FIXED_COST_LABELS,
  ...VARIABLE_COST_LABELS,
  pessoal: 'Despesa pessoal',
}

// ─── Chip principal ───────────────────────────────────────────────

/**
 * ClassifyChip — chip de classificação de transação.
 *
 * Regra do master.md:
 * "Classificações com baixa confiança são apresentadas como sugestão
 *  com 1 toque de confirmação — nunca lançadas silenciosamente em categoria errada."
 * "Cada reclassificação manual é feedback obrigatório para o modelo."
 */
export function ClassifyChip({
  transactionId,
  currentCategory,
  suggestedCategory,
  confidence,
  source,
  onReclassify,
}: ClassifyChipProps) {
  const [isPending, startTransition] = useTransition()
  const [showPicker, setShowPicker]  = useState(false)
  const [localCategory, setLocalCategory] = useState(currentCategory)
  const [localSource,   setLocalSource]   = useState(source)

  const isSugestao  = localSource === 'ia_sugestao'
  const isAuto      = localSource === 'ia_automatica' || localSource === 'sistema'
  const isManual    = localSource === 'manual'
  const displayCat  = localCategory ?? suggestedCategory

  const categoryLabel =
    displayCat
      ? (ALL_CATEGORIES as Record<string, string>)[displayCat] ?? displayCat
      : 'Sem categoria'

  // Confirmar sugestão da IA com 1 toque
  function handleConfirmSuggestion() {
    if (!suggestedCategory) return
    startTransition(async () => {
      await reclassify(suggestedCategory, 'confirmar_sugestao')
    })
  }

  // Reclassificar manualmente
  async function reclassify(category: string, action: 'confirmar_sugestao' | 'manual') {
    try {
      await fetch(`/api/baas/transactions/${transactionId}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, action }),
      })
      setLocalCategory(category)
      setLocalSource(action === 'confirmar_sugestao' ? 'ia_sugestao' : 'manual')
      setShowPicker(false)
      onReclassify?.(category)
    } catch {
      // Silencioso — não bloquear UX por falha de classificação
    }
  }

  return (
    <div className="relative">
      {/* Chip principal */}
      <button
        onClick={() => setShowPicker((v) => !v)}
        disabled={isPending}
        className={[
          'inline-flex items-center gap-xs px-sm py-xs rounded-pill text-caption font-medium',
          'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2',
          isSugestao
            ? 'border-2 border-dashed'
            : 'border',
        ].join(' ')}
        style={{
          background: isSugestao
            ? 'var(--color-warning-bg)'
            : isManual
            ? 'var(--color-success-bg)'
            : 'var(--color-bg)',
          borderColor: isSugestao
            ? 'var(--color-warning)'
            : isManual
            ? 'var(--color-success-border)'
            : 'var(--color-border)',
          color: isSugestao
            ? 'var(--color-warning)'
            : isManual
            ? 'var(--color-success)'
            : 'var(--color-text-secondary)',
        }}
        aria-label={`Categoria: ${categoryLabel}. Clique para reclassificar.`}
        aria-haspopup="listbox"
        aria-expanded={showPicker}
      >
        {/* Ícone de fonte */}
        <span aria-hidden="true" className="text-[10px]">
          {isSugestao ? '💡' : isAuto ? '🤖' : isManual ? '✓' : '?'}
        </span>
        <span>{categoryLabel}</span>
        {confidence !== null && confidence > 0 && (
          <span className="opacity-60">{Math.round(confidence * 100)}%</span>
        )}
      </button>

      {/* Botão de confirmação rápida (1 toque) quando é sugestão */}
      {isSugestao && suggestedCategory && !showPicker && (
        <button
          onClick={handleConfirmSuggestion}
          disabled={isPending}
          className="ml-xs inline-flex items-center gap-xs px-sm py-xs rounded-pill text-caption font-medium border transition-all"
          style={{
            background: 'var(--color-success-bg)',
            borderColor: 'var(--color-success-border)',
            color: 'var(--color-success)',
          }}
          aria-label="Confirmar sugestão da IA"
        >
          {isPending ? '...' : '✓ Confirmar'}
        </button>
      )}

      {/* Picker de categoria */}
      {showPicker && (
        <div
          className="absolute left-0 top-full mt-xs z-50 bg-ag-bg border border-ag-border rounded-xl shadow-lg min-w-[200px] py-xs"
          role="listbox"
          aria-label="Selecionar categoria"
        >
          <p className="px-md py-xs caption text-ag-muted border-b border-ag-border mb-xs">
            Reclassificar como:
          </p>
          <div className="max-h-[240px] overflow-y-auto">
            {Object.entries(ALL_CATEGORIES).map(([value, label]) => (
              <button
                key={value}
                role="option"
                aria-selected={localCategory === value}
                onClick={() => startTransition(() => reclassify(value, 'manual'))}
                className={[
                  'w-full text-left px-md py-sm text-body-sm transition-colors hover:bg-ag-surface',
                  localCategory === value ? 'font-medium text-ag-primary' : 'text-ag-secondary',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="w-full text-center px-md py-xs caption text-ag-muted border-t border-ag-border mt-xs hover:text-ag-secondary transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
