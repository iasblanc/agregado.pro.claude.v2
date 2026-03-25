export default function Loading() {
  return (
    <div
      className="min-h-screen bg-ag-bg flex items-center justify-center"
      aria-label="Carregando..."
      role="status"
    >
      <div className="flex flex-col items-center gap-lg">
        {/* Spinner AllYouCan */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-ag-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-ag-accent animate-spin" />
        </div>
        <p className="caption text-ag-muted">Carregando...</p>
      </div>
    </div>
  )
}
