import { Skeleton } from '@/components/ui/skeleton'
import { DocumentoHeader } from '@/components/vitra/documento'
import { data } from '@/data'
import { PedidoCompraForm } from '@/features/pedido-compra/pedido-compra-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/pedidos/$pedidoId')({
  component: PedidoCompraEditPage,
  validateSearch: validateModoSearch,
})

function PedidoCompraEditPage() {
  const { pedidoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = pedidoId === 'novo'
  const id = Number(pedidoId)

  const query = useQuery({
    queryKey: ['pedido-compra', pedidoId],
    queryFn: () =>
      isNovo ? data.pedidosCompra.empty(Date.now() % 100000) : data.pedidosCompra.get(id, 0),
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
      <DocumentoHeader
        titulo="Pedido de Compra"
        modo={readOnly ? '— Consulta' : isNovo ? '— Incluir' : undefined}
        numero={isNovo ? undefined : query.data.codigo}
      />
      <PedidoCompraForm pedido={query.data} readOnly={readOnly} />
    </div>
  )
}
