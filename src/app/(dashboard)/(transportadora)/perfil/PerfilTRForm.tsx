'use client'
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { logoutAction } from '@/app/(auth)/login/actions'

interface Profile { id: string; role: string; full_name: string; email: string; phone?: string | null; cnpj?: string | null; company_name?: string | null }

export function PerfilTRForm({ profile, userEmail }: { profile: Profile; userEmail: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLoggingOut, startLogout]  = useTransition()
  const { success, error }           = useToast()
  const [form, setForm]  = useState({ full_name: profile.full_name, phone: profile.phone ?? '', cnpj: profile.cnpj ?? '', company_name: profile.company_name ?? '' })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(form) })
      if (!res.ok) { error('Erro ao salvar'); return }
      success('Perfil atualizado!')
      router.refresh()
    })
  }

  return (
    <>
      <Card>
        <CardHeader label="Informações da empresa" />
        <CardBody>
          <div className="space-y-sm">
            <div className="flex justify-between"><span className="text-body-sm text-ag-secondary">E-mail</span><span className="text-body-sm text-ag-primary">{userEmail}</span></div>
            <div className="flex justify-between"><span className="text-body-sm text-ag-secondary">Tipo</span><span className="text-body-sm text-ag-primary">🏢 Transportadora</span></div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader label="Editar dados" />
        <CardBody>
          <form onSubmit={handleSave} className="space-y-lg">
            <Input label="Razão Social" name="company_name" value={form.company_name} onChange={e => set('company_name', e.target.value)} required />
            <Input label="Nome do responsável" name="full_name" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            <Input label="CNPJ" name="cnpj" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
            <Input label="Telefone" name="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
            <Button type="submit" fullWidth loading={isPending}>Salvar alterações</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Button variant="secondary" fullWidth loading={isLoggingOut} onClick={() => startLogout(() => logoutAction())}>
            Sair da conta
          </Button>
        </CardBody>
      </Card>
    </>
  )
}
