export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: 'var(--color-surface)', ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-ag-border p-lg space-y-md"
      style={{ background: 'var(--color-bg)' }}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
  )
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-md">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-ag-border p-lg flex gap-md"
          style={{ background: 'var(--color-bg)' }}>
          <div className="flex-1 space-y-sm">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}
