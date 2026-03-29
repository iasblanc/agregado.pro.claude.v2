export default function DashboardLoading() {
  return (
    <div className="flex-1 px-lg py-xl md:px-xl">
      <div className="space-y-xl animate-pulse">
        {/* Header skeleton */}
        <div className="space-y-sm">
          <div className="h-4 w-32 rounded-md" style={{ background: 'var(--color-surface)' }} />
          <div className="h-7 w-48 rounded-md" style={{ background: 'var(--color-surface)' }} />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border border-ag-border p-lg space-y-md"
              style={{ background: 'var(--color-bg)' }}>
              <div className="h-3 w-20 rounded-md" style={{ background: 'var(--color-surface)' }} />
              <div className="h-8 w-28 rounded-md" style={{ background: 'var(--color-surface)' }} />
            </div>
          ))}
        </div>
        {/* List skeleton */}
        <div className="space-y-md">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl border border-ag-border p-lg flex gap-md"
              style={{ background: 'var(--color-bg)' }}>
              <div className="flex-1 space-y-sm">
                <div className="h-4 w-3/4 rounded-md" style={{ background: 'var(--color-surface)' }} />
                <div className="h-3 w-1/2 rounded-md" style={{ background: 'var(--color-surface)' }} />
              </div>
              <div className="h-8 w-20 rounded-md" style={{ background: 'var(--color-surface)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
