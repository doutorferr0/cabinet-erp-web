import { Skeleton } from '@/components/ui/skeleton'
import { ColaboradorForm } from '@/features/colaborador/colaborador-form'
import { colaboradorVazio, fetchColaborador } from '@/mocks/colaboradores'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/colaboradores/$colaboradorId')({
  component: ColaboradorEditPage,
})

function ColaboradorEditPage() {
  const { colaboradorId } = Route.useParams()
  const isNovo = colaboradorId === 'novo'
  const id = Number(colaboradorId)

  const query = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => (isNovo ? colaboradorVazio(Date.now() % 100000) : fetchColaborador(id, 0)),
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
    return <p className="text-muted-foreground">Colaborador não encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de Colaboradores {isNovo ? '— Incluir' : `— ${query.data.nome}`}
      </h1>
      <ColaboradorForm colaborador={query.data} />
    </div>
  )
}
