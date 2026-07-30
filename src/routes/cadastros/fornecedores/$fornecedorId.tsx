import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { FornecedorForm } from '@/features/fornecedor/fornecedor-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/fornecedores/$fornecedorId')({
  component: FornecedorEditPage,
  validateSearch: validateModoSearch,
})

function FornecedorEditPage() {
  const { fornecedorId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = fornecedorId === 'novo'
  const id = Number(fornecedorId)

  const query = useQuery({
    queryKey: ['fornecedor', fornecedorId],
    queryFn: () =>
      isNovo ? data.fornecedores.empty(Date.now() % 100000) : data.fornecedores.get(id, 0),
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
    return <p className="text-muted-foreground">Fornecedor não encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de Fornecedores{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${query.data.nomeFantasia}`}
      </h1>
      <FornecedorForm fornecedor={query.data} readOnly={readOnly} />
    </div>
  )
}
