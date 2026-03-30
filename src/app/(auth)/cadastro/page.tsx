'use client'

export const dynamic = 'force-dynamic'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

export default function CadastroPage() {
  const [isPending, startTransition] = useTransition()
  const [role,             setRole]   = useState<'caminhoneiro' | 'transportadora'>('caminhoneiro')
  const [form,             setForm]   = useState({ full_name: '', email: '', password: '', confirm_password: '', phone: '', cpf: '', cnpj: '', company_name: '' })
  const [errors,           setErrors] = useState<Record<string, string>>({})
  const [globalError,      setGlobal] = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({}); setGlobal('')

    startTransition(async () => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ...form, role }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.fields) setErrors(Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k, (v as string[])[0] ?? ''])))
        else setGlobal(data.error ?? 'Erro ao criar conta.')
        return
      }
      window.location.href = data.redirectTo
    })
  }

  return (
    <div className="space-y-[var(--space-2xl)]">
      <div className="space-y-[var(--space-sm)]">
        <p className="overline">Criar conta grátis</p>
        <h1 className="font-display text-display-md font-medium text-ag-primary">Comece agora</h1>
        <p className="text-body text-ag-secondary">Gerencie seu negócio e contratos em um só lugar.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-[var(--space-md)]" noValidate>
        {/* Role */}
        <div>
          <p className="text-body-sm font-medium text-ag-primary mb-sm">Tipo de conta</p>
          <div className="grid grid-cols-2 gap-sm">
            {[
              { value: 'caminhoneiro',   label: 'Sou caminhoneiro',  icon: '🚛', desc: 'Gestão financeira e contratos' },
              { value: 'transportadora', label: 'Sou transportadora', icon: '🏢', desc: 'Publique contratos' },
            ].map(opt => (
              <button key={opt.value} type="button" onClick={() => setRole(opt.value as typeof role)}
                className="flex flex-col gap-xs p-md rounded-lg border text-left transition-all"
                style={{
                  background:  role === opt.value ? 'var(--color-surface)' : 'var(--color-bg)',
                  borderColor: role === opt.value ? 'var(--color-accent)' : 'var(--color-border)',
                }}>
                <span className="text-[20px]">{opt.icon}</span>
                <span className="text-body-sm font-medium text-ag-primary">{opt.label}</span>
                <span className="caption text-ag-muted">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <Input label="Nome completo" name="full_name" autoComplete="name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} error={errors.full_name} placeholder="João da Silva" />
        <Input label="E-mail" name="email" type="email" autoComplete="email" required value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} placeholder="seu@email.com" />
        <Input label="Telefone (opcional)" name="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />

        {role === 'caminhoneiro' && (
          <Input label="CPF" name="cpf" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" error={errors.cpf} />
        )}
        {role === 'transportadora' && (
          <>
            <Input label="Razão Social" name="company_name" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Transportadora XYZ Ltda" />
            <Input label="CNPJ" name="cnpj" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" error={errors.cnpj} />
          </>
        )}

        <Input label="Senha" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} placeholder="Mínimo 8 caracteres" />
        <Input label="Confirmar senha" name="confirm_password" type="password" autoComplete="new-password" required value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} error={errors.confirm_password} placeholder="Repita a senha" />

        {globalError && (
          <div role="alert" className="flex items-center gap-sm px-md py-sm rounded-md text-body-sm"
            style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}>
            ⚠ {globalError}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={isPending}>Criar conta</Button>
      </form>

      <p className="text-body text-ag-secondary text-center">
        Já tem conta?{' '}
        <Link href="/login" className="text-ag-primary font-medium hover:underline underline-offset-2">Entrar</Link>
      </p>
    </div>
  )
}
