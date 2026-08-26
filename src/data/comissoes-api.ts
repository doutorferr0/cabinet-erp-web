import type {
  CommissionTierDto,
  CommissionTierWriteRequest,
  ListTechnicalReservesParams,
  OrderParticipantDto,
  OrderParticipantTierDto,
  OrderParticipantWriteRequest,
  PagedResultOfCommissionTierDto,
  PagedResultOfOrderParticipantDto,
  PagedResultOfTechnicalReserveDto,
  TechnicalReserveDto,
  TechnicalReserveWriteRequest,
} from '@/api/gerado'
import {
  type CommissionTierOperator,
  cancelTechnicalReserve,
  createTechnicalReserve,
  listEmployeeCommissionTiers,
  listOrderParticipants,
  listPartnerCommissionTiers,
  listTechnicalReserves,
  replaceEmployeeCommissionTiers,
  replaceOrderParticipants,
  replacePartnerCommissionTiers,
} from '@/api/gerado'
import {
  ErroDaApi,
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  dadosOuErro,
  queryDaTabela,
  repetirSeValeAPena,
} from '@/data/api-provider'
import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DAS COMISSÕES (G8) — participação no documento, faixas do perfil e
 * Reserva Técnica.
 *
 * ## Nenhuma das três tem handler no mock, e isso é decisão, não atraso
 *
 * `whitelist-do-contrato.test.ts` declara as sete listagens desta família em
 * `SEM_HANDLER_NO_MOCK` com o motivo escrito: a apuração soma sobre o PEDIDO DE
 * VENDA, que o mock não guarda. As telas que este arquivo alimenta nascem, por
 * isso, HTTP puro — como o documento de que elas pendem, que já é HTTP desde a
 * `#317`. Em modo mock a folha do pedido não abre, então a aba de participação
 * não chega a ser desenhada; a Reserva Técnica tem tela própria e DIZ, na
 * própria tela, que depende do servidor.
 *
 * ## As três dividem um arquivo porque dividem um cálculo
 *
 * Faixa do perfil (`CommissionTierDto`) e faixa congelada no documento
 * (`OrderParticipantTierDto`) carregam o MESMO trio — operador, desconto,
 * percentual — e o contrato guarda um schema só para as duas portas de perfil
 * (colaborador e parceiro) pelo motivo que ele escreve: *"separar duplicaria o
 * motor de cálculo, que é a única parte onde errar custa dinheiro de verdade"*.
 * Separar aqui repetiria a mesma tradução três vezes, e a terceira cópia é onde
 * a escala de 4 casas vira 2 sem ninguém ver.
 */

/** Whitelist de `sortBy` da participação — a MESMA da descrição do contrato. */
export const ORDENAVEIS_PARTICIPACAO: readonly string[] = [
  'personName',
  'role',
  'percent',
  'isPrincipal',
]

/** Whitelist de `sortBy` das faixas do perfil — igual nas duas portas. */
export const ORDENAVEIS_FAIXA: readonly string[] = [
  'productGroupName',
  'discountPercent',
  'percent',
  'active',
]

/** Whitelist de `sortBy` da Reserva Técnica. */
export const ORDENAVEIS_RESERVA_TECNICA: readonly string[] = [
  'issuedAt',
  'partnerName',
  'orderNumber',
  'totalCents',
  'status',
]

/**
 * O vocabulário do operador da faixa, na ordem em que ele é lido em voz alta.
 *
 * Sai do contrato (`CommissionTierOperator`) e é FECHADO: texto livre aqui
 * produziria `=>` num cadastro e faixa que nunca casa em produção, sem erro
 * nenhum na hora de gravar.
 */
export const OPERADORES_DE_FAIXA: readonly CommissionTierOperator[] = ['>=', '<=', '>', '<', '=']

/** O papel na venda — vocabulário fechado de dois valores. */
export type PapelDeParticipacao = 'attendant' | 'professional'

