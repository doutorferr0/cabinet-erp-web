import { DocumentoHeader } from '@/components/cabinet/documento'
import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { OrdemCompraForm } from '@/features/ordem-compra/ordem-compra-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/compras/ordens/$ordemId')({
  component: OrdemCompraEditPage,
  validateSearch: validateModoSearch,
})

function OrdemCompraEditPage() {
  const { ordemId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = ordemId === 'novo'
  const id = Number(ordemId)

  const query = useQuery({
    queryKey: ['ordem-compra', ordemId],
    queryFn: () =>
      isNovo ? data.ordensCompra.empty(Date.now() % 100000) : data.ordensCompra.get(id, 0),
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
    return <p className="text-muted-foreground">Ordem de compra não encontrada.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <DocumentoHeader
        titulo="Ordem de Compra"
        modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
        numero={isNovo ? undefined : query.data.codigo}
      />
      <OrdemCompraForm ordem={query.data} readOnly={readOnly} />
    </div>
  )
}
