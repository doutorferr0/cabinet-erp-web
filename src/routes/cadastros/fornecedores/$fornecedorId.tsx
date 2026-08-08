import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { FornecedorForm } from '@/features/fornecedor/fornecedor-form'
import { CoberturaParceiro } from '@/features/parceiro/cobertura-parceiro'
import { papelFornecedor } from '@/features/parceiro/papeis/fornecedor'
import { usarParceiro } from '@/features/parceiro/usar-parceiro'
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
    return <EsqueletoDeCarregamento />
  }

  // Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra
  // falha chega como erro — 409 é "nenhuma empresa ativa na sessão". Tratar os
  // dois como "não encontrado" mandaria procurar um registro que existe.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o fornecedor."
        erro={query.error}
        refazer={() => query.refetch()}
      />
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
