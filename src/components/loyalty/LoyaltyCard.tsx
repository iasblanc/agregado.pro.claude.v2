import { TIER_CONFIG, type LoyaltyTier, type TierResult } from '@/services/loyalty/engine'

// ─── Tipos ────────────────────────────────────────────────────────

interface LoyaltyCardProps {
  tier:              LoyaltyTier
  points:            number
  tierResult:        TierResult
  ownerName:         string
  monthsActive:      number
}

// ─── Componente ───────────────────────────────────────────────────

export function LoyaltyCard({
  tier,
  points,
  tierResult,
  ownerName,
  monthsActive,
}: LoyaltyCardProps) {
  const cfg      = TIER_CONFIG[tier]
  const nextCfg  = tierResult.nextTier ? TIER_CONFIG[tierResult.nextTier] : null

  return (
    <div
      className="rounded-2xl p-xl overflow-hidden relative"
      style={{
        background:   cfg.bgColor,
        border:       `2px solid ${cfg.borderColor}`,
      }}
    >
      {/* Padrão decorativo de fundo */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, ${cfg.color} 1px, transparent 1px)`,
          backgroundSize:  '24px 24px',
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-md">
        <div>
          <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: cfg.color, opacity: 0.7 }}>
            Clube Agregado.Pro
          </p>
          <div className="flex items-center gap-sm mt-xs">
            <span className="text-[24px]" aria-hidden="true">{cfg.icon}</span>
            <span
              className="font-display text-[28px] font-medium"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-body-sm mt-xs" style={{ color: cfg.color, opacity: 0.85 }}>
            {cfg.description}
          </p>
        </div>

        {/* Multiplicador */}
        <div
          className="text-right rounded-lg px-md py-sm"
          style={{ background: `${cfg.color}18` }}
        >
          <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: cfg.color, opacity: 0.7 }}>
            Multiplicador
          </p>
          <p className="font-display text-[24px] font-medium" style={{ color: cfg.color }}>
            {tierResult.pointsMultiplier}×
          </p>
        </div>
      </div>

      {/* Pontos */}
      <div
        className="relative mt-lg pt-lg border-t"
        style={{ borderColor: `${cfg.borderColor}` }}
      >
        <div className="flex items-end justify-between gap-md">
          <div>
            <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: cfg.color, opacity: 0.7 }}>
              Pontos disponíveis
            </p>
            <p className="font-display text-[40px] font-medium leading-none mt-xs" style={{ color: cfg.color }}>
              {points.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: cfg.color, opacity: 0.7 }}>
              Titular
            </p>
            <p className="text-body font-medium truncate max-w-[160px]" style={{ color: cfg.color }}>
              {ownerName}
            </p>
            <p className="caption" style={{ color: cfg.color, opacity: 0.6 }}>
              {monthsActive} {monthsActive === 1 ? 'mês' : 'meses'} de uso
            </p>
          </div>
        </div>
      </div>

      {/* Progresso para próximo tier */}
      {tierResult.nextTier && nextCfg && (
        <div className="relative mt-lg space-y-sm">
          <div className="flex justify-between text-[11px]" style={{ color: cfg.color, opacity: 0.7 }}>
            <span>Progresso para {nextCfg.icon} {nextCfg.label}</span>
            <span>{tierResult.progressToNext}%</span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: `${cfg.color}18` }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width:      `${tierResult.progressToNext}%`,
                background: cfg.color,
              }}
              role="progressbar"
              aria-valuenow={tierResult.progressToNext}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${tierResult.progressToNext}% do progresso para ${nextCfg.label}`}
            />
          </div>
          {tierResult.missingFor && (
            <p className="text-[11px]" style={{ color: cfg.color, opacity: 0.7 }}>
              {tierResult.missingFor}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
