import { Skeleton } from '@/components/ui/skeleton'
import { ProfissionalForm } from '@/features/profissional/profissional-form'
import { fetchProfissional, profissionalVazio } from '@/mocks/profissionais'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/profissionais/$profissionalId')({
  component: ProfissionalEditPage,
})

function ProfissionalEditPage() {
  const { profissionalId } = Route.useParams()
  const isNovo = profissionalId === 'novo'
  const id = Number(profissionalId)

  const query = useQuery({
    queryKey: ['profissional', profissionalId],
    queryFn: () => (isNovo ? profissionalVazio(Date.now() % 100000) : fetchProfissional(id, 0)),
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
        Cadastro de Profissional Externo {isNovo ? '— Incluir' : `— ${query.data.nomeApresentacao}`}
      </h1>
      <ProfissionalForm profissional={query.data} />
    </div>
  )
}
