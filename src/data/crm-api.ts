import type {
  CrmLostReasonDto,
  CrmLostReasonWriteRequest,
  CrmOpportunityDto,
  CrmOpportunityStagePatchRequest,
  CrmOpportunityWriteRequest,
  CrmPipelineDto,
  CrmPipelineWriteRequest,
  CrmStageDto,
  CrmStageWriteRequest,
  ListCrmOpportunitiesParams,
  PagedResultOfCrmLostReasonDto,
  PagedResultOfCrmPipelineDto,
} from '@/api/gerado'
import {
  createCrmLostReason,
  createCrmOpportunity,
  createCrmPipeline,
  createCrmStage,
  getCrmOpportunity,
  getCrmPipeline,
  listCrmLostReasons,
  listCrmOpportunities,
  listCrmPipelines,
  listCrmStages,
  moveCrmOpportunityStage,
  updateCrmLostReason,
  updateCrmOpportunity,
  updateCrmPipeline,
  updateCrmStage,
} from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
  repetirSeValeAPena,
} from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DO CRM — funis, estágios, oportunidades e motivos de perda.
 *
 * Os nove caminhos entraram no contrato marcados `Proposto`: são pedido do
 * front ao backend que ainda não existe. No `VITE_API_MODE=mock` quem responde
 * é `src/mocks/api/handlers.ts`, e a tela não sabe a diferença — é a mesma
 * situação do dashboard e do planner.
 *
 * ## O que esta fronteira decide, e a tela não
 *
 * **Lead e oportunidade são o MESMO registro.** Converter é mudar de estágio,
 * não cadastrar de novo (`crm_opportunities` no schema mergeado, #66). Por isso
 * não há `useLeads` ao lado de `useOportunidades`: seriam dois nomes para uma
 * linha só, e a primeira tela que os separasse perderia o histórico da conversão.
 *
 * **Mover cartão é UMA requisição.** `useMoverOportunidade` manda destino
 * (`stageId`) e VIZINHO (`precedeId`) num `PATCH`, e quem reordena a coluna
 * inteira é o servidor, numa transação. O desenho alternativo — o cliente
 * recalcular índices e mandar um `PUT` por linha deslocada — está medido e
 * recusado em `docs/harvest/kanban-funil/integracao.md`: com RLS e `SET LOCAL`
 * por transação, cada requisição é transação própria, e falha no meio deixa
 * dois cartões no mesmo lugar sem sintoma.
 *
 * **Posição nunca sai daqui.** `order` é escrito pelo servidor. Índice é
 * posição numa lista que pode estar filtrada; vizinho é um fato sobre dois
 * registros que o servidor confere.
 */

export const URL_FUNIS = '/api/crm/pipelines'
export const URL_OPORTUNIDADES = '/api/crm/opportunities'
export const URL_MOTIVOS_DE_PERDA = '/api/crm/lost-reasons'

/**
 * Whitelist de `sortBy` de cada listagem — a MESMA do contrato. Campo fora
 * dela é 400, não ordenação ignorada, então coluna de DataTable chaveada por
 * um nome que não está aqui quebra ao primeiro clique no cabeçalho.
 */
export const ORDENAVEIS_FUNIL: readonly string[] = ['name', 'sort', 'active']
export const ORDENAVEIS_OPORTUNIDADE: readonly string[] = [
  'name',
  'partnerName',
  'stageName',
  'expectedValueCents',
  'expectedCloseDate',
  'stageChangedAt',
]
export const ORDENAVEIS_MOTIVO_DE_PERDA: readonly string[] = ['name', 'active']

/**
 * Providers de listagem para as telas de cadastro (DataTable com
 * `{q, sort, page, pageSize}`). Entram no registry de `src/data/index.ts`
 * quando as telas existirem: hoje não há tela de CRM, e entrada de registry sem
 * tela seria promessa de acesso que ninguém cumpre.
 *
 * Só listagem, e é a regra do repo: `get` só entra no registry quando o caminho
 * existe. Funil e oportunidade têm `GET {id}` no contrato; motivo de perda não
 * tem — a linha da listagem já é o registro inteiro (dois campos), e caminho de
 * detalhe seria requisição para buscar o que a tela tem em mãos.
 */
export const funis: ListProvider<CrmPipelineDto> = createApiListProvider<CrmPipelineDto>({
  url: URL_FUNIS,
})

export const motivosDePerda: ListProvider<CrmLostReasonDto> =
  createApiListProvider<CrmLostReasonDto>({ url: URL_MOTIVOS_DE_PERDA })

/** Oportunidades de UM funil — o `pipelineId` viaja em toda consulta da tabela. */
export function oportunidadesDoFunil(pipelineId: string): ListProvider<CrmOpportunityDto> {
  return createApiListProvider<CrmOpportunityDto>({
    url: URL_OPORTUNIDADES,
    fixa: { pipelineId },
  })
}

/** Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo. */
export const CHAVES_CRM = {
  funis: ['crm', 'funis'] as const,
  funil: (id: string) => ['crm', 'funil', id] as const,
  estagios: (pipelineId: string) => ['crm', 'estagios', pipelineId] as const,
  oportunidades: (filtro: ListCrmOpportunitiesParams) => ['crm', 'oportunidades', filtro] as const,
  oportunidade: (id: string) => ['crm', 'oportunidade', id] as const,
  motivosDePerda: ['crm', 'motivos-de-perda'] as const,
}

/**
 * Os funis da empresa, para a ESCOLHA de funil (o seletor acima do quadro).
 *
 * Pede a primeira página no teto do contrato em vez de paginar: quem escolhe
 * funil precisa ver todos, e uma empresa tem modelos de venda em dezenas, não
 * em milhares. A listagem de CADASTRO de funil é outra coisa e usa o provider
 * `funis`, com paginação de verdade.
 */
export function useFunis(apenasAtivos = true) {
  return useQuery({
    queryKey: [...CHAVES_CRM.funis, apenasAtivos],
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listCrmPipelines({
        page: 1,
        pageSize: PAGE_SIZE_MAX,
        sortBy: 'sort',
      })
      const pagina = dadosOuErro<PagedResultOfCrmPipelineDto>(
        resposta,
        'Falha ao carregar os funis.',
      )
      const linhas = pagina.rows ?? []
      return apenasAtivos ? linhas.filter((funil) => funil.active) : linhas
    },
  })
}

