import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: {
    template: '%s | Agregado.Pro',
    default:  'Entrar | Agregado.Pro',
  },
}

/**
 * Layout das páginas de autenticação.
 * Sem sidebar, sem header — foco total no formulário.
 * Mobile-first: tela dividida em mobile = só form, desktop = form + painel.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ag-bg flex flex-col md:flex-row">
      {/* Painel esquerdo — visível apenas em desktop */}
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] bg-ag-accent flex-col justify-between p-[var(--space-2xl)] relative overflow-hidden">
        {/* Fundo decorativo — grid de pontos */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, #F5F2EC 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-sm">
            <span
              className="font-display text-[22px] font-medium tracking-tight"
              style={{ color: 'var(--color-cta-text)' }}
            >
              Agregado.Pro
            </span>
          </div>
        </div>

        {/* Callout central */}
        <div className="relative z-10 space-y-[var(--space-lg)]">
          <p
            className="font-display text-[36px] leading-[1.15] font-medium"
            style={{ color: 'var(--color-cta-text)' }}
          >
            O sistema operacional do caminhoneiro agregado.
          </p>
          <p
            className="text-body font-light leading-relaxed max-w-[320px]"
            style={{ color: 'rgba(245,242,236,0.65)' }}
          >
            Gestão financeira, contratos e banco digital — tudo integrado
            para você saber exatamente se seu caminhão está dando lucro.
          </p>
        </div>

        {/* Rodapé do painel */}
        <div className="relative z-10">
          <p className="caption" style={{ color: 'rgba(245,242,236,0.40)' }}>
            © 2026 Agregado.Pro
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col justify-center items-center px-[var(--space-lg)] py-[var(--space-2xl)] md:px-[var(--space-2xl)]">
        {/* Logo mobile */}
        <div className="md:hidden mb-[var(--space-2xl)] self-start">
          <span className="font-display text-[22px] font-medium text-ag-primary">
            Agregado.Pro
          </span>
        </div>

        {/* Conteúdo da página de auth */}
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  )
}