/** Rótulo do papel, para a grade e para o botão que inclui a linha. */
export const ROTULO_DO_PAPEL: Record<PapelDeParticipacao, string> = {
  attendant: 'Atendente',
  professional: 'Profissional',
}

/** Rótulo do tipo da Reserva Técnica — `Ret_tipo` do legado. */
export const ROTULO_DO_TIPO_DE_RT: Record<TechnicalReserveDto['kind'], string> = {
  project: 'Projeto',
  standalone: 'Avulsa',
}

/** Rótulo da situação do lançamento. Lançamento CANCELA, não desativa. */
export const ROTULO_DA_SITUACAO_DE_RT: Record<TechnicalReserveDto['status'], string> = {
  active: 'Ativa',
  cancelled: 'Cancelada',
}

/**
 * Uma FAIXA CONGELADA, do jeito que a tela a lê.
 *
 * Não tem forma de escrita porque não se escreve: ela nasce na cópia do perfil,
 * quando a pessoa entra no documento, e daí em diante é passado. A grade a
 * mostra para explicar o número que a apuração vai pagar — sem ela, o
 * percentual geral da linha parece ser a história inteira.
 */
export interface FaixaCongelada {
  grupoId: string
  grupoNome: string
  operador: CommissionTierOperator
  descontoPercentual: number
  percentual: number
}

/**
 * Uma linha da grade de participação, do jeito que a tela a EDITA.
 *
 * As faixas ficam de fora de propósito: elas não se editam, não viajam na
 * escrita, e dentro do estado do formulário virariam campo que o operador
 * poderia sujar sem que nada as gravasse. Quem as guarda é a leitura
 * (`ParticipanteDoPedido`), que é de onde o painel de faixas as lê.
 */
export interface LinhaDeParticipacao {
  /**
   * **O ECO que preserva o congelamento.** `null` = linha nova, e é nela que o
   * servidor copia o perfil de HOJE. Linha que volta com o id que veio da
   * leitura é a MESMA linha, e as faixas congeladas nela ficam onde estão.
   */
  id: string | null
  papel: PapelDeParticipacao
  /** Preenchido quando o papel é `attendant`; `null` no outro. */
  colaboradorId: string | null
  /** Preenchido quando o papel é `professional`; `null` no outro. */
  parceiroId: string | null
  /** O nome que a grade mostra — colaborador ou parceiro, o que houver. */
  nome: string
  /** Percentual com 4 casas escaladas (`10000` = 1%). `null` = "use o perfil". */
  percentual: number | null
  principal: boolean
  /** `DtVigencia` do legado. `null` na linha que nasceu com o documento. */
  vigenciaDe: string | null
}

/** A participação como o servidor a devolve: a linha MAIS as faixas congeladas. */
export interface ParticipanteDoPedido extends LinhaDeParticipacao {
  faixas: readonly FaixaCongelada[]
}

/** Uma linha da grade de faixas do PERFIL (cadastro), do jeito que a tela a edita. */
export interface FaixaDaGrade {
  /** Ecoa a linha existente. `null` = linha nova. */
  id: string | null
  /** `null` é a faixa GERAL — a que responde por todo grupo sem linha própria. */
  grupoId: string | null
  /** Nome do grupo, ecoado pelo servidor. Vazio na faixa geral. */
  grupoNome: string
  operador: CommissionTierOperator
  descontoPercentual: number
  percentual: number
  ativo: boolean
}

/** `OrderParticipantTierDto` → faixa congelada da tela. */
function faixaCongeladaDoContrato(dto: OrderParticipantTierDto): FaixaCongelada {
  return {
    grupoId: dto.productGroupId,
    grupoNome: dto.productGroupName,
    operador: dto.operator,
    descontoPercentual: dto.discountPercent,
    percentual: dto.percent,
  }
}

/** `OrderParticipantDto` → linha da grade. */
export function participanteDoContrato(dto: OrderParticipantDto): ParticipanteDoPedido {
  return {
    id: dto.id,
    papel: dto.role,
    colaboradorId: dto.employeeId ?? null,
    parceiroId: dto.partnerId ?? null,
    nome: dto.personName,
    percentual: dto.percent,
    principal: dto.isPrincipal,
    vigenciaDe: dto.validFrom ?? null,
    faixas: (dto.tiers ?? []).map(faixaCongeladaDoContrato),
  }
}

