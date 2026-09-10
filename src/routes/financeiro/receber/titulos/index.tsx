import { createFileRoute } from '@tanstack/react-router'
import { ListagemDeTitulos } from '@/features/financeiro/listagem-de-titulos'

export const Route = createFileRoute('/financeiro/receber/titulos/')({
  component: TitulosAReceberPage,
})

function TitulosAReceberPage() {
  return <ListagemDeTitulos direcao="receivable" />
}
