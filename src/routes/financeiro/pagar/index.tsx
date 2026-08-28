import { AgendaDeVencimentos } from '@/features/financeiro/agenda-de-vencimentos'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financeiro/pagar/')({
  component: ContasAPagarPage,
})

/**
 * CONTAS A PAGAR — a agenda de vencimentos do lado `payable`.
 *
 * O menu apontava para cá com `futuro: true` desde que a seção Financeiro foi
 * desenhada: *"O que se deve ao fornecedor, por vencimento"* — que é literalmente
 * esta tela. Pagar e receber são a MESMA tela com `direction` diferente.
 */
function ContasAPagarPage() {
  return <AgendaDeVencimentos direcao="payable" />
}