/**
 * Linha da grade → corpo de escrita.
 *
 * **As faixas NÃO viajam**, e a ausência é a regra: elas saem do perfil da
 * pessoa, que é cadastro da empresa, e quem as copia é o servidor. Faixa vinda
 * do corpo seria o cliente escolhendo quanto ganha por grupo.
 *
 * O par `employeeId`/`partnerId` viaja pelo papel e só pelo papel: o contrato
 * recusa com 400 tanto o papel sem pessoa quanto o papel com as duas, e mandar
 * `null` no campo do outro papel é a forma de dizer "não é esta".
 */
export function participanteParaContrato(linha: LinhaDeParticipacao): OrderParticipantWriteRequest {
  return {
    id: linha.id,
    role: linha.papel,
    employeeId: linha.papel === 'attendant' ? linha.colaboradorId : null,
    partnerId: linha.papel === 'professional' ? linha.parceiroId : null,
    // `null` NÃO é zero: é "use o perfil". Zero explícito é participação sem
    // comissão, que é caso real — o atendente que responde pela venda e não
    // ganha por ela. Trocar um pelo outro é a diferença entre pagar o percentual
    // do cadastro e não pagar nada.
    percent: linha.percentual,
    isPrincipal: linha.principal,
    validFrom: linha.vigenciaDe,
  }
}

/** `CommissionTierDto` → linha da grade de faixas. */
export function faixaDoContrato(dto: CommissionTierDto): FaixaDaGrade {
  return {
    id: dto.id,
    grupoId: dto.productGroupId ?? null,
    grupoNome: dto.productGroupName ?? '',
    operador: dto.operator,
    descontoPercentual: dto.discountPercent,
    percentual: dto.percent,
    ativo: dto.active,
  }
}

/**
 * Linha da grade → corpo de escrita da faixa.
 *
 * `productGroupName` não vai: é eco do servidor, e cadastro mostra o nome de
 * hoje. Mandá-lo faria a tela propor o nome do grupo, que ela não é dona.
 */
export function faixaParaContrato(linha: FaixaDaGrade): CommissionTierWriteRequest {
  return {
    id: linha.id,
    productGroupId: linha.grupoId,
    operator: linha.operador,
    discountPercent: linha.descontoPercentual,
    percent: linha.percentual,
    active: linha.ativo,
  }
}

/** Faixa em branco do `Incluir` da grade — nasce GERAL, ativa e sem desconto. */
export function faixaVazia(): FaixaDaGrade {
  return {
    id: null,
    grupoId: null,
    grupoNome: '',
    operador: '>=',
    descontoPercentual: 0,
    percentual: 0,
    ativo: true,
  }
}

/** Chaves de cache num lugar só — a tela invalida a mesma lista que lê. */
export const CHAVES_COMISSAO = {
  participacao: (pedidoId: string) => ['pedido-venda', pedidoId, 'participacao'] as const,
  faixasDeParceiro: (parceiroId: string) => ['parceiro', parceiroId, 'faixas'] as const,
  faixasDeColaborador: (colaboradorId: string) => ['colaborador', colaboradorId, 'faixas'] as const,
  reservasTecnicas: ['reservas-tecnicas'] as const,
}

/**
 * A participação do documento, inteira.
 *
 * Pede o conjunto no teto (`PAGE_SIZE_MAX`): a grade edita todas as linhas de
 * uma vez porque o `PUT` substitui o conjunto — meia lista na tela viraria meia
 * lista no servidor, e as que ficaram de fora sumiriam sem ninguém pedir.
 */
