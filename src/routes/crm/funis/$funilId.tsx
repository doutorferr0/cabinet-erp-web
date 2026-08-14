import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { data } from '@/data'
import { FunilForm } from '@/features/crm/funil-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/crm/funis/$funilId')({
  component: FunilEditPage,
  validateSearch: validateModoSearch,
})

function FunilEditPage() {
  const { funilId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = funilId === 'novo'

  /**
   * O funil vem do SERVIDOR mesmo vindo da listagem, e é decisão: a linha da
   * listagem tem só o cabeçalho (`CrmPipelineDto`), e o formulário edita
   * cabeçalho + colunas. Semear o cache com a linha faria a grade de etapas
   * abrir vazia e o `Gravar` recriar coluna que já existe.
   */
  const query = useQuery({
    queryKey: ['crm', 'funil', funilId],
    enabled: !isNovo,
    queryFn: () => data.funis.get(funilId),
  })

  if (!isNovo && query.isPending) {
    return <EsqueletoDeCarregamento />
  }

  // Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra
  // falha chega como erro — 409 é "nenhuma empresa ativa na sessão". Tratar os
  // dois como "não encontrado" mandaria procurar um registro que existe.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o funil."
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  const registro = isNovo ? data.funis.empty() : query.data

  if (!registro) {
    return <p className="text-muted-foreground">Funil não encontrado.</p>
  }

  return (
    <FunilForm
      funil={registro}
      readOnly={readOnly}
      contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : registro.nome}
    />
  )
}
