'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { logoutAction } from '@/app/(auth)/login/actions'

interface Profile {
  id: string; role: string; full_name: string; email: string
  phone?: string | null; cpf?: string | null; cnpj?: string | null
  company_name?: string | null
}
interface Vehicle { id: string; type: string; brand: string; model: string; year: number; plate: string }

export function PerfilForm({ profile, vehicles, userEmail }: { profile: Profile; vehicles: Vehicle[]; userEmail: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLoggingOut, startLogout]  = useTransition()
  const [saved,    setSaved]  = useState(false)
  const [error,    setError]  = useState('')
  const [form,     setForm]   = useState({
    full_name:    profile.full_name,
    phone:        profile.phone        ?? '',
    cpf:          profile.cpf          ?? '',
    cnpj:         profile.cnpj         ?? '',
    company_name: profile.company_name ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaved(false)
    startTransition(async () => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError('Erro ao salvar. Tente novamente.'); return }
      setSaved(true)
      router.refresh()
    })
  }

  function handleLogout() {
    startLogout(async () => {
      await logoutAction()
    })
  }

  const roleLabel = profile.role === 'caminhoneiro' ? '🚛 Caminhoneiro' : '🏢 Transportadora'

  return (
    <>
      {/* Info da conta */}
      <Card>
        <CardHeader label="Informações da conta" />
        <CardBody>
          <div className="space-y-sm">
            <div className="flex justify-between">
              <span className="text-body-sm text-ag-secondary">Tipo</span>
              <span className="text-body-sm font-medium text-ag-primary">{roleLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-sm text-ag-secondary">E-mail</span>
              <span className="text-body-sm text-ag-primary">{userEmail}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Formulário de edição */}
      <Card>
        <CardHeader label="Dados pessoais" />
        <CardBody>
          <form onSubmit={handleSave} className="space-y-lg">
            <Input label="Nome completo" name="full_name" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            <Input label="Telefone" name="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />

            {profile.role === 'caminhoneiro' && (
              <Input label="CPF" name="cpf" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            )}
            {profile.role === 'transportadora' && (
              <>
                <Input label="Razão Social" name="company_name" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                <Input label="CNPJ" name="cnpj" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
              </>
            )}

            {error  && <p className="text-body-sm" style={{ color: 'var(--color-danger)' }}>⚠ {error}</p>}
            {saved  && <p className="text-body-sm" style={{ color: 'var(--color-success)' }}>✓ Perfil atualizado!</p>}

            <Button type="submit" fullWidth loading={isPending}>Salvar alterações</Button>
          </form>
        </CardBody>
      </Card>

      {/* Veículos */}
      {profile.role === 'caminhoneiro' && (
        <Card>
          <CardHeader label="Veículos cadastrados">
            <a href="/gestao/veiculos" className="caption text-ag-secondary hover:text-ag-primary">Gerenciar →</a>
          </CardHeader>
          <CardBody>
            {vehicles.length === 0 ? (
              <p className="text-body-sm text-ag-muted">Nenhum veículo cadastrado.</p>
            ) : (
              <div className="space-y-sm">
                {vehicles.map(v => (
                  <div key={v.id} className="flex justify-between">
                    <span className="text-body-sm text-ag-primary">{v.brand} {v.model} {v.year}</span>
                    <span className="caption text-ag-muted">{v.type} · {v.plate}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Logout */}
      <Card>
        <CardBody>
          <Button variant="secondary" fullWidth onClick={handleLogout} loading={isLoggingOut}>
            Sair da conta
          </Button>
        </CardBody>
      </Card>
    </>
  )
}
