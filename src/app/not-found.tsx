import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ag-bg flex items-center justify-center px-lg">
      <div className="text-center space-y-xl max-w-sm">
        <p className="font-display text-[80px] font-medium text-ag-primary leading-none">404</p>
        <div className="space-y-sm">
          <h1 className="font-display text-display-sm font-medium text-ag-primary">
            Página não encontrada
          </h1>
          <p className="text-body text-ag-secondary">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        <Link href="/gestao">
          <Button fullWidth>Voltar ao início</Button>
        </Link>
      </div>
    </div>
  )
}
