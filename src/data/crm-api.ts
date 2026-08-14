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
  PagedResultOfEmployeeDto,
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
  listEmployees,
  moveCrmOpportunityStage,
  updateCrmLostReason,
  updateCrmOpportunity,
  updateCrmPipeline,
  updateCrmStage,
} from '@/api/gerado'
import {
  ErroDaApi,
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  detalheDoProblema,
  itemOuNulo,
  repetirSeValeAPena,
  respostaOk,
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
/**
 * A listagem devolve o `CrmPipelineDto` CRU, sem tradução para os nomes em
 * português: o `sortBy` que viaja é o `accessorKey` da coluna, e a whitelist do
 * servidor é em inglês — traduzir aqui quebraria a ordenação com 400 ao clicar
 * no cabeçalho.
 *
 * `get` entra porque o caminho existe de verdade (`GET /api/crm/pipelines/{id}`)
 * e devolve o registro do FORMULÁRIO — cabeçalho e colunas, que são duas
 * consultas e uma tela só.
 */
export interface FunisProvider extends ListProvider<CrmPipelineDto> {
  get(id: string): Promise<Funil | null>
  /** Registro em branco do `Incluir` — local, o backend não fornece. */
  empty(): Funil
}

export const funis: FunisProvider = {
  ...createApiListProvider<CrmPipelineDto>({ url: URL_FUNIS }),
  get: (id) => obterFunil(id),
  empty: () => funilVazio(),
}

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

/* ------------------------------------------------------------------ *
 * O FUNIL COMO O FORMULÁRIO O EDITA
 * ------------------------------------------------------------------ */

/**
 * Uma coluna do funil na grade do formulário.
 *
 * Os campos são os do `CrmStageDto` com os nomes da TELA, e os numéricos viajam
 * como TEXTO: a célula editável da `FormGrid` é um `<input>`, e converter na
 * borda (aqui) é o que impede "12a" de virar `NaN` dentro do estado do
 * formulário. `id: null` é a marca de linha nova — é ele que faz o `Gravar`
 * criar o estágio em vez de tentar alterar um que não existe.
 */
export interface EstagioDeFunil {
  id: string | null
  nome: string
  ordem: string
  /** Probabilidade em int com 4 casas implícitas (célula `percent` da grade). */
  probabilidade: number | null
  ganho: boolean
  perdido: boolean
  /** Dias até o cartão apodrecer parado. Vazio = o estágio não apodrece. */
  apodreceEmDias: string
}

/** O funil inteiro do formulário: o cabeçalho e as colunas. */
export interface Funil {
  /** Vazio = Incluir (o servidor atribui no 201). */
  id: string
  nome: string
  ordem: string
  padrao: boolean
  ativo: boolean
  estagios: EstagioDeFunil[]
}

function textoDeInteiro(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor)
}

/**
 * Texto da grade → int do contrato. Vazio é `null` (ausência); texto que não é
 * número também vira `null` em vez de `NaN`, porque `NaN` atravessa o
 * `JSON.stringify` como `null` de qualquer jeito — melhor decidir aqui, à vista.
 */
function inteiroDeTexto(texto: string): number | null {
  const limpo = texto.trim()
  if (!limpo) return null
  const numero = Number(limpo)
  return Number.isFinite(numero) ? Math.trunc(numero) : null
}

export function estagioDoContrato(dto: CrmStageDto): EstagioDeFunil {
  return {
    id: dto.id,
    nome: dto.name,
    ordem: textoDeInteiro(dto.sort),
    probabilidade: dto.probability,
    ganho: dto.isWon,
    perdido: dto.isLost,
    apodreceEmDias: textoDeInteiro(dto.rotDays),
  }
}

export function estagioParaContrato(estagio: EstagioDeFunil): CrmStageWriteRequest {
  return {
    name: estagio.nome,
    sort: inteiroDeTexto(estagio.ordem) ?? 0,
    probability: estagio.probabilidade ?? 0,
    isWon: estagio.ganho,
    isLost: estagio.perdido,
    rotDays: inteiroDeTexto(estagio.apodreceEmDias),
  }
}

export function funilDoContrato(dto: CrmPipelineDto, estagios: CrmStageDto[]): Funil {
  return {
    id: dto.id,
    nome: dto.name,
    ordem: textoDeInteiro(dto.sort),
    padrao: dto.isDefault,
    ativo: dto.active,
    estagios: [...estagios].sort((a, b) => a.sort - b.sort).map(estagioDoContrato),
  }
}

