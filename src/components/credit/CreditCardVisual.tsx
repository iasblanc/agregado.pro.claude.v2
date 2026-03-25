import { formatBRL } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────

interface CreditCardVisualProps {
  card: {
    status:         string
    card_last4?:    string | null
    card_expiry?:   string | null
    limite_total:   number
    limite_disponivel: number
    limite_utilizado:  number
    contracts?: {
      title?:           string
      route_origin?:    string
      route_destination?: string
    } | null
  } | null
  ownerName: string
}

// ─── Componente ───────────────────────────────────────────────────

/**
 * Representação visual do cartão de crédito físico/virtual.
 * Mostra o vínculo com o contrato ativo — diferencial do produto.
 */
export function CreditCardVisual({ card, ownerName }: CreditCardVisualProps) {
  if (!card) return null

  const isActive   = card.status === 'ativo'
  const isPending  = ['solicitado', 'em_analise', 'aprovado'].includes(card.status)
  const isSuspended = card.status === 'sem_contrato' || card.status === 'bloqueado'

  const utilizadoPct = card.limite_total > 0
    ? (card.limite_utilizado / card.limite_total) * 100
    : 0

  return (
    <div className="space-y-md">
      {/* Card visual */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: isActive
            ? 'linear-gradient(135deg, #1A1915 0%, #2D2B26 50%, #1A1915 100%)'
            : isSuspended
            ? 'linear-gradient(135deg, #5C5850 0%, #9C988E 100%)'
            : 'linear-gradient(135deg, #2D2B26 0%, #5C5850 100%)',
          padding:    '28px 28px 24px',
          minHeight:  '200px',
          aspectRatio: '1.586 / 1',
          maxWidth:   '380px',
        }}
        aria-label={`Cartão Agregado.Pro ${card.card_last4 ? `final ${card.card_last4}` : 'em processamento'}`}
      >
        {/* Padrão decorativo */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, #F5F2EC 1px, transparent 1px)',
            backgroundSize:  '20px 20px',
          }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative flex justify-between items-start mb-auto">
          <span
            className="font-display text-[18px] font-medium"
            style={{ color: 'rgba(245,242,236,0.90)' }}
          >
            Agregado.Pro
          </span>
          {/* Chip NFC */}
          <div
            className="w-10 h-8 rounded-md border-2 opacity-60"
            style={{ borderColor: 'rgba(245,242,236,0.40)', background: 'rgba(245,242,236,0.10)' }}
            aria-hidden="true"
          />
        </div>

        {/* Status overlay */}
        {!isActive && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(26,25,21,0.50)' }}
          >
            <div className="text-center px-xl">
              <p
                className="font-display text-display-sm font-medium"
                style={{ color: '#F5F2EC' }}
              >
                {isPending   ? 'Em processamento' :
                 isSuspended ? 'Suspenso'         : card.status}
              </p>
              {isPending && (
                <p className="caption mt-xs" style={{ color: 'rgba(245,242,236,0.60)' }}>
                  Seu cartão está sendo emitido
                </p>
              )}
              {isSuspended && (
                <p className="caption mt-xs" style={{ color: 'rgba(245,242,236,0.60)' }}>
                  Associe a um contrato ativo para reativar
                </p>
              )}
            </div>
          </div>
        )}

        {/* Número do cartão */}
        <div className="relative mt-[48px]">
          <p
            className="font-mono text-[20px] tracking-[0.2em]"
            style={{ color: 'rgba(245,242,236,0.85)' }}
          >
            {card.card_last4 ? `•••• •••• •••• ${card.card_last4}` : '•••• •••• •••• ••••'}
          </p>
        </div>

        {/* Rodapé do cartão */}
        <div className="relative flex justify-between items-end mt-md">
          <div>
            <p
              className="text-[9px] font-medium tracking-widest uppercase mb-xs"
              style={{ color: 'rgba(245,242,236,0.40)' }}
            >
              Titular
            </p>
            <p
              className="text-body-sm font-medium uppercase tracking-wider truncate max-w-[180px]"
              style={{ color: 'rgba(245,242,236,0.85)' }}
            >
              {ownerName}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[9px] font-medium tracking-widest uppercase mb-xs"
              style={{ color: 'rgba(245,242,236,0.40)' }}
            >
              Validade
            </p>
            <p className="text-body-sm font-medium" style={{ color: 'rgba(245,242,236,0.85)' }}>
              {card.card_expiry ?? '••/••'}
            </p>
          </div>
        </div>

        {/* Bandeira Visa */}
        <div
          className="absolute bottom-6 right-6 text-[11px] font-bold tracking-widest italic"
          style={{ color: 'rgba(245,242,236,0.50)' }}
          aria-hidden="true"
        >
          VISA
        </div>
      </div>

      {/* Contrato vinculado */}
      {card.contracts && (
        <div
          className="flex items-center gap-sm px-md py-sm rounded-lg text-body-sm"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <span aria-hidden="true">🚛</span>
          <div className="min-w-0">
            <p className="font-medium text-ag-primary truncate">{card.contracts.title}</p>
            {card.contracts.route_origin && card.contracts.route_destination && (
              <p className="caption text-ag-muted">
                {card.contracts.route_origin} → {card.contracts.route_destination}
              </p>
            )}
          </div>
          <span
            className="shrink-0 text-[10px] font-medium px-sm py-xs rounded-pill"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
          >
            Vinculado
          </span>
        </div>
      )}

      {/* Limite em uso */}
      {isActive && (
        <div className="space-y-xs">
          <div className="flex justify-between text-body-sm">
            <span className="text-ag-secondary">Limite utilizado</span>
            <span className="font-medium text-ag-primary">
              {formatBRL(card.limite_utilizado)} / {formatBRL(card.limite_total)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-ag-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width:      `${utilizadoPct}%`,
                background: utilizadoPct >= 90
                  ? 'var(--color-danger)'
                  : utilizadoPct >= 70
                  ? 'var(--color-warning)'
                  : 'var(--color-success)',
              }}
              role="progressbar"
              aria-valuenow={utilizadoPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="caption text-ag-muted text-right">
            {formatBRL(card.limite_disponivel)} disponível
          </p>
        </div>
      )}
    </div>
  )
}
