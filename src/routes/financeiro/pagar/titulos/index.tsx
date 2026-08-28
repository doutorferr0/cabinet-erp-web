import { ListagemDeTitulos } from '@/features/financeiro/listagem-de-titulos'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financeiro/pagar/titulos/')({
  component: TitulosAPagarPage,
})

function TitulosAPagarPage() {
  return <ListagemDeTitulos direcao="payable" />
}