export function funilParaContrato(funil: Funil): CrmPipelineWriteRequest {
  return {
    name: funil.nome,
    sort: inteiroDeTexto(funil.ordem) ?? 0,
    isDefault: funil.padrao,
    active: funil.ativo,
  }
}

/**
 * Registro em branco do `Incluir`. Local por natureza: o servidor não fornece
 * registro vazio, e o formulário não precisa esperar rede para abrir.
 *
 * **Nasce SEM estágio nenhum.** Semear "Contato / Proposta / Ganho" aqui
 * inventaria o modelo de venda da empresa — que é justamente o que muda de
 * empresa para empresa, e a razão de existirem vários funis.
 */
export function funilVazio(): Funil {
  return { id: '', nome: '', ordem: '', padrao: false, ativo: true, estagios: [] }
}

export const estagioVazio: EstagioDeFunil = {
  id: null,
  nome: '',
  ordem: '',
  probabilidade: null,
  ganho: false,
  perdido: false,
  apodreceEmDias: '',
}

/**
 * O funil para EDIÇÃO: cabeçalho e colunas, em duas consultas.
 *
 * São dois caminhos porque o contrato os separa de propósito — estágio tem id
 * estável e a oportunidade aponta para ele, então ele não viaja embutido no
 * `PUT` do funil. `null` quando o funil não existe (404); qualquer outra falha
 * REJEITA, para "não escolheu empresa" não virar "não encontrado".
 */
export async function obterFunil(id: string): Promise<Funil | null> {
  const cabecalho: RespostaDaApi = await getCrmPipeline(id)
  const dto = itemOuNulo<CrmPipelineDto>(cabecalho, 'o funil')
  if (!dto) return null

  const colunas: RespostaDaApi = await listCrmStages(id)
  const estagios = dadosOuErro<CrmStageDto[]>(colunas, 'Falha ao carregar os estágios do funil.')
  return funilDoContrato(dto, estagios)
}

function estagioMudou(antes: EstagioDeFunil, agora: EstagioDeFunil): boolean {
  return (
    antes.nome !== agora.nome ||
    antes.ordem !== agora.ordem ||
    antes.probabilidade !== agora.probabilidade ||
    antes.ganho !== agora.ganho ||
    antes.perdido !== agora.perdido ||
    antes.apodreceEmDias !== agora.apodreceEmDias
  )
}

/**
 * Grava as colunas: linha sem `id` vira `POST`, linha alterada vira `PUT`.
 *
 * Mesma forma da grade de variantes do produto, e pelos mesmos motivos:
 * **linha inalterada não vira requisição** (senão cada `Gravar` carimbaria
 * alteração em coluna que ninguém tocou) e as escritas são **sequenciais**, para
 * a mensagem poder dizer QUAL coluna falhou.
 *
 * **Não há transação entre os endpoints** — o contrato não oferece uma. Se a
 * terceira coluna falhar, o funil e as duas anteriores já estão gravados, e a
 * mensagem manda reabrir: a grade em tela ainda mostra como novas as linhas que
 * já foram criadas.
 *
 * **Coluna removida da grade NÃO é apagada no servidor**, e é decisão: o
 * contrato não tem `DELETE` de estágio porque apagar coluna com cartão dentro
 * obrigaria o servidor a escolher para onde os cartões vão. Some da tela e
 * continua no funil — por isso a tela avisa em vez de fingir que excluiu.
 */
export async function gravarEstagios(
  pipelineId: string,
  estagios: readonly EstagioDeFunil[],
  originais: readonly EstagioDeFunil[],
): Promise<void> {
  const antes = new Map(originais.filter((e) => e.id).map((e) => [e.id, e]))

  for (const estagio of estagios) {
    const anterior = estagio.id ? antes.get(estagio.id) : undefined
    if (anterior && !estagioMudou(anterior, estagio)) continue

    const corpo = estagioParaContrato(estagio)
    const resposta: RespostaDaApi = estagio.id
      ? await updateCrmStage(pipelineId, estagio.id, corpo)
      : await createCrmStage(pipelineId, corpo)

    if (!respostaOk(resposta) || !resposta.data) {
      throw new ErroDaApi(
        `Falha ao gravar o estágio ${estagio.nome || '(sem nome)'}. O funil já foi gravado — reabra o funil antes de tentar de novo.`,
        resposta.status,
        detalheDoProblema(resposta.data),
      )
    }
  }
}

