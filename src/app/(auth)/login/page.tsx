'use client'

export const dynamic = 'force-dynamic'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Preencha todos os campos'); return }
    setError('')
    startTransition(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'E-mail ou senha incorretos'); return }
      window.location.href = data.redirectTo
    })
  }

  return (
    <div className="space-y-[var(--space-2xl)]">
      {/* Header */}
      <div className="space-y-[var(--space-sm)]">
        <p className="overline">Bem-vindo de volta</p>
        <h1 className="font-display text-display-md font-medium text-ag-primary leading-tight">
          Acessar sua conta
        </h1>
        <p className="text-body text-ag-secondary">
          Continue gerenciando seu negócio na estrada.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-[var(--space-md)]" noValidate>
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
        <Input
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Sua senha"
        />

        {/* Link recuperar senha */}
        <div className="flex justify-end">
          <Link href="/recuperar-senha"
            className="text-body-sm text-ag-secondary hover:text-ag-primary transition-colors underline underline-offset-2">
            Esqueci minha senha
          </Link>
        </div>

        {/* Erro */}
        {error && (
          <div role="alert" className="flex items-center gap-sm px-md py-sm rounded-md text-body-sm"
            style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}>
            <span aria-hidden="true">⚠</span>
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={isPending}>
          Entrar
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-md">
        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        <span className="caption text-ag-muted">ou</span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      </div>

      {/* Criar conta */}
      <p className="text-body text-ag-secondary text-center">
        Novo por aqui?{' '}
        <Link href="/cadastro" className="text-ag-primary font-medium hover:underline underline-offset-2">
          Criar conta grátis
        </Link>
      </p>
    </div>
  )
}
