'use client'
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Card, CardBody }          from '@/components/ui/card'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatBRL } from '@/lib/utils'

const TAXA_DIARIA = 0.00083  // 2.5% ao mês

export function AntecipacaoForm({ limiteSugerido }: { limiteSugerido: number }) {
  const [isPending, startTransition] = useTransition()
  const { success, error } = useToast()
  const router = useRouter()

  const [valor, setValor] = useState('')
  const [prazo, setPrazo] = useState('30')

  const valorNum = Number(valor.replace(',', '.')) || 0
  const prazoNum = Number(prazo) || 30
  const taxa     = TAXA_DIARIA * prazoNum
  const desconto = valorNum * taxa
  const liquido  = valorNum - desconto

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (valorNum <= 0) { error('Informe o valor'); return }
    if (valorNum > limiteSugerido) { error(`Valor acima do limite (${formatBRL(limiteSugerido)})`); return }

    startTransition(async () => {
      const res = await fetch('/api/antecipacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ amount: valorNum, days_anticipated: prazoNum }),
      })
      const data = await res.json()
      if (!res.ok) { error(data.error ?? 'Erro ao solicitar antecipação'); return }
      success('Antecipação solicitada! Entraremos em contato em até 1 dia útil.')
      setTimeout(() => router.push('/credito'), 1500)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-xl">
      <Card>
        <CardBody>
          <p className="caption text-ag-muted mb-xs">Seu limite disponível</p>
          <p className="font-display text-[28px] font-medium" style={{ color: 'var(--color-success)' }}>
            {formatBRL(limiteSugerido)}
          </p>
        </CardBody>
      </Card>

      <Input label="Valor a antecipar (R$)" name="valor" inputMode="decimal"
        value={valor} onChange={e => setValor(e.target.value.replace(/[^\d,]/g,''))}
        placeholder={`Máx ${formatBRL(limiteSugerido)}`} required />

      <div>
        <p className="text-body-sm font-medium text-ag-primary mb-sm">Prazo do recebível (dias)</p>
        <div className="flex gap-sm">
          {['15', '30', '60', '90'].map(d => (
            <button key={d} type="button" onClick={() => setPrazo(d)}
              className="flex-1 py-sm rounded-md border text-body-sm font-medium transition-all"
              style={{
                background:  prazo === d ? 'var(--color-accent)' : 'transparent',
                borderColor: prazo === d ? 'var(--color-accent)' : 'var(--color-border)',
                color:       prazo === d ? 'var(--color-cta-text)' : 'var(--color-text-secondary)',
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Simulação */}
      {valorNum > 0 && (
        <Card>
          <CardBody>
            <p className="text-body-sm font-medium text-ag-primary mb-md">Simulação</p>
            <div className="space-y-sm">
              {[
                ['Valor bruto',  formatBRL(valorNum)],
                [`Taxa (${(taxa * 100).toFixed(2)}%)`, `- ${formatBRL(desconto)}`],
                ['Você recebe',  formatBRL(liquido)],
              ].map(([k, v], i) => (
                <div key={k} className={`flex justify-between ${i === 2 ? 'pt-sm border-t border-ag-border' : ''}`}>
                  <span className="text-body-sm text-ag-secondary">{k}</span>
                  <span className={`text-body-sm font-medium ${i === 2 ? 'text-ag-primary' : 'text-ag-secondary'}`}>{v}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex gap-md">
        <Button type="button" variant="secondary" fullWidth onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" fullWidth loading={isPending} disabled={valorNum <= 0 || valorNum > limiteSugerido}>
          Confirmar antecipação
        </Button>
      </div>
    </form>
  )
}