/** O que o `Gravar` manda: o registro editado e o que veio do servidor. */
export interface GravacaoDeFunil {
  values: Funil
  /** Registro como o servidor o devolveu; ausente no Incluir. */
  original?: Funil | null
}

/**
 * A porta única de escrita do funil: `id` vazio = Incluir (POST → 201), senão
 * Alterar (PUT → 200). Recebe o corpo montado do registro INTEIRO — `PUT`
 * substitui tudo, e corpo parcial apaga o que não veio.
 */
export async function escreverFunil(
  id: string,
  corpo: CrmPipelineWriteRequest,
): Promise<CrmPipelineDto> {
  const resposta: RespostaDaApi = id
    ? await updateCrmPipeline(id, corpo)
    : await createCrmPipeline(corpo)

  if (!respostaOk(resposta) || !resposta.data) {
    throw new ErroDaApi(
      'Falha ao gravar o funil.',
      resposta.status,
      detalheDoProblema(resposta.data),
    )
  }
  return resposta.data as CrmPipelineDto
}

/**
 * `Gravar` do formulário: o funil primeiro, as colunas depois.
 *
 * A ordem não é estética — no Incluir, o `pipelineId` que as colunas penduram
 * só existe depois do 201.
 */
export async function gravarFunil({ values, original }: GravacaoDeFunil): Promise<CrmPipelineDto> {
  const gravado = await escreverFunil(values.id, funilParaContrato(values))
  await gravarEstagios(gravado.id, values.estagios, original?.estagios ?? [])
  return gravado
}

export function useGravarFunil() {
  const invalidar = useInvalidarCrm()
  return useMutation({ mutationFn: gravarFunil, onSuccess: invalidar })
}

/**
 * O `Excluir` da listagem de funis é DESATIVAÇÃO (padrão 8), e mora aqui pelo
 * mesmo motivo do `useDesativarParceiro`: é a fronteira que sabe montar o `PUT`
 * a partir do registro INTEIRO. Montado da linha, e não de um corpo parcial —
 * `PUT` parcial apagaria nome e ordem junto com o `active`.
 */
export function useDesativarFunil() {
  const invalidar = useInvalidarCrm()
  return useMutation({
    mutationFn: async (linha: CrmPipelineDto) =>
      escreverFunil(linha.id, {
        name: linha.name,
        sort: linha.sort,
        isDefault: linha.isDefault,
        active: false,
      }),
    onSuccess: invalidar,
  })
}

/* ------------------------------------------------------------------ *
 * A OPORTUNIDADE COMO O FORMULÁRIO A EDITA
 * ------------------------------------------------------------------ */

/**
 * O registro do formulário da oportunidade.
 *
 * Todo campo do `CrmOpportunityWriteRequest` está aqui, inclusive o que a tela
 * não deixa editar (`quoteId`): `PUT` substitui o registro inteiro, e campo que
 * não atravessa o formulário é campo apagado sem sintoma. Os `*Name` do DTO NÃO
 * entram — o servidor os resolve, e guardá-los no formulário criaria uma segunda
 * verdade sobre o nome do parceiro.
 *
 * `parceiroNome` é a exceção, e é só de EXIBIÇÃO: a janela de busca devolve id e
 * nome juntos, e o campo precisa mostrar algo enquanto o servidor não respondeu
 * de novo. Ele não viaja na escrita.
 */
export interface Oportunidade {
  /** Vazio = Incluir (o servidor atribui no 201). */
  id: string
  nome: string
  funilId: string | null
  etapaId: string | null
  parceiroId: string | null
  parceiroNome: string
  contatoNome: string
  contatoEmail: string
  contatoTelefone: string
  responsavelId: string | null
  valorPrevistoCentavos: number | null
  dataPrevista: string
  origem: string
  motivoDePerdaId: string | null
  /** Carregado-não-editado: o vínculo com o orçamento nasce do orçamento. */
  orcamentoId: string | null
}

export function oportunidadeDoContrato(dto: CrmOpportunityDto): Oportunidade {
  return {
    id: dto.id,
    nome: dto.name,
    funilId: dto.pipelineId,
    etapaId: dto.stageId,
    parceiroId: dto.partnerId ?? null,
    parceiroNome: dto.partnerName ?? '',
    contatoNome: dto.contactName ?? '',
    contatoEmail: dto.contactEmail ?? '',
    contatoTelefone: dto.contactPhone ?? '',
    responsavelId: dto.ownerEmployeeId ?? null,
    valorPrevistoCentavos: dto.expectedValueCents ?? null,
    dataPrevista: dto.expectedCloseDate ?? '',
    origem: dto.source ?? '',
    motivoDePerdaId: dto.lostReasonId ?? null,
    orcamentoId: dto.quoteId ?? null,
  }
}

