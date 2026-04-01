import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-lg"
      style={{ background: 'var(--color-bg)' }}>
      <p className="text-[80px] mb-lg leading-none">🦏</p>
      <h1 className="font-display text-display-lg font-medium text-ag-primary mb-sm">
        404
      </h1>
      <p className="text-body text-ag-secondary mb-xl max-w-sm">
        Essa página não existe. Mas o seu caminhão existe, e ele precisa de você.
      </p>
      <Link href="/"
        className="px-xl py-md rounded-pill text-body font-medium transition-all"
        style={{ background: 'var(--color-accent)', color: 'var(--color-cta-text)' }}>
        Voltar ao início
      </Link>
    </div>
  )
}
