import { ListagemDeTitulos } from '@/features/financeiro/listagem-de-titulos'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financeiro/receber/titulos/')({
  component: TitulosAReceberPage,
})

function TitulosAReceberPage() {
  return <ListagemDeTitulos direcao="receivable" />
}