/** Texto vazio do formulário → `null` do contrato: ausência, não string vazia. */
function textoOuNulo(texto: string): string | null {
  const limpo = texto.trim()
  return limpo === '' ? null : limpo
}

export function oportunidadeParaContrato(o: Oportunidade): CrmOpportunityWriteRequest {
  return {
    name: o.nome,
    pipelineId: o.funilId,
    stageId: o.etapaId,
    partnerId: o.parceiroId,
    contactName: textoOuNulo(o.contatoNome),
    contactEmail: textoOuNulo(o.contatoEmail),
    contactPhone: textoOuNulo(o.contatoTelefone),
    ownerEmployeeId: o.responsavelId,
    expectedValueCents: o.valorPrevistoCentavos,
    expectedCloseDate: textoOuNulo(o.dataPrevista),
    source: textoOuNulo(o.origem),
    lostReasonId: o.motivoDePerdaId,
    quoteId: o.orcamentoId,
  }
}

/**
 * Registro em branco do `Incluir`. Funil e etapa entram por parâmetro porque o
 * quadro sabe de onde o operador clicou — e o contrato aceita os dois nulos,
 * caindo no funil padrão e na primeira etapa dele.
 */
export function oportunidadeVazia(funilId?: string, etapaId?: string): Oportunidade {
  return {
    id: '',
    nome: '',
    funilId: funilId ?? null,
    etapaId: etapaId ?? null,
    parceiroId: null,
    parceiroNome: '',
    contatoNome: '',
    contatoEmail: '',
    contatoTelefone: '',
    responsavelId: null,
    valorPrevistoCentavos: null,
    dataPrevista: '',
    origem: '',
    motivoDePerdaId: null,
    orcamentoId: null,
  }
}

/** Uma oportunidade por id, já no formato do formulário; `null` no 404. */
export async function obterOportunidade(id: string): Promise<Oportunidade | null> {
  const resposta: RespostaDaApi = await getCrmOpportunity(id)
  const dto = itemOuNulo<CrmOpportunityDto>(resposta, 'a oportunidade')
  return dto ? oportunidadeDoContrato(dto) : null
}

/**
 * A porta única de escrita: `id` vazio = Incluir (POST → 201), senão Alterar
 * (PUT → 200). Toda falha vira `ErroDaApi` com o `detail` do problem+json — na
 * escrita o modo de falhar é ERRO ALTO (400 validação, 403 escopo, 409), nunca
 * silêncio.
 */
export async function gravarOportunidade(valores: Oportunidade): Promise<CrmOpportunityDto> {
  const corpo = oportunidadeParaContrato(valores)
  const resposta: RespostaDaApi = valores.id
    ? await updateCrmOpportunity(valores.id, corpo)
    : await createCrmOpportunity(corpo)

  if (!respostaOk(resposta) || !resposta.data) {
    throw new ErroDaApi(
      'Falha ao gravar a oportunidade.',
      resposta.status,
      detalheDoProblema(resposta.data),
    )
  }
  return resposta.data as CrmOpportunityDto
}

export function useGravarOportunidade() {
  const invalidar = useInvalidarCrm()
  return useMutation({ mutationFn: gravarOportunidade, onSuccess: invalidar })
}

/**
 * Colaboradores da empresa, para o campo `Responsável`.
 *
 * `GET /api/employees` já existia no contrato e nenhuma tela o consumia — o
 * `EmployeeDto` chegava embutido nas tarefas. É o mesmo endpoint, e o
 * `ownerEmployeeId` da oportunidade é `EmployeeDto.id` por definição do
 * contrato: montar a lista de outro lugar casaria id de origens diferentes.
 */
export function useColaboradoresParaEscolha() {
  return useQuery({
    queryKey: ['crm', 'colaboradores'],
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listEmployees({ page: 1, pageSize: PAGE_SIZE_MAX })
      const pagina = dadosOuErro<PagedResultOfEmployeeDto>(
        resposta,
        'Falha ao carregar os colaboradores.',
      )
      return pagina.rows ?? []
    },
  })
}
