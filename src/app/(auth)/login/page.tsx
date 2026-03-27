'use client'

import { useState }     from 'react'
import { useFormState } from 'react-dom'
import Link             from 'next/link'
import { loginAction, type AuthActionState } from './actions'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

const initialState: AuthActionState = {}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function LoginPage() {
  const [state, formAction, isPending] = useFormState(loginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-[var(--space-2xl)]">
      <div className="space-y-[var(--space-sm)]">
        <p className="overline">Bem-vindo de volta</p>
        <h1 className="font-display text-display-md font-medium text-ag-primary">
          Entrar na sua conta
        </h1>
        <p className="text-body text-ag-secondary">
          Acesse sua gestão financeira e contratos.
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
          defaultValue=""
        />
        <Input
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="Senha"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          error={state.fields?.password}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="text-ag-muted hover:text-ag-secondary transition-colors"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <EyeIcon open={showPassword} />
            </button>
          }
        />

        {state.error && !state.fields && (
          <div role="alert" className="flex items-center gap-sm px-md py-sm rounded-md text-body-sm"
            style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}>
            <span aria-hidden="true">⚠</span>
            {state.error}
          </div>
        )}

        <div className="flex justify-end">
          <Link href="/recuperar-senha" className="text-body-sm text-ag-secondary hover:text-ag-primary transition-colors underline underline-offset-2">
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Entrar
        </Button>
      </form>

      <div className="flex items-center gap-md">
        <div className="flex-1 h-px bg-ag-border" />
        <span className="caption">ou</span>
        <div className="flex-1 h-px bg-ag-border" />
      </div>

      <p className="text-body text-ag-secondary text-center">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="text-ag-primary font-medium hover:underline underline-offset-2 transition-colors">
          Criar conta grátis
        </Link>
      </p>
    </div>
  )
}
