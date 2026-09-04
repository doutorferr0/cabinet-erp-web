import {
  ErroDeCarregamento,
  EsqueletoDeCarregamento,
} from '@/components/cabinet/estado-de-consulta'
import { obterOportunidade, oportunidadeVazia } from '@/data/crm-api'
import { OportunidadeForm } from '@/features/crm/oportunidade-form'
import { StepperDeEtapas } from '@/features/crm/stepper-de-etapas'
import { PainelDeAtividades } from '@/features/tarefas/painel-atividades'
import { isConsulta } from '@/lib/modo-consulta'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

/**
 * `funilId`/`etapaId` na busca: o quadro sabe de qual coluna o operador clicou
 * em `Incluir`, e a tela nasce naquela etapa. Sem eles o contrato cai no funil
 * padrão e na primeira etapa dele — que é o certo para quem entrou por outro
 * caminho.
 */
interface BuscaDaOportunidade {
  modo?: 'consulta'
  funilId?: string
  etapaId?: string
}

export const Route = createFileRoute('/crm/oportunidades/$oportunidadeId')({
  component: OportunidadePage,
  validateSearch: (busca: Record<string, unknown>): BuscaDaOportunidade => ({
    ...(busca.modo === 'consulta' ? { modo: 'consulta' as const } : {}),
    ...(typeof busca.funilId === 'string' ? { funilId: busca.funilId } : {}),
    ...(typeof busca.etapaId === 'string' ? { etapaId: busca.etapaId } : {}),
  }),
})

function OportunidadePage() {
  const { oportunidadeId } = Route.useParams()
  const busca = Route.useSearch()
  const readOnly = isConsulta(busca)
  const isNovo = oportunidadeId === 'novo'

  const query = useQuery({
    queryKey: ['crm', 'oportunidade', oportunidadeId],
    enabled: !isNovo,
    queryFn: () => obterOportunidade(oportunidadeId),
  })

  if (!isNovo && query.isPending) return <EsqueletoDeCarregamento />

  // Falhou ≠ não existe: 404 chega como `null`, 409 (sem empresa ativa) chega
  // como erro. Tratar os dois como "não encontrado" mandaria o operador
  // procurar um registro que está lá.
  if (query.isError) {
    return (
      <ErroDeCarregamento
        mensagem="Não foi possível carregar a oportunidade."
        erro={query.error}
        refazer={() => query.refetch()}
      />
    )
  }

  const registro = isNovo ? oportunidadeVazia(busca.funilId, busca.etapaId) : query.data

  if (!registro) {
    return <p className="text-muted-foreground">Oportunidade não encontrada.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* O ANDAMENTO vem antes do formulário e FORA dele: a fita escreve pelo
          `PATCH .../stage`, que é escrita própria e imediata. Dentro do `<form>`
          os botões dela disputariam o submit do cadastro — o mesmo motivo pelo
          qual o painel de atividades mora aqui embaixo. E em `Incluir` não
          existe: negócio que ainda não foi gravado não tem etapa para avançar. */}
      {isNovo ? null : <StepperDeEtapas oportunidade={registro} readOnly={readOnly} />}

      <OportunidadeForm
        oportunidade={registro}
        readOnly={readOnly}
        contexto={readOnly ? 'Consulta' : isNovo ? 'Incluir' : registro.nome}
      />

      {/* O painel monta AQUI, e não dentro do `OportunidadeForm`, por duas
          razões: atividade é registro próprio, com gravação própria — dentro do
          `<form>` os botões dele disputariam o submit do cadastro; e a
          oportunidade só tem id depois de gravada, então em `Incluir` não há
          alvo a que pendurar atividade. */}
      {isNovo ? null : <PainelDeAtividades alvo={{ tipo: 'opportunity', id: oportunidadeId }} />}
    </div>
  )
}
