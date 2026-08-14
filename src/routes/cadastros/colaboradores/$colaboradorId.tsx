import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
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

  const query = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => (isNovo ? data.colaboradores.empty() : data.colaboradores.get(colaboradorId, 0)),
  })

  if (query.isPending) {
    return <EsqueletoDeCarregamento />
  }

  // `data.colaboradores` é mock (nunca rejeita hoje) — o braço existe para o
  // dia em que colaborador ganhar caminho HTTP no contrato, seguindo a mesma
  // regra dos outros 5 cadastros de detalhe.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar o colaborador."
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  if (!query.data) {
    return <p className="text-muted-foreground">Colaborador não encontrado.</p>
  }

  return (
    // O título deixou de ser montado aqui: quem o diz é a banda do CadastroForm.
    // A rota só informa o CONTEXTO, que é o que ela sabe (modo e registro).
    <ColaboradorForm
      colaborador={query.data}
      readOnly={readOnly}
      contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : query.data.nome}
    />
  )
}
