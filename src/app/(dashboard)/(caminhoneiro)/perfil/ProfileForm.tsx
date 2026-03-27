'use client'

import { useFormState } from 'react-dom'
import { updateProfileAction } from './actions'
import type { AuthActionState } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Alert }  from '@/components/ui/alert'

const initialState: AuthActionState = {}

interface ProfileFormProps {
  defaultValues: { full_name: string; phone: string }
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [state, formAction, isPending] = useFormState(updateProfileAction, initialState)

  return (
    <form action={formAction} className="space-y-md" noValidate>
      <Input
        name="full_name"
        label="Nome completo"
        defaultValue={defaultValues.full_name}
        required
        error={state.fields?.full_name}
      />
      <Input
        name="phone"
        type="tel"
        label="WhatsApp"
        placeholder="(11) 99999-9999"
        defaultValue={defaultValues.phone}
        error={state.fields?.phone}
      />

      {state.success && <Alert variant="success">{state.success}</Alert>}
      {state.error && !state.fields && <Alert variant="danger">{state.error}</Alert>}

      <Button type="submit" loading={isPending}>
        Salvar alterações
      </Button>
    </form>
  )
}
