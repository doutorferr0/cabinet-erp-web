import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { PedidoDeVendaForm } from '@/features/vendas/pedido-venda-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/pedidos/$pedidoId')({
  component: PedidoDeVendaEditPage,
  validateSearch: validateModoSearch,
})

function PedidoDeVendaEditPage() {
  const { pedidoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = pedidoId === 'novo'

  return (
    <TelaDeDocumento
      provider={data.pedidosVenda}
      queryKeyBase="pedido-venda"
      idParam={pedidoId}
      titulo="Pedido de Venda"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(p) => p.numero}
      naoEncontrado="Pedido de venda não encontrado."
      erroAoCarregar="Não foi possível carregar o pedido de venda."
    >
      {(pedido) => <PedidoDeVendaForm pedido={pedido} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
