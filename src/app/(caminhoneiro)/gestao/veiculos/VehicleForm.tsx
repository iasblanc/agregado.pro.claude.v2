'use client'

import { useActionState } from 'react'
import { createVehicleAction } from './actions'
import type { AuthActionState } from '@/app/(auth)/login/actions'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Select }  from '@/components/ui/select'
import { Alert }   from '@/components/ui/alert'
import { VEHICLE_TYPES, EQUIPMENT_TYPES } from '@/lib/constants'

const VEHICLE_OPTIONS  = VEHICLE_TYPES.map((v)  => ({ value: v, label: v }))
const EQUIPMENT_OPTIONS = [
  { value: '',                    label: 'Sem equipamento (apenas cavalo/truck)' },
  ...EQUIPMENT_TYPES.map((e) => ({ value: e, label: e })),
]

const CURRENT_YEAR = new Date().getFullYear()

const initialState: AuthActionState = {}

interface VehicleFormProps {
  onSuccess?: () => void
}

export function VehicleForm({ onSuccess }: VehicleFormProps) {
  const [state, formAction, isPending] = useActionState(createVehicleAction, initialState)

  if (state.success) {
    return (
      <div className="space-y-lg py-lg text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl"
          style={{ background: 'var(--color-success-bg)' }}
        >
          🚛
        </div>
        <div>
          <p className="text-body font-medium text-ag-primary">Veículo cadastrado!</p>
          <p className="caption mt-xs">{state.success}</p>
        </div>
        <div className="flex gap-sm justify-center">
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Cadastrar outro
          </Button>
          {onSuccess && (
            <Button size="sm" onClick={onSuccess}>
              Ver veículos
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-md" noValidate>
      {/* Tipo do veículo */}
      <Select
        name="type"
        label="Tipo do veículo"
        options={VEHICLE_OPTIONS}
        placeholder="Selecione o tipo"
        required
        error={state.fields?.type}
      />

      {/* Marca e Modelo na mesma linha */}
      <div className="grid grid-cols-2 gap-sm">
        <Input
          name="brand"
          label="Marca"
          placeholder="Volvo, Scania..."
          required
          error={state.fields?.brand}
        />
        <Input
          name="model"
          label="Modelo"
          placeholder="FH 460, R 500..."
          required
          error={state.fields?.model}
        />
      </div>

      {/* Ano e Placa */}
      <div className="grid grid-cols-2 gap-sm">
        <Input
          name="year"
          type="number"
          label="Ano"
          placeholder={String(CURRENT_YEAR)}
          min={1980}
          max={CURRENT_YEAR + 1}
          required
          error={state.fields?.year}
        />
        <Input
          name="plate"
          label="Placa"
          placeholder="ABC1D23"
          maxLength={8}
          required
          error={state.fields?.plate}
          hint="Formato Mercosul (ABC1D23) ou antigo (ABC-1234)"
          onChange={(e) => {
            // Uppercase ao digitar
            e.target.value = e.target.value.toUpperCase()
          }}
        />
      </div>

      {/* Equipamento acoplado */}
      <Select
        name="equipment_type"
        label="Equipamento acoplado"
        options={EQUIPMENT_OPTIONS}
        hint="Carretas, prancha, bi-trem, etc."
        error={state.fields?.equipment_type}
      />

      {state.error && <Alert variant="danger">{state.error}</Alert>}

      <Button type="submit" fullWidth size="lg" loading={isPending}>
        Cadastrar veículo
      </Button>
    </form>
  )
}
