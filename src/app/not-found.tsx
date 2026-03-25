import Link   from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ag-bg flex flex-col items-center justify-center px-lg text-center">
      <p className="overline mb-sm">Erro 404</p>
      <h1 className="font-display text-[80px] font-medium text-ag-primary leading-none mb-lg">
        404
      </h1>
      <h2 className="font-display text-display-sm font-medium text-ag-primary mb-md">
        Página não encontrada
      </h2>
      <p className="text-body text-ag-secondary max-w-sm mb-xl">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link href="/gestao">
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  )
}
