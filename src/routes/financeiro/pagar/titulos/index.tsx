import { createFileRoute } from '@tanstack/react-router'
import { ListagemDeTitulos } from '@/features/financeiro/listagem-de-titulos'

export const Route = createFileRoute('/financeiro/pagar/titulos/')({
  component: TitulosAPagarPage,
})

function TitulosAPagarPage() {
  return <ListagemDeTitulos direcao="payable" />
}
