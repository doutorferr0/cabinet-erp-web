import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { ProdutoForm } from '@/features/produto/produto-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/produtos/$produtoId')({
  component: ProdutoEditPage,
})

function ProdutoEditPage() {
  const { produtoId } = Route.useParams()
  const isNovo = produtoId === 'novo'
  const id = Number(produtoId)

  const query = useQuery({
    queryKey: ['produto', produtoId],
    queryFn: () => (isNovo ? data.produtos.empty(Date.now() % 100000) : data.produtos.get(id, 0)),
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
    return <p className="text-muted-foreground">Produto não encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de produtos - Banco Principal{' '}
        {isNovo ? '— Incluir' : `— ${query.data.nossaDescricao}`}
      </h1>
      <ProdutoForm produto={query.data} />
    </div>
  )
}
