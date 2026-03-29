import { redirect } from 'next/navigation'
export default function AntecipacaoRedirect() {
  redirect('/credito?antecipar=1')
}
