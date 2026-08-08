import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { PedidoCompraForm } from '@/features/pedido-compra/pedido-compra-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/pedidos/$pedidoId')({
  component: PedidoCompraEditPage,
  validateSearch: validateModoSearch,
})

function PedidoCompraEditPage() {
  const { pedidoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = pedidoId === 'novo'

  return (
    <TelaDeDocumento
      provider={data.pedidosCompra}
      queryKeyBase="pedido-compra"
      idParam={pedidoId}
      titulo="Pedido de Compra"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(p) => p.codigo}
      naoEncontrado="Pedido de compra não encontrado."
      erroAoCarregar="Não foi possível carregar o pedido de compra."
    >
      {(pedido) => <PedidoCompraForm pedido={pedido} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
