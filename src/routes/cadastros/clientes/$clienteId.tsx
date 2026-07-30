import { Skeleton } from '@/components/ui/skeleton'
import { ClienteForm } from '@/features/cliente/cliente-form'
import { clienteVazio, fetchCliente } from '@/mocks/clientes'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/clientes/$clienteId')({
  component: ClienteEditPage,
})

function ClienteEditPage() {
  const { clienteId } = Route.useParams()
  const isNovo = clienteId === 'novo'
  const id = Number(clienteId)

  const query = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => (isNovo ? clienteVazio(Date.now() % 100000) : fetchCliente(id, 0)),
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
        Cadastro de Clientes {isNovo ? '— Incluir' : `— ${query.data.nome}`}
      </h1>
      <ClienteForm cliente={query.data} />
    </div>
  )
}
