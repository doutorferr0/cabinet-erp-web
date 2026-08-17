import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { FichaDeCadastro } from '@/components/cabinet/ficha/ficha-de-cadastro'
import { data } from '@/data'
import { colaborador as esquema } from '@/features/cadastro/modulos'
import { ColaboradorForm } from '@/features/colaborador/colaborador-form'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastros/colaboradores/$colaboradorId')({
  component: ColaboradorEditPage,
  validateSearch: validateModoSearch,
})

function ColaboradorEditPage() {
  const { colaboradorId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = colaboradorId === 'novo'
  const navigate = useNavigate()

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

  // `Consul.` mostra a FICHA, não o formulário desabilitado (issue #103): ler é
  // o uso mais frequente do cadastro, e o caminho de volta à edição é o lápis
  // por módulo. `Incluir` nunca cai aqui — não há o que ler num registro que
  // ainda não existe.
  if (readOnly && !isNovo) {
    return (
      <FichaDeCadastro
        entidade={esquema}
        registro={query.data}
        titulo="Cadastro de Colaboradores"
        contexto={query.data.nome}
        aoFechar={() => void navigate({ to: '/cadastros/colaboradores' })}
        aoEditar={() =>
          void navigate({
            to: '/cadastros/colaboradores/$colaboradorId',
            params: { colaboradorId },
            search: {},
          })
        }
      />
    )
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
