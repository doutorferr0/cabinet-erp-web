import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CoberturaParceiro } from '@/features/parceiro/cobertura-parceiro'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { usarParceiro } from '@/features/parceiro/usar-parceiro'
import { ProfissionalForm } from '@/features/profissional/profissional-form'
import { detalheDoErro } from '@/lib/erros'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Profissional } from '@/mocks/profissionais'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/profissionais/$profissionalId')({
  component: ProfissionalEditPage,
  validateSearch: validateModoSearch,
})

function ProfissionalEditPage() {
  const { profissionalId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const { query, isNovo, registro, gravar, incluir, vincular, jaExiste } = usarParceiro(
    papelProfissional,
    profissionalId,
  )

  if (!isNovo && query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra
  // falha chega como erro — 409 é "nenhuma empresa ativa na sessão". Tratar os
  // dois como "não encontrado" mandaria procurar um registro que existe.
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-2 text-muted-foreground">
        Não foi possível carregar o profissional.
        {detalheDoErro(query.error) ? (
          <span className="max-w-prose text-[0.75rem]">{detalheDoErro(query.error)}</span>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  if (!registro) {
    return <p className="text-muted-foreground">Profissional não encontrado.</p>
  }

  return (
    <ProfissionalForm
      profissional={registro}
      readOnly={readOnly}
      contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : registro.nomeApresentacao}
      aviso={
        <CoberturaParceiro
          isNovo={isNovo}
          erro={isNovo ? (vincular.error ?? incluir.error) : gravar.error}
          camposDeEdicao={papelProfissional.camposDeEdicao}
          {...(jaExiste && !vincular.error
            ? {
                vincular: () =>
                  vincular.mutate({ id: jaExiste, ativo: incluir.variables?.ativo ?? true }),
                vinculando: vincular.isPending,
              }
            : {})}
        />
      }
      onGravar={(v: Profissional) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
    />
  )
}
