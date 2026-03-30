import { formatBRL } from '@/lib/utils'

interface Props {
  totalContracts: number
  activeContracts: number
  closedContracts: number
  totalCandidatures: number
  acceptedCandidatures: number
  totalValue: number
}

export function RelatorioTR({
  totalContracts, activeContracts, closedContracts,
  totalCandidatures, acceptedCandidatures, totalValue,
}: Props) {
  const acceptanceRate = totalCandidatures > 0
    ? Math.round((acceptedCandidatures / totalCandidatures) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
      {[
        { label: 'Contratos ativos',  val: String(activeContracts),     icon: '🟢', sub: `de ${totalContracts} total` },
        { label: 'Fechados',          val: String(closedContracts),     icon: '✅', sub: 'com caminhoneiro' },
        { label: 'Valor total',       val: formatBRL(totalValue),       icon: '💰', sub: 'em contratos' },
        { label: 'Candidaturas',      val: String(totalCandidatures),   icon: '📬', sub: 'recebidas' },
        { label: 'Taxa de aceite',    val: `${acceptanceRate}%`,        icon: '🎯', sub: `${acceptedCandidatures} aceitas` },
        { label: 'Caminhoneiros',     val: String(acceptedCandidatures), icon: '🚛', sub: 'recrutados' },
      ].map(s => (
        <div key={s.label} className="rounded-xl border border-ag-border p-md"
          style={{ background: 'var(--color-bg)' }}>
          <div className="flex items-start justify-between mb-xs">
            <p className="caption text-ag-muted">{s.label}</p>
            <span className="text-[16px]">{s.icon}</span>
          </div>
          <p className="font-display text-[22px] font-medium text-ag-primary">{s.val}</p>
          <p className="caption text-ag-muted mt-xs">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}
