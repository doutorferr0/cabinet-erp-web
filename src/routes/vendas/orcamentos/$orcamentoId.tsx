import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { OrcamentoForm } from '@/features/orcamento/orcamento-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vendas/orcamentos/$orcamentoId')({
  component: OrcamentoEditPage,
})

function OrcamentoEditPage() {
  const { orcamentoId } = Route.useParams()
  const isNovo = orcamentoId === 'novo'
  const id = Number(orcamentoId)

  const query = useQuery({
    queryKey: ['orcamento', orcamentoId],
    queryFn: () =>
      isNovo ? data.orcamentos.empty(Date.now() % 100000) : data.orcamentos.get(id, 0),
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
    return <p className="text-muted-foreground">Orçamento não encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Orçamento {isNovo ? '— Incluir' : `— ${query.data.numero}`}
      </h1>
      <OrcamentoForm orcamento={query.data} />
    </div>
  )
}
