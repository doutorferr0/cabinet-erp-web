import { Skeleton } from '@/components/ui/skeleton'
import { data } from '@/data'
import { ProfissionalForm } from '@/features/profissional/profissional-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/profissionais/$profissionalId')({
  component: ProfissionalEditPage,
  validateSearch: validateModoSearch,
})

function ProfissionalEditPage() {
  const { profissionalId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = profissionalId === 'novo'
  const id = Number(profissionalId)

  const query = useQuery({
    queryKey: ['profissional', profissionalId],
    queryFn: () =>
      isNovo ? data.profissionais.empty(Date.now() % 100000) : data.profissionais.get(id, 0),
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
    return <p className="text-muted-foreground">Profissional não encontrado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Cadastro de Profissional Externo{' '}
        {readOnly ? '— Consulta' : isNovo ? '— Incluir' : `— ${query.data.nomeApresentacao}`}
      </h1>
      <ProfissionalForm profissional={query.data} readOnly={readOnly} />
    </div>
  )
}
