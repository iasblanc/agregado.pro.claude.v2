'use client'

import { useState, useTransition } from 'react'
import Link       from 'next/link'
import { useRouter }               from 'next/navigation'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { logoutAction } from '@/app/(auth)/login/actions'

interface Profile {
  id: string; role: string; full_name: string; email: string
  phone?: string | null; cpf?: string | null; cnpj?: string | null; company_name?: string | null
}
interface Vehicle { id: string; type: string; brand: string; model: string; year: number; plate: string }

export function PerfilForm({
  profile,
  userEmail,
  vehicles = [],
}: {
  profile: Profile
  userEmail: string
  vehicles?: Vehicle[]
}) {
  const router = useRouter()
  const [isPending, startTransition]  = useTransition()
  const [isLoggingOut, startLogout]   = useTransition()
  const { success, error }            = useToast()
  const [form, setForm] = useState({
    full_name:    profile.full_name,
    phone:        profile.phone        ?? '',
    cpf:          profile.cpf          ?? '',
    cnpj:         profile.cnpj         ?? '',
    company_name: profile.company_name ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(form),
      })
      if (!res.ok) { error('Erro ao salvar. Tente novamente.'); return }
      success('Perfil atualizado!')
      router.refresh()
    })
  }

  const isTR = profile.role === 'transportadora'
  const roleLabel = isTR ? '🏢 Transportadora' : '🚛 Caminhoneiro'

  return (
    <>
      {/* Info da conta */}
      <Card>
        <CardHeader label="Informações da conta" />
        <CardBody>
          <div className="space-y-sm">
            <div className="flex justify-between items-center">
              <span className="text-body-sm text-ag-secondary">Tipo</span>
              <span className="text-body-sm font-medium text-ag-primary">{roleLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body-sm text-ag-secondary">E-mail</span>
              <span className="text-body-sm text-ag-primary truncate max-w-[200px]">{userEmail}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Dados editáveis */}
      <Card>
        <CardHeader label="Dados pessoais" />
        <CardBody>
          <form onSubmit={handleSave} className="space-y-lg">
            {isTR && (
              <Input label="Razão Social" name="company_name" value={form.company_name}
                onChange={e => set('company_name', e.target.value)} placeholder="Transportadora XYZ Ltda" />
            )}
            <Input label={isTR ? 'Nome do responsável' : 'Nome completo'} name="full_name"
              value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            <Input label="Telefone" name="phone" type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />

            {!isTR && (
              <Input label="CPF" name="cpf" value={form.cpf}
                onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            )}
            {isTR && (
              <Input label="CNPJ" name="cnpj" value={form.cnpj}
                onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
            )}

            <Button type="submit" fullWidth loading={isPending}>Salvar alterações</Button>
          </form>
        </CardBody>
      </Card>

      {/* Veículos — apenas caminhoneiro */}
      {!isTR && (
        <Card>
          <CardHeader label="Veículos cadastrados">
            <Link href="/gestao/veiculos" className="caption text-ag-secondary hover:text-ag-primary">
              Gerenciar →
            </Link>
          </CardHeader>
          <CardBody>
            {vehicles.length === 0 ? (
              <p className="text-body-sm text-ag-muted">Nenhum veículo cadastrado.</p>
            ) : (
              <div className="space-y-sm">
                {vehicles.map(v => (
                  <div key={v.id} className="flex justify-between items-center py-xs">
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
          <Button variant="secondary" fullWidth loading={isLoggingOut}
            onClick={() => startLogout(() => logoutAction())}>
            Sair da conta
          </Button>
        </CardBody>
      </Card>
    </>
  )
}