export async function listarParticipantes(pedidoId: string): Promise<ParticipanteDoPedido[]> {
  const resposta = await listOrderParticipants(pedidoId, { pageSize: PAGE_SIZE_MAX })
  const pagina = dadosOuErro<PagedResultOfOrderParticipantDto>(
    resposta,
    'Falha ao consultar a participação do pedido.',
  )
  return (pagina.rows ?? []).map(participanteDoContrato)
}

/** Substitui a participação do documento. Lista vazia apaga — e é gesto legítimo. */
export async function gravarParticipantes(
  pedidoId: string,
  linhas: readonly LinhaDeParticipacao[],
): Promise<ParticipanteDoPedido[]> {
  const resposta = await replaceOrderParticipants(pedidoId, {
    participants: linhas.map(participanteParaContrato),
  })
  const pagina = dadosOuErro<PagedResultOfOrderParticipantDto>(
    resposta,
    'Falha ao gravar a participação do pedido.',
  )
  return (pagina.rows ?? []).map(participanteDoContrato)
}

/** Leitura da participação. Desligada enquanto não há documento gravado. */
export function useParticipantes(pedidoId: string | null) {
  return useQuery({
    queryKey: CHAVES_COMISSAO.participacao(pedidoId ?? ''),
    queryFn: () => listarParticipantes(pedidoId as string),
    retry: repetirSeValeAPena,
    enabled: pedidoId !== null && pedidoId !== '',
  })
}

/** Gravação da grade inteira. */
export function useGravarParticipantes(pedidoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linhas: readonly LinhaDeParticipacao[]) => gravarParticipantes(pedidoId, linhas),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHAVES_COMISSAO.participacao(pedidoId) }),
  })
}

/**
 * AS DUAS PORTAS DO PERFIL — colaborador e parceiro.
 *
 * O schema é um só (o contrato diz por que), e o que muda é a porta e o que o
 * ganho vira depois: comissão de um lado, Reserva Técnica do outro. A escolha
 * viaja como parâmetro em vez de virar dois arquivos porque é isso que ela é —
 * um endereço, não uma regra.
 */
export type PortaDePerfil = 'employee' | 'partner'

async function listarFaixas(porta: PortaDePerfil, pessoaId: string): Promise<FaixaDaGrade[]> {
  const resposta =
    porta === 'employee'
      ? await listEmployeeCommissionTiers(pessoaId, { pageSize: PAGE_SIZE_MAX })
      : await listPartnerCommissionTiers(pessoaId, { pageSize: PAGE_SIZE_MAX })

  const pagina = dadosOuErro<PagedResultOfCommissionTierDto>(
    resposta,
    'Falha ao consultar o perfil de participação.',
  )
  return (pagina.rows ?? []).map(faixaDoContrato)
}

async function gravarFaixas(
  porta: PortaDePerfil,
  pessoaId: string,
  linhas: readonly FaixaDaGrade[],
): Promise<FaixaDaGrade[]> {
  const corpo = { tiers: linhas.map(faixaParaContrato) }
  const resposta =
    porta === 'employee'
      ? await replaceEmployeeCommissionTiers(pessoaId, corpo)
      : await replacePartnerCommissionTiers(pessoaId, corpo)

  const pagina = dadosOuErro<PagedResultOfCommissionTierDto>(
    resposta,
    'Falha ao gravar o perfil de participação.',
  )
  return (pagina.rows ?? []).map(faixaDoContrato)
}

/** A chave depende da PORTA: colaborador e parceiro têm cadastros diferentes. */
function chaveDasFaixas(porta: PortaDePerfil, pessoaId: string): readonly unknown[] {
  return porta === 'employee'
    ? CHAVES_COMISSAO.faixasDeColaborador(pessoaId)
    : CHAVES_COMISSAO.faixasDeParceiro(pessoaId)
}

/** Leitura do perfil de faixas. Desligada no `Incluir`, que ainda não tem pessoa. */
export function useFaixas(porta: PortaDePerfil, pessoaId: string | null) {
  return useQuery({
    queryKey: chaveDasFaixas(porta, pessoaId ?? ''),
    queryFn: () => listarFaixas(porta, pessoaId as string),
    retry: repetirSeValeAPena,
    enabled: pessoaId !== null && pessoaId !== '',
  })
}

