import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { ColaboradorForm } from '@/features/colaborador/colaborador-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/colaboradores/$colaboradorId')({
  component: ColaboradorEditPage,
  validateSearch: validateModoSearch,
})

function ColaboradorEditPage() {
  const { colaboradorId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = colaboradorId === 'novo'
  const id = Number(colaboradorId)

  const query = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () =>
      isNovo ? data.colaboradores.empty(Date.now() % 100000) : data.colaboradores.get(id, 0),
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
        Cadastro de Colaboradores{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${query.data.nome}`}
      </h1>
      <ColaboradorForm colaborador={query.data} readOnly={readOnly} />
    </div>
  )
}
