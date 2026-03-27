'use client'

import { useTransition, useState } from 'react'
import { Button }        from '@/components/ui/button'
import { Alert }         from '@/components/ui/alert'
import { ViabilityBadge } from '@/components/financial/ViabilityBadge'
import type { ContractViability } from '@/lib/constants'

// ─── Actions ──────────────────────────────────────────────────────
// Inline para manter o arquivo autocontido

async function applyCandidature(contractId: string, message: string, costPerKm: number) {
  const res = await fetch('/api/contracts/candidature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contractId, message, costPerKmSnapshot: costPerKm }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao candidatar')
  }
  return res.json()
}

async function withdrawCandidature(candidatureId: string) {
  const res = await fetch(`/api/contracts/candidature/${candidatureId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Erro ao cancelar candidatura')
}

// ─── Props ────────────────────────────────────────────────────────

interface CandidaturaFormProps {
  contractId:            string
  existingCandidature:   { id: string; status: string } | null
  userCostPerKm:         number
  viability:             ContractViability
}

// ─── Status labels ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }> = {
  pendente:   { label: 'Candidatura enviada — aguardando análise da transportadora', variant: 'info'    },
  aceita:     { label: 'Sua candidatura foi aceita! Confirme para fechar o contrato.',  variant: 'success' },
  confirmada: { label: 'Contrato fechado! Os dados de contato foram liberados.',        variant: 'success' },
  recusada:   { label: 'Candidatura não aprovada para este contrato.',                  variant: 'danger'  },
  cancelada:  { label: 'Candidatura cancelada.',                                        variant: 'warning' },
}

// ─── Componente ───────────────────────────────────────────────────

export function CandidaturaForm({
  contractId,
  existingCandidature,
  userCostPerKm,
  viability,
}: CandidaturaFormProps) {
  const [isPending, startTransition] = useTransition()
  const [message,   setMessage]      = useState('')
  const [error,     setError]        = useState<string | null>(null)
  const [localCand, setLocalCand]    = useState(existingCandidature)

  // Candidatura existente — mostrar status
  if (localCand) {
    const cfg = STATUS_CONFIG[localCand.status]

    return (
      <div className="space-y-md">
        <Alert variant={cfg?.variant ?? 'info'}>
          {cfg?.label ?? `Status: ${localCand.status}`}
        </Alert>

        {/* Confirmar aceita */}
        {localCand.status === 'aceita' && (
          <Button
            fullWidth
            loading={isPending}
            onClick={() => startTransition(async () => {
              try {
                await fetch(`/api/contracts/candidature/${localCand.id}/confirm`, { method: 'POST' })
                setLocalCand({ ...localCand, status: 'confirmada' })
              } catch { setError('Erro ao confirmar. Tente novamente.') }
            })}
          >
            ✓ Confirmar e fechar contrato
          </Button>
        )}

        {/* Cancelar pendente */}
        {localCand.status === 'pendente' && (
          <Button
            variant="ghost"
            size="sm"
            loading={isPending}
            onClick={() => startTransition(async () => {
              try {
                await withdrawCandidature(localCand.id)
                setLocalCand(null)
              } catch { setError('Erro ao cancelar.') }
            })}
          >
            Cancelar candidatura
          </Button>
        )}

        {error && <Alert variant="danger">{error}</Alert>}
      </div>
    )
  }

  // Sem candidatura — formulário de aplicação
  return (
    <div className="space-y-md">
      {/* Aviso para contratos abaixo do custo */}
      {viability === 'abaixo_custo' && userCostPerKm > 0 && (
        <Alert variant="danger" title="Atenção: abaixo do seu custo real">
          Este contrato está abaixo do seu custo por km calculado. Candidatar pode resultar em prejuízo operacional.
        </Alert>
      )}

      {/* Preview de viabilidade */}
      <div className="flex items-center gap-sm p-md bg-ag-bg border border-ag-border rounded-md">
        <ViabilityBadge viability={viability} />
        <p className="caption flex-1">
          {userCostPerKm === 0
            ? 'Registre seus custos no DRE para ver a análise financeira completa.'
            : 'Viabilidade calculada com base no seu custo real.'}
        </p>
      </div>

      {/* Mensagem opcional */}
      <div className="space-y-xs">
        <label className="text-body-sm font-medium text-ag-primary" htmlFor="candidature-message">
          Mensagem para a transportadora <span className="caption text-ag-muted">(opcional)</span>
        </label>
        <textarea
          id="candidature-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex: Tenho experiência nesta rota, caminhão em ótimo estado..."
          rows={3}
          maxLength={500}
          className="w-full font-body text-body text-ag-primary bg-ag-bg border border-ag-border rounded-md px-[14px] py-[10px] resize-none focus:outline-none focus:border-ag-accent focus:ring-2 focus:ring-ag-overlay placeholder:text-ag-muted"
        />
        <p className="caption text-right text-ag-muted">{message.length}/500</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Button
        fullWidth
        size="lg"
        loading={isPending}
        onClick={() => startTransition(async () => {
          setError(null)
          try {
            const result = await applyCandidature(contractId, message, userCostPerKm)
            setLocalCand({ id: result.id, status: 'pendente' })
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao candidatar.')
          }
        })}
      >
        Candidatar-me a este contrato
      </Button>

      <p className="caption text-center text-ag-muted">
        Seus dados completos só serão compartilhados após o fechamento bilateral do contrato.
      </p>
    </div>
  )
}
