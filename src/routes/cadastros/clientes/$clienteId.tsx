import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { ClienteForm } from '@/features/cliente/cliente-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/clientes/$clienteId')({
  component: ClienteEditPage,
  validateSearch: validateModoSearch,
})

function ClienteEditPage() {
  const { clienteId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = clienteId === 'novo'
  const id = Number(clienteId)

  const query = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => (isNovo ? data.clientes.empty(Date.now() % 100000) : data.clientes.get(id, 0)),
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
    return <p className="text-muted-foreground">Cliente não encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de Clientes{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${query.data.nome}`}
      </h1>
      <ClienteForm cliente={query.data} readOnly={readOnly} />
    </div>
  )
}
