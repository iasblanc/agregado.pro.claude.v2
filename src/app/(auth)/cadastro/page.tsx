'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import Link    from 'next/link'
import { registerAction }   from './actions'
import type { AuthActionState } from '../login/actions'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'

const initialState: AuthActionState = {}

// ─── Seletor de Role ──────────────────────────────────────────────

function RoleSelector({
  value,
  onChange,
}: {
  value:    string
  onChange: (v: string) => void
}) {
  const options = [
    {
      value: 'caminhoneiro',
      label: 'Sou caminhoneiro',
      desc:  'Gerencie seu negócio, contratos e finanças',
      icon:  '🚛',
    },
    {
      value: 'transportadora',
      label: 'Sou transportadora',
      desc:  'Publique contratos e encontre agregados',
      icon:  '🏢',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-sm" role="radiogroup" aria-label="Tipo de conta">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'flex flex-col gap-xs p-md rounded-lg border text-left transition-all duration-150',
            value === opt.value
              ? 'border-ag-accent bg-ag-surface shadow-sm'
              : 'border-ag-border bg-ag-bg hover:border-ag-secondary',
          ].join(' ')}
        >
          <span className="text-[20px]" aria-hidden="true">{opt.icon}</span>
          <span className="text-body-sm font-medium text-ag-primary">{opt.label}</span>
          <span className="caption">{opt.desc}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────

export default function CadastroPage() {
  const [state, formAction, isPending] = useFormState(registerAction, initialState)
  const [role, setRole] = useState('caminhoneiro')
  const [showPwd, setShowPwd] = useState(false)

  // Sucesso: confirmação de email
  if (state.success) {
    return (
      <div className="space-y-[var(--space-lg)] text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-[28px]"
          style={{ background: 'var(--color-success-bg)' }}
        >
          ✉️
        </div>
        <div className="space-y-sm">
          <h1 className="font-display text-display-sm font-medium text-ag-primary">
            Verifique seu e-mail
          </h1>
          <p className="text-body text-ag-secondary">{state.success}</p>
        </div>
        <Link href="/login">
          <Button variant="secondary" fullWidth>
            Ir para o login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-[var(--space-xl)]">
      {/* Cabeçalho */}
      <div className="space-y-sm">
        <p className="overline">Grátis para começar</p>
        <h1 className="font-display text-display-md font-medium text-ag-primary">
          Criar sua conta
        </h1>
      </div>

      {/* Formulário */}
      <form action={formAction} className="space-y-[var(--space-md)]" noValidate>
        {/* Tipo de conta */}
        <div className="space-y-xs">
          <label className="text-body-sm font-medium text-ag-primary">
            Tipo de conta
          </label>
          <RoleSelector value={role} onChange={setRole} />
          <input type="hidden" name="role" value={role} />
        </div>

        <Input
          name="full_name"
          type="text"
          label={role === 'transportadora' ? 'Nome do responsável' : 'Seu nome completo'}
          placeholder="João da Silva"
          autoComplete="name"
          required
          error={state.fields?.full_name}
        />

        <Input
          name="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          required
          error={state.fields?.email}
        />

        {/* Campos condicionais por role */}
        {role === 'caminhoneiro' && (
          <Input
            name="cpf"
            type="text"
            label="CPF"
            placeholder="000.000.000-00"
            autoComplete="off"
            required
            error={state.fields?.cpf}
            hint="Usado para identificação no marketplace"
          />
        )}

        {role === 'transportadora' && (
          <>
            <Input
              name="company_name"
              type="text"
              label="Razão social"
              placeholder="Transportes Silva Ltda"
              required
              error={state.fields?.company_name}
            />
            <Input
              name="cnpj"
              type="text"
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              autoComplete="off"
              required
              error={state.fields?.cnpj}
            />
          </>
        )}

        <Input
          name="phone"
          type="tel"
          label="WhatsApp (opcional)"
          placeholder="(11) 99999-9999"
          autoComplete="tel"
          error={state.fields?.phone}
        />

        <Input
          name="password"
          type={showPwd ? 'text' : 'password'}
          label="Senha"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          required
          error={state.fields?.password}
          hint="Ao menos 8 caracteres, uma maiúscula e um número"
          suffix={
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="text-ag-muted hover:text-ag-secondary transition-colors"
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPwd ? '🙈' : '👁'}
            </button>
          }
        />

        <Input
          name="confirm_password"
          type="password"
          label="Confirmar senha"
          placeholder="Repita a senha"
          autoComplete="new-password"
          required
          error={state.fields?.confirm_password}
        />

        {/* Erro global */}
        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-sm px-md py-sm rounded-md text-body-sm"
            style={{
              background: 'var(--color-danger-bg)',
              color:      'var(--color-danger)',
              border:     '1px solid var(--color-danger-border)',
            }}
          >
            <span aria-hidden="true">⚠</span>
            {state.error}
          </div>
        )}

        {/* Termos */}
        <p className="caption text-ag-muted text-center">
          Ao criar conta você concorda com nossos{' '}
          <Link href="/termos" className="underline underline-offset-2 hover:text-ag-secondary">
            Termos de Uso
          </Link>{' '}
          e{' '}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-ag-secondary">
            Política de Privacidade
          </Link>
          .
        </p>

        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Criar conta grátis
        </Button>
      </form>

      {/* Login */}
      <p className="text-body text-ag-secondary text-center">
        Já tem conta?{' '}
        <Link
          href="/login"
          className="text-ag-primary font-medium hover:underline underline-offset-2"
        >
          Entrar
        </Link>
      </p>
    </div>
  )
}