/**
 * Um funil por id; `null` quando não existe.
 *
 * Existe para o caminho que a listagem não alcança — link direto para o quadro
 * (`/crm/funil/{id}`) e recarga da página. O 409 de sessão sem empresa ativa
 * NÃO vira `null`: `itemOuNulo` converte só 404, senão quem apenas não escolheu
 * empresa sairia procurando um funil que está lá.
 */
export function useFunil(id: string | null) {
  return useQuery({
    queryKey: CHAVES_CRM.funil(id ?? ''),
    enabled: id !== null,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getCrmPipeline(id as string)
      return itemOuNulo<CrmPipelineDto>(resposta, 'o funil')
    },
  })
}

/**
 * Os estágios do funil — as COLUNAS do quadro, na ordem de `sort`.
 *
 * Array inteiro, sem paginação, e é o contrato que decide assim: quadro com
 * metade das colunas não é quadro. `enabled` só com funil escolhido, senão a
 * primeira renderização pediria `/api/crm/pipelines/undefined/stages` e
 * receberia um 404 que não significa nada.
 */
export function useEstagios(pipelineId: string | null) {
  return useQuery({
    queryKey: CHAVES_CRM.estagios(pipelineId ?? ''),
    enabled: pipelineId !== null,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listCrmStages(pipelineId as string)
      return dadosOuErro<CrmStageDto[]>(resposta, 'Falha ao carregar os estágios do funil.')
    },
  })
}

/**
 * As oportunidades de um recorte. Os filtros são os do contrato e todos
 * opcionais; `open: true` traz só as abertas — filtro por PROPRIEDADE do
 * estágio, que o cliente não teria como montar sem antes listar os estágios
 * ganhos e perdidos de cada funil.
 */
export function useOportunidades(filtro: ListCrmOpportunitiesParams = {}) {
  return useQuery({
    queryKey: CHAVES_CRM.oportunidades(filtro),
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listCrmOpportunities({
        page: 1,
        pageSize: PAGE_SIZE_MAX,
        ...filtro,
      })
      return dadosOuErro<{ rows?: CrmOpportunityDto[]; total?: number }>(
        resposta,
        'Falha ao carregar as oportunidades.',
      )
    },
  })
}

/** Uma oportunidade por id; `null` quando não existe. Mesmo DTO da listagem. */
export function useOportunidade(id: string | null) {
  return useQuery({
    queryKey: CHAVES_CRM.oportunidade(id ?? ''),
    enabled: id !== null,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getCrmOpportunity(id as string)
      return itemOuNulo<CrmOpportunityDto>(resposta, 'a oportunidade')
    },
  })
}

/** Motivos de perda ATIVOS, para a escolha na hora de perder o negócio. */
export function useMotivosDePerda() {
  return useQuery({
    queryKey: CHAVES_CRM.motivosDePerda,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listCrmLostReasons({
        page: 1,
        pageSize: PAGE_SIZE_MAX,
        sortBy: 'name',
      })
      const pagina = dadosOuErro<PagedResultOfCrmLostReasonDto>(
        resposta,
        'Falha ao carregar os motivos de perda.',
      )
      return (pagina.rows ?? []).filter((motivo) => motivo.active)
    },
  })
}

