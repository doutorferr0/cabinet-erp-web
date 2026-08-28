import { AgendaDeVencimentos } from '@/features/financeiro/agenda-de-vencimentos'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financeiro/receber/')({
  component: ContasAReceberPage,
})

/** CONTAS A RECEBER — a mesma agenda, lado `receivable`. */
function ContasAReceberPage() {
  return <AgendaDeVencimentos direcao="receivable" />
}