/** Gravação do perfil inteiro — `PUT` substitui o conjunto. */
export function useGravarFaixas(porta: PortaDePerfil, pessoaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linhas: readonly FaixaDaGrade[]) => gravarFaixas(porta, pessoaId, linhas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaveDasFaixas(porta, pessoaId) }),
  })
}

/**
 * O RECORTE da Reserva Técnica — os parâmetros que o contrato publica.
 *
 * Não há `filters` estruturado nem `q` nesta listagem, e por isso a tela não
 * desenha nenhum dos dois: caixa de busca que o servidor descarta devolve a
 * lista inteira e ensina o operador a não confiar no que digitou.
 */
export interface RecorteDeReservaTecnica {
  pedidoId?: string | undefined
  parceiroId?: string | undefined
  situacao?: TechnicalReserveDto['status'] | undefined
  de?: string | undefined
  ate?: string | undefined
}

/** Recorte da tela → parâmetros da operação, sem os campos vazios. */
export function paramsDoRecorte(recorte: RecorteDeReservaTecnica): ListTechnicalReservesParams {
  const params: ListTechnicalReservesParams = {}
  if (recorte.pedidoId) params.orderId = recorte.pedidoId
  if (recorte.parceiroId) params.partnerId = recorte.parceiroId
  if (recorte.situacao) params.status = recorte.situacao
  if (recorte.de) params.from = recorte.de
  if (recorte.ate) params.to = recorte.ate
  return params
}

/**
 * Listagem da Reserva Técnica, para a `VitraDataTable`.
 *
 * O recorte entra por fora do estado da tabela porque ele não é filtro
 * estruturado: são parâmetros próprios da operação, e a chave de cache da tela
 * os carrega para a consulta não servir a página de outro recorte.
 */
export function listarReservasTecnicas(
  state: TableQueryState,
  recorte: RecorteDeReservaTecnica = {},
): Promise<PagedResult<TechnicalReserveDto>> {
  return listTechnicalReserves({
    ...paramsDoRecorte(recorte),
    ...queryDaTabela(state),
  } as ListTechnicalReservesParams).then((resposta: RespostaDaApi) => {
    const pagina = dadosOuErro<PagedResultOfTechnicalReserveDto>(
      resposta,
      'Falha ao consultar a Reserva Técnica.',
    )
    return { rows: pagina.rows ?? [], total: pagina.total ?? 0 }
  })
}

/**
 * Lança a Reserva Técnica.
 *
 * **O corpo não tem valor, e a ausência é a decisão central do trilho:** quem
 * calcula `productCents` e `serviceCents` é o servidor, sobre a participação
 * congelada no documento. Valor vindo daqui seria o cliente afirmando quanto o
 * profissional ganha.
 */
export async function lancarReservaTecnica(
  corpo: TechnicalReserveWriteRequest,
): Promise<TechnicalReserveDto> {
  const resposta = await createTechnicalReserve(corpo)
  return dadosOuErro<TechnicalReserveDto>(resposta, 'Falha ao lançar a Reserva Técnica.')
}

/** Cancela o lançamento. Não há `DELETE`: lançamento cancela, não desativa. */
export async function cancelarReservaTecnica(id: string): Promise<TechnicalReserveDto> {
  const resposta = await cancelTechnicalReserve(id)
  return dadosOuErro<TechnicalReserveDto>(resposta, 'Falha ao cancelar a Reserva Técnica.')
}

export function useLancarReservaTecnica() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: lancarReservaTecnica,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVES_COMISSAO.reservasTecnicas }),
  })
}

export function useCancelarReservaTecnica() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelarReservaTecnica,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVES_COMISSAO.reservasTecnicas }),
  })
}

/** O `detail` que o servidor mandou, quando mandou — a frase acionável. */
export function motivoDaRecusa(erro: unknown): string | null {
  return erro instanceof ErroDaApi ? (erro.detail ?? erro.message) : null
}
