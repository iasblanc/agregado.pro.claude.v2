'use client'

export const dynamic = 'force-dynamic'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

export default function RecuperarSenhaPage() {
  const [isPending, startTransition] = useTransition()
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Digite seu e-mail'); return }
    setError('')

    startTransition(async () => {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
      })
      setSent(true)
    })
  }

  if (sent) return (
    <div className="space-y-[var(--space-xl)] text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-[28px]"
        style={{ background: 'var(--color-success-bg)' }}>
        📬
      </div>
      <div className="space-y-sm">
        <h1 className="font-display text-display-sm font-medium text-ag-primary">E-mail enviado</h1>
        <p className="text-body text-ag-secondary">
          Se houver uma conta com esse e-mail, enviaremos as instruções de redefinição em instantes.
        </p>
      </div>
      <Link href="/login">
        <Button variant="secondary" fullWidth>Voltar ao login</Button>
      </Link>
    </div>
  )

  return (
    <div className="space-y-[var(--space-2xl)]">
      <div className="space-y-[var(--space-sm)]">
        <p className="overline">Recuperar acesso</p>
        <h1 className="font-display text-display-md font-medium text-ag-primary">Esqueci minha senha</h1>
        <p className="text-body text-ag-secondary">
          Digite seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-[var(--space-md)]">
        <Input label="E-mail" name="email" type="email" autoFocus required
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com" />
        {error && <p className="text-body-sm" style={{ color: 'var(--color-danger)' }}>⚠ {error}</p>}
        <Button type="submit" fullWidth loading={isPending}>Enviar instruções</Button>
      </form>

      <p className="text-body text-ag-secondary text-center">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-ag-primary font-medium hover:underline underline-offset-2">
          Entrar
        </Link>
      </p>
    </div>
  )
}
