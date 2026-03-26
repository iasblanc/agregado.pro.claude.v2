'use client'

import { useFormState } from 'react-dom'
import Link  from 'next/link'
import { requestPasswordResetAction } from './actions'
import type { AuthActionState }        from '../login/actions'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

const initialState: AuthActionState = {}

export default function RecuperarSenhaPage() {
  const [state, formAction, isPending] = useFormState(
    requestPasswordResetAction,
    initialState
  )

  if (state.success) {
    return (
      <div className="space-y-[var(--space-lg)] text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-[28px]"
          style={{ background: 'var(--color-success-bg)' }}
        >
          📬
        </div>
        <div className="space-y-sm">
          <h1 className="font-display text-display-sm font-medium text-ag-primary">
            E-mail enviado
          </h1>
          <p className="text-body text-ag-secondary">{state.success}</p>
          <p className="caption text-ag-muted">
            Verifique também a pasta de spam.
          </p>
        </div>
        <Link href="/login">
          <Button variant="secondary" fullWidth>
            Voltar ao login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-[var(--space-2xl)]">
      <div className="space-y-sm">
        <p className="overline">Sem problema</p>
        <h1 className="font-display text-display-md font-medium text-ag-primary">
          Recuperar senha
        </h1>
        <p className="text-body text-ag-secondary">
          Digite seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
      </div>

      <form action={formAction} className="space-y-[var(--space-md)]" noValidate>
        <Input
          name="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          autoFocus
          required
          error={state.fields?.email}
        />

        {state.error && (
          <div
            role="alert"
            className="px-md py-sm rounded-md text-body-sm"
            style={{
              background: 'var(--color-danger-bg)',
              color:      'var(--color-danger)',
              border:     '1px solid var(--color-danger-border)',
            }}
          >
            {state.error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Enviar link de recuperação
        </Button>
      </form>

      <p className="text-body text-ag-secondary text-center">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-ag-primary font-medium hover:underline underline-offset-2">
          Voltar ao login
        </Link>
      </p>
    </div>
  )
}
