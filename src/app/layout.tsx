import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

// ─── Tipografia AllYouCan Design System ──────────────────────────
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  preload: false,
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
  preload: false,
})

// ─── Metadata ─────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'Agregado.Pro — Sistema Operacional do Caminhoneiro',
    template: '%s | Agregado.Pro',
  },
  description:
    'Gestão financeira, contratos e infraestrutura bancária para o caminhoneiro agregado.',
  keywords: [
    'caminhoneiro',
    'agregado',
    'gestão financeira',
    'transporte rodoviário',
    'custo por km',
    'DRE caminhoneiro',
  ],
  authors: [{ name: 'Agregado.Pro' }],
  robots: {
    index: process.env.NODE_ENV === 'production',
    follow: process.env.NODE_ENV === 'production',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Agregado.Pro',
    title: 'Agregado.Pro — Sistema Operacional do Caminhoneiro',
    description:
      'Gestão financeira, contratos e infraestrutura bancária para o caminhoneiro agregado.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F5F2EC',
}

// ─── Root Layout ──────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfairDisplay.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body bg-ag-bg text-ag-primary antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
