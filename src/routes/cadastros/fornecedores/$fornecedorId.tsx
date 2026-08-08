import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FornecedorForm } from '@/features/fornecedor/fornecedor-form'
import { CoberturaParceiro } from '@/features/parceiro/cobertura-parceiro'
import { papelFornecedor } from '@/features/parceiro/papeis/fornecedor'
import { usarParceiro } from '@/features/parceiro/usar-parceiro'
import { detalheDoErro } from '@/lib/erros'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import type { Fornecedor } from '@/mocks/fornecedores'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/fornecedores/$fornecedorId')({
  component: FornecedorEditPage,
  validateSearch: validateModoSearch,
})

function FornecedorEditPage() {
  const { fornecedorId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const { query, isNovo, registro, gravar, incluir, vincular, jaExiste } = usarParceiro(
    papelFornecedor,
    fornecedorId,
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
        Não foi possível carregar o fornecedor.
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
    return <p className="text-muted-foreground">Fornecedor não encontrado.</p>
  }

  return (
    <FornecedorForm
      fornecedor={registro}
      readOnly={readOnly}
      contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : registro.nomeFantasia}
      aviso={
        <CoberturaParceiro
          isNovo={isNovo}
          erro={isNovo ? (vincular.error ?? incluir.error) : gravar.error}
          camposDeEdicao={papelFornecedor.camposDeEdicao}
          {...(jaExiste && !vincular.error
            ? {
                vincular: () =>
                  vincular.mutate({ id: jaExiste, ativo: incluir.variables?.ativo ?? true }),
                vinculando: vincular.isPending,
              }
            : {})}
        />
      }
      onGravar={(v: Fornecedor) => (isNovo ? incluir.mutate(v) : gravar.mutate(v))}
    />
  )
}
