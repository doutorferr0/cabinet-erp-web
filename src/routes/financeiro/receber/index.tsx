import { createFileRoute } from '@tanstack/react-router'
import { AgendaDeVencimentos } from '@/features/financeiro/agenda-de-vencimentos'

export const Route = createFileRoute('/financeiro/receber/')({
  component: ContasAReceberPage,
})

/** CONTAS A RECEBER — a mesma agenda, lado `receivable`. */
function ContasAReceberPage() {
  return <AgendaDeVencimentos direcao="receivable" />
}
