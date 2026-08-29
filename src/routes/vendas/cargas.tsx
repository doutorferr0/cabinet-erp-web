import { QuadroDeCargas } from '@/features/carga/quadro-de-cargas'
import { createFileRoute } from '@tanstack/react-router'

/**
 * `?pedido=<uuid>` abre o quadro já com a carga escolhida.
 *
 * É o destino do `Abrir no Quadro de Cargas` da situação da entrega, no
 * documento de venda: quem vinha de lá já havia escolhido o pedido, e mandá-lo
 * procurar a mesma linha de novo na fila é perder a escolha no caminho.
 *
 * Viaja como search param — e não como estado de navegação — pelo motivo de
 * sempre neste repo: a URL é o estado compartilhável, o voltar do browser
 * desfaz a escolha, e o operador pode deixar a aba fixa no pedido do dia.
 *
 * Id que não está na fila não é erro: o painel da carga abre do mesmo jeito
 * (ele lê a situação por id, não a fila), que é exatamente o caso do pedido
 * sem nada liberado — o que o quadro sozinho nunca conseguia mostrar.
 */
export const Route = createFileRoute('/vendas/cargas')({
  component: QuadroNaRota,
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.pedido === 'string' && search.pedido !== '' ? { pedido: search.pedido } : {},
})

function QuadroNaRota() {
  const { pedido } = Route.useSearch()
  return <QuadroDeCargas pedidoInicial={pedido ?? null} />
}