/**
 * Toda mutação do CRM invalida o mesmo tronco (`['crm']`).
 *
 * Invalidação fina economizaria requisição e pagaria com a classe de bug que
 * este repo já conhece: mover um cartão muda a coluna de ORIGEM, a de DESTINO,
 * a contagem do cabeçalho das duas e o resumo do funil. Listar as chaves
 * afetadas em cada mutação é a lista que envelhece calada.
 */
function useInvalidarCrm() {
  const cliente = useQueryClient()
  return () => cliente.invalidateQueries({ queryKey: ['crm'] })
}

export function useCriarOportunidade() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async (corpo: CrmOpportunityWriteRequest) => {
      const resposta: RespostaDaApi = await createCrmOpportunity(corpo)
      return dadosOuErro<CrmOpportunityDto>(resposta, 'Falha ao criar a oportunidade.')
    },
    onSuccess: invalidar,
  })
}

/**
 * `PUT` substitui a oportunidade INTEIRA — o corpo se monta a partir do
 * registro que veio do servidor, nunca só dos campos da tela. Campo ausente é
 * campo apagado, e a guarda de `cobertura-de-escrita.test.ts` existe porque
 * esse apagamento não tem sintoma nenhum na hora.
 */
export function useAlterarOportunidade() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: CrmOpportunityWriteRequest }) => {
      const resposta: RespostaDaApi = await updateCrmOpportunity(id, corpo)
      return dadosOuErro<CrmOpportunityDto>(resposta, 'Falha ao gravar a oportunidade.')
    },
    onSuccess: invalidar,
  })
}

/**
 * O movimento do quadro: UMA intenção, UMA requisição.
 *
 * `precedeId` é o id do cartão na frente do qual a oportunidade fica; `null` =
 * fim da coluna. Estágio marcado como perda exige `lostReasonId` — sem ele o
 * servidor responde 400, e é resposta correta: perda sem motivo não vira
 * análise nenhuma no fim do ano.
 */
export function useMoverOportunidade() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async ({
      id,
      destino,
    }: { id: string; destino: CrmOpportunityStagePatchRequest }) => {
      const resposta: RespostaDaApi = await moveCrmOpportunityStage(id, destino)
      return dadosOuErro<CrmOpportunityDto>(resposta, 'Falha ao mover a oportunidade.')
    },
    onSuccess: invalidar,
  })
}

export function useCriarFunil() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async (corpo: CrmPipelineWriteRequest) => {
      const resposta: RespostaDaApi = await createCrmPipeline(corpo)
      return dadosOuErro<CrmPipelineDto>(resposta, 'Falha ao criar o funil.')
    },
    onSuccess: invalidar,
  })
}

/** Desativar funil é `active: false` por aqui — não existe DELETE no contrato. */
export function useAlterarFunil() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: CrmPipelineWriteRequest }) => {
      const resposta: RespostaDaApi = await updateCrmPipeline(id, corpo)
      return dadosOuErro<CrmPipelineDto>(resposta, 'Falha ao gravar o funil.')
    },
    onSuccess: invalidar,
  })
}

/**
 * Estágio nasce e vive DENTRO de um funil: o `pipelineId` vem do caminho, e não
 * do corpo, para que os dois não possam divergir.
 */
export function useCriarEstagio() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async ({
      pipelineId,
      corpo,
    }: { pipelineId: string; corpo: CrmStageWriteRequest }) => {
      const resposta: RespostaDaApi = await createCrmStage(pipelineId, corpo)
      return dadosOuErro<CrmStageDto>(resposta, 'Falha ao criar o estágio.')
    },
    onSuccess: invalidar,
  })
}

export function useAlterarEstagio() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async ({
      pipelineId,
      id,
      corpo,
    }: { pipelineId: string; id: string; corpo: CrmStageWriteRequest }) => {
      const resposta: RespostaDaApi = await updateCrmStage(pipelineId, id, corpo)
      return dadosOuErro<CrmStageDto>(resposta, 'Falha ao gravar o estágio.')
    },
    onSuccess: invalidar,
  })
}

export function useCriarMotivoDePerda() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async (corpo: CrmLostReasonWriteRequest) => {
      const resposta: RespostaDaApi = await createCrmLostReason(corpo)
      return dadosOuErro<CrmLostReasonDto>(resposta, 'Falha ao criar o motivo de perda.')
    },
    onSuccess: invalidar,
  })
}

export function useAlterarMotivoDePerda() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: CrmLostReasonWriteRequest }) => {
      const resposta: RespostaDaApi = await updateCrmLostReason(id, corpo)
      return dadosOuErro<CrmLostReasonDto>(resposta, 'Falha ao gravar o motivo de perda.')
    },
    onSuccess: invalidar,
  })
}
