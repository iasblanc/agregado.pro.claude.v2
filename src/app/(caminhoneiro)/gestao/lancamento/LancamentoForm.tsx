'use client'

import { useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { createDreEntryAction }   from './actions'
import type { AuthActionState }   from '@/app/(auth)/login/actions'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Select }  from '@/components/ui/select'
import { Alert }   from '@/components/ui/alert'
import {
  FIXED_COST_CATEGORIES,
  FIXED_COST_LABELS,
  VARIABLE_COST_CATEGORIES,
  VARIABLE_COST_LABELS,
} from '@/lib/constants'
import { formatBRL, formatCostPerKm, getCurrentPeriod } from '@/lib/utils'

// ─── Opções derivadas das constantes ─────────────────────────────

const ENTRY_TYPE_OPTIONS = [
  { value: 'receita',        label: '📥 Receita (frete, bonificação...)' },
  { value: 'custo_fixo',     label: '📌 Custo fixo (parcela, seguro...)' },
  { value: 'custo_variavel', label: '⛽ Custo variável (diesel, pedágio...)' },
]

const FIXED_COST_OPTIONS = Object.entries(FIXED_COST_LABELS).map(([v, l]) => ({
  value: v, label: l,
}))

const VARIABLE_COST_OPTIONS = Object.entries(VARIABLE_COST_LABELS).map(([v, l]) => ({
  value: v, label: l,
}))

// ─── Preview de resultado ─────────────────────────────────────────

function EntryPreview({
  amount,
  kmRef,
  entryType,
}: {
  amount:    number
  kmRef:     number
  entryType: string
}) {
  if (amount <= 0) return null

  const isReceita = entryType === 'receita'
  const costPerKm = kmRef > 0 && !isReceita ? amount / kmRef : null

  return (
    <div
      className="flex items-center justify-between px-md py-sm rounded-md text-body-sm"
      style={{
        background: isReceita ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
        border:     `1px solid ${isReceita ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
        color:      isReceita ? 'var(--color-success)' : 'var(--color-warning)',
      }}
    >
      <span>{isReceita ? '📥 Entrada' : '📤 Saída'}</span>
      <div className="text-right">
        <span className="font-medium">{formatBRL(amount)}</span>
        {costPerKm && (
          <span className="block text-caption opacity-80">
            {formatCostPerKm(costPerKm)}/km
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Formulário ───────────────────────────────────────────────────

interface LancamentoFormProps {
  period?:    string
  vehicleId?: string
  onSuccess?: () => void
}

const initialState: AuthActionState = {}

export function LancamentoForm({ period, vehicleId, onSuccess }: LancamentoFormProps) {
  const [state, formAction, isPending] = useFormState(createDreEntryAction, initialState)
  const [, startTransition]            = useTransition()

  const [entryType, setEntryType] = useState('receita')
  const [amount,    setAmount]    = useState(0)
  const [kmRef,     setKmRef]     = useState(0)

  const currentPeriod = period ?? getCurrentPeriod()
  const isReceita     = entryType === 'receita'
  const isCustoFixo   = entryType === 'custo_fixo'

  // Categorias dependem do tipo de lançamento
  const categoryOptions =
    isReceita     ? [{ value: 'frete', label: 'Frete' }, { value: 'bonificacao', label: 'Bonificação' }, { value: 'outros_receita', label: 'Outras receitas' }] :
    isCustoFixo   ? FIXED_COST_OPTIONS :
    VARIABLE_COST_OPTIONS

  function handleSuccess() {
    startTransition(() => {
      onSuccess?.()
    })
  }

  if (state.success) {
    return (
      <div className="space-y-lg py-lg text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl"
          style={{ background: 'var(--color-success-bg)' }}
        >
          ✓
        </div>
        <div>
          <p className="text-body font-medium text-ag-primary">Lançamento registrado!</p>
          <p className="caption mt-xs">{state.success}</p>
        </div>
        <div className="flex gap-sm justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Novo lançamento
          </Button>
          {onSuccess && (
            <Button size="sm" onClick={handleSuccess}>
              Ver DRE
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-md" noValidate>
      {/* Campos hidden */}
      <input type="hidden" name="period"     value={currentPeriod} />
      {vehicleId && <input type="hidden" name="vehicle_id" value={vehicleId} />}

      {/* Tipo de lançamento */}
      <Select
        name="entry_type"
        label="Tipo de lançamento"
        options={ENTRY_TYPE_OPTIONS}
        value={entryType}
        onChange={(e) => {
          setEntryType(e.target.value)
        }}
        required
        error={state.fields?.entry_type}
      />

      {/* Categoria — depende do tipo */}
      <Select
        key={entryType} // reset ao mudar tipo
        name="category"
        label="Categoria"
        placeholder="Selecione a categoria"
        options={categoryOptions}
        required
        error={state.fields?.category}
      />

      {/* Descrição */}
      <Input
        name="description"
        type="text"
        label="Descrição"
        placeholder={
          isReceita
            ? 'Ex: Frete SP → CWB, viagem 15/03'
            : 'Ex: Abastecimento Posto BR, Rodovia Anhanguera'
        }
        required
        error={state.fields?.description}
      />

      {/* Valor */}
      <Input
        name="amount"
        type="number"
        label="Valor (R$)"
        placeholder="0,00"
        min="0.01"
        step="0.01"
        required
        error={state.fields?.amount}
        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
        hint={isReceita ? 'Valor total recebido pelo frete' : 'Valor pago'}
        prefix={<span className="text-body-sm font-medium text-ag-muted">R$</span>}
      />

      {/* KM — obrigatório para receitas, opcional para variáveis */}
      {(isReceita || !isCustoFixo) && (
        <Input
          name="km_reference"
          type="number"
          label={isReceita ? 'Quilômetros rodados' : 'KM de referência (opcional)'}
          placeholder="Ex: 450"
          min="1"
          step="1"
          required={isReceita}
          error={state.fields?.km_reference}
          onChange={(e) => setKmRef(parseFloat(e.target.value) || 0)}
          hint={
            isReceita
              ? 'KM total da viagem — base para calcular o custo/km'
              : 'Informe o KM para calcular o custo por km deste item'
          }
          suffix={<span className="caption text-ag-muted">km</span>}
        />
      )}

      {/* Preview em tempo real */}
      {amount > 0 && (
        <EntryPreview amount={amount} kmRef={kmRef} entryType={entryType} />
      )}

      {/* Observações */}
      <Input
        name="notes"
        type="text"
        label="Observações (opcional)"
        placeholder="Notas adicionais..."
        error={state.fields?.notes}
      />

      {/* Erro global */}
      {state.error && (
        <Alert variant="danger">{state.error}</Alert>
      )}

      <Button type="submit" fullWidth size="lg" loading={isPending}>
        {isPending ? 'Salvando...' : 'Registrar lançamento'}
      </Button>
    </form>
  )
}
