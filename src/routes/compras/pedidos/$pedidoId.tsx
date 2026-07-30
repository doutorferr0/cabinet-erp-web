import { Skeleton } from '@/components/ui/skeleton'
import { PedidoCompraForm } from '@/features/pedido-compra/pedido-compra-form'
import { fetchPedidoCompra, pedidoCompraVazio } from '@/mocks/pedidos-compra'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/pedidos/$pedidoId')({
  component: PedidoCompraEditPage,
})

function PedidoCompraEditPage() {
  const { pedidoId } = Route.useParams()
  const isNovo = pedidoId === 'novo'
  const id = Number(pedidoId)

  const query = useQuery({
    queryKey: ['pedido-compra', pedidoId],
    queryFn: () => (isNovo ? pedidoCompraVazio(Date.now() % 100000) : fetchPedidoCompra(id, 0)),
  })

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!query.data) {
    return <p className="text-muted-foreground">Pedido de compra não encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Pedido de Compra {isNovo ? '— Incluir' : `— ${query.data.codigo}`}
      </h1>
      <PedidoCompraForm pedido={query.data} />
    </div>
  )
}
