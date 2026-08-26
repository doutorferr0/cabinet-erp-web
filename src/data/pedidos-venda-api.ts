import type {
  DocumentInstallmentDto,
  InstallmentPolicyDto,
  OrderDetailDto,
  OrderDto,
  OrderGroupDiscountDto,
  OrderParticipantDto,
  OrderServiceItemDto,
  OrderWriteRequest,
  PagedResultOfOrderParticipantDto,
  PagedResultOfOrderProfessionalAssignmentDto,
} from '@/api/gerado'
import {
  cancelOrder,
  concludeOrder,
  createOrder,
  getOrder,
  listOrderParticipants,
  listOrderProfessionalHistory,
  returnDemoOrder,
  transferOrderProfessional,
  updateOrder,
} from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
} from '@/data/api-provider'
import { type MotivoDoCancelamento, corpoDoCancelamento } from '@/data/cancelamento-de-documento'
import type { DocumentoProvider, ListProvider } from '@/data/provider'
import { avisar } from '@/lib/avisos'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DO PEDIDO DE VENDA — `/api/orders`.
 *
 * O caminho está no contrato e o backend serve as DEZ operações. Seis já eram
 * consumidas aqui (`ListOrders`, `GetOrder`, `CreateOrder`, `UpdateOrder`,
 * `CancelOrder`, `CreateOrderFromQuote`); as quatro do CICLO — `ConcludeOrder`,
 * `ReturnDemoOrder`, `TransferOrderProfessional`, `ListOrderProfessionalHistory`
 * — respondiam 501 quando esta fronteira nasceu e passaram a responder de
 * verdade na api#145. O comentário que dizia "quatro respondem 501" sobreviveu
 * ao fato por uma leva inteira: dívida escrita no código só cai quando alguém
 * volta, e quem lê no meio acredita.
 *
 * ## Por que ele não é o orçamento com outro nome
 *
 * Os dois DTOs compartilham 31 campos, e no legado são o MESMO registro físico
 * discriminado por `Ven_Tipo`. Ainda assim são agregados separados aqui, e o
 * pedido carrega quatro coisas que o orçamento não tem: `type` (venda ou
 * demonstração), o prazo e o retorno da demonstração, e a origem
 * (`quoteId`/`quoteNumber`). Reaproveitar o tipo do orçamento faria a tela
 * perder os quatro no primeiro `PUT`, que é INTEGRAL.
 *
 * ## Os NOMES de campo são os do orçamento, e isso é de propósito
 *
 * `BlocoPagamento` lê o formulário por `useWatch({ name: … })` — `itens`,
 * `modoDesconto`, `descontoPercentual`, `condicaoPagamentoId`, `parcelas`,
 * `politicaDeParcelamento`. Manter os mesmos nomes é o que permite compor o
 * bloco sem tocar em `features/orcamento/`, que é zona de outro trilho.
 */

export const URL_PEDIDOS_VENDA = '/api/orders'

/**
 * Whitelist de `sortBy` — a MESMA da descrição do contrato.
 *
 * `series`, `totalCents` e `discountPercent` ficam de fora (o contrato os
 * exclui), e `status`/`type` também: ordenar por eles não põe nada em ordem
 * para quem lê. A coluna aparece na grade e não ordena, o que é melhor que um
 * cabeçalho clicável que responde 400 ao primeiro clique.
 */
export const ORDENAVEIS_PEDIDO_VENDA: readonly string[] = [
  'number',
  'issuedAt',
  'customerName',
  'projectName',
  'workName',
]

/**
 * A do `filters` é a do `sortBy` MAIS `workId`, `status` e `type`.
 *
 * As três respondem perguntas que a ordenação não responde: "os documentos
 * desta obra", "só os que ainda estão abertos", "só as demonstrações". `workId`
 * é uuid — ordenar por ele não ordena nada, mas filtrar por ele é como a tela
 * pergunta pela obra.
 */
export const FILTRAVEIS_PEDIDO_VENDA: readonly string[] = [
  ...ORDENAVEIS_PEDIDO_VENDA,
  'workId',
  'status',
  'type',
]

/**
 * Chaves de cache num lugar só — DUAS raízes, como no orçamento: `raiz` é a
 * listagem (`OrderDto` cru) e `detalhe` é a folha (`PedidoDeVenda`), montada
 * pela `TelaDeDocumento` com `queryKeyBase="pedido-venda"`.
 *
 * `['pedido-venda']` NÃO é prefixo de `['pedidos-venda']`: a comparação do
 * TanStack é elemento a elemento, e invalidar só uma deixaria a outra parada.
 */
export const CHAVES_PEDIDO_VENDA = {
  raiz: ['pedidos-venda'] as const,
  detalhe: ['pedido-venda'] as const,
  um: (id: string) => ['pedido-venda', id] as const,
  /**
   * A trilha da indicação tem raiz PRÓPRIA, e não é filha de `detalhe`.
   *
   * Ela não vem no `GET` do documento e cresce por outro caminho: pendurá-la em
   * `['pedido-venda', id, …]` faria toda gravação do formulário derrubar um
   * histórico que a gravação não muda — e o contrário, transferir sem invalidar
   * a folha, deixaria o nome do profissional velho na tela.
   */
  historico: ['pedido-venda-profissionais'] as const,
  historicoDe: (id: string) => ['pedido-venda-profissionais', id] as const,
  /**
   * A PARTICIPAÇÃO tem raiz própria pela mesma razão da trilha: não vem no
   * `GET` do documento, e pendurá-la em `['pedido-venda', id, …]` faria toda
   * gravação do formulário derrubar uma lista que a gravação não muda.
   *
   * Quem a invalida é a TRANSFERÊNCIA, e só ela — é a única operação desta
   * fronteira que mexe na grade (troca o profissional principal).
   */
  participacao: ['pedido-venda-participantes'] as const,
  participacaoDe: (id: string) => ['pedido-venda-participantes', id] as const,
}

/** Modo de desconto na língua da tela — TRÊS, não dois. */
export type ModoDesconto = 'PRODUTO' | 'GERAL' | 'GRUPO'

const MODO_DO_CONTRATO: Record<OrderDetailDto['discountMode'], ModoDesconto> = {
  product: 'PRODUTO',
  general: 'GERAL',
  group: 'GRUPO',
}

const MODO_PARA_CONTRATO: Record<ModoDesconto, OrderWriteRequest['discountMode']> = {
  PRODUTO: 'product',
  GERAL: 'general',
  GRUPO: 'group',
}

/** Um item da grade, na língua da tela (§8.2 da transcrição). */
export interface ItemDoPedido {
  item: string
  codigoFornecedor: string
  descricaoFornecedor: string
  acabamento: string
  tamanho: string
  /** TEXTO, não número: a grade é editável e `1,` viraria `1` no meio da digitação. */
  quantidade: string
  unidade: string
  valorUnitarioCentavos: number | null
  descontoPercentual: number | null
  grupoProduto: string
  tipoPeca: string
  fornecedor: string
  ambiente: string
}

/** O documento como o FORMULÁRIO o edita. */
export interface PedidoDeVenda {
  id: string
  numero: string
  serie: string
  numeroPasta: string
  dataEmissao: string | null
  dataFechamento: string | null
  clienteId: string
  cliente: string
  descricaoObra: string
  /** Elo com a obra — leitura e reescrita; a tela ainda não tem o campo. */
  obraId: string | null
  obra: string | null
  consultorId: string | null
  consultor: string | null
  profissionalId: string | null
  profissionalExterno: string | null
  /** `active` · `concluded` · `cancelled` — muda por caminho próprio, nunca por `PUT`. */
  situacao: OrderDetailDto['status']
  /** `sale` ou `demo`. Demonstração sai do estoque como empréstimo e tem de voltar. */
  tipo: 'sale' | 'demo'
  prazoDemonstracao: string | null
  /** Quando a peça voltou — carimbo de `POST .../demo-return`. Nulo = está na rua. */
  retornoDemonstracao: string | null
  orcamentoOrigemId: string | null
  orcamentoOrigemNumero: string | null
  modoDesconto: ModoDesconto
  descontoPercentual: number
  /** Desconto por GRUPO — a tela não o edita e o preserva; ver `paraEscrita`. */
  descontosPorGrupo: OrderGroupDiscountDto[]
  ambientes: { codigo: string; nome: string; ordem: number }[]
  condicaoPagamentoId: string | null
  condicaoPagamento: string | null
  parcelas: DocumentInstallmentDto[]
  politicaDeParcelamento?: InstallmentPolicyDto
  /** Serviços do documento — mesma preservação dos descontos por grupo. */
  servicos: OrderServiceItemDto[]
  itens: ItemDoPedido[]
}

/**
 * Documento novo. Id e número são do SERVIDOR — nascem vazios, e é o id vazio
 * que faz `useGravarPedidoDeVenda` escolher `POST` em vez de `PUT`.
 */
export function pedidoDeVendaVazio(): PedidoDeVenda {
  return {
    id: '',
    numero: '',
    serie: '',
    numeroPasta: '',
    dataEmissao: null,
    dataFechamento: null,
    clienteId: '',
    cliente: '',
    descricaoObra: '',
    obraId: null,
    obra: null,
    consultorId: null,
    consultor: null,
    profissionalId: null,
    profissionalExterno: null,
    situacao: 'active',
    tipo: 'sale',
    prazoDemonstracao: null,
    retornoDemonstracao: null,
    orcamentoOrigemId: null,
    orcamentoOrigemNumero: null,
    modoDesconto: 'PRODUTO',
    descontoPercentual: 0,
    descontosPorGrupo: [],
    ambientes: [],
    condicaoPagamentoId: null,
    condicaoPagamento: null,
    parcelas: [],
    servicos: [],
    itens: [],
  }
}

/** `OrderDetailDto` → a forma que o formulário edita. */
export function paraPedidoDeVenda(dto: OrderDetailDto): PedidoDeVenda {
  return {
    id: dto.id,
    numero: dto.number,
    serie: dto.series ?? '',
    numeroPasta: dto.folderNumber ?? '',
    dataEmissao: dto.issuedAt ?? null,
    dataFechamento: dto.closedAt ?? null,
    clienteId: dto.customerId,
    cliente: dto.customerName,
    descricaoObra: dto.projectName ?? '',
    obraId: dto.workId ?? null,
    obra: dto.workName ?? null,
    consultorId: dto.salespersonId ?? null,
    consultor: dto.salespersonName ?? null,
    profissionalId: dto.professionalId ?? null,
    profissionalExterno: dto.professionalName ?? null,
    situacao: dto.status,
    tipo: dto.type === 'demo' ? 'demo' : 'sale',
    prazoDemonstracao: dto.demoDueDate ?? null,
    retornoDemonstracao: dto.demoReturnedAt ?? null,
    orcamentoOrigemId: dto.quoteId ?? null,
    orcamentoOrigemNumero: dto.quoteNumber ?? null,
    modoDesconto: MODO_DO_CONTRATO[dto.discountMode] ?? 'PRODUTO',
    descontoPercentual: dto.discountPercent,
    descontosPorGrupo: dto.groupDiscounts ?? [],
    // Coleção própria, não derivada dos itens: é ela que guarda o nome
    // CONGELADO na emissão, e ambiente sem item nenhum é estado legítimo que
    // derivação nenhuma consegue representar.
    ambientes: (dto.environments ?? []).map((a) => ({
      codigo: a.code,
      nome: a.name,
      ordem: a.order,
    })),
    condicaoPagamentoId: dto.paymentTermId ?? null,
    condicaoPagamento: dto.paymentTermName ?? null,
    parcelas: dto.paymentInstallments ?? [],
    ...(dto.installmentPolicy ? { politicaDeParcelamento: dto.installmentPolicy } : {}),
    servicos: dto.serviceItems ?? [],
    itens: (dto.items ?? []).map((item) => ({
      item: String(item.lineNumber),
      codigoFornecedor: item.supplierCode ?? '',
      descricaoFornecedor: item.supplierDescription ?? item.description,
      acabamento: item.finish ?? '',
      tamanho: item.size ?? '',
      quantidade: String(item.quantity),
      unidade: item.unit ?? '',
      valorUnitarioCentavos: item.unitPriceCents,
      descontoPercentual: item.discountPercent,
      grupoProduto: item.productGroup ?? '',
      tipoPeca: item.pieceType ?? '',
      fornecedor: item.supplierName ?? '',
      ambiente: item.environmentCode ?? '',
    })),
  }
}

/**
 * A forma da tela → o corpo de escrita.
 *
 * **Sem `number`, `status` nem `totalCents`:** os três são do servidor — número
 * é sequência, situação muda por `/cancel` e `/conclude`, e total que o cliente
 * manda é total que diverge do item na primeira arredondada.
 *
 * **O que a tela NÃO edita, ela REENVIA.** `serviceItems`, `groupDiscounts` e
 * `workId` atravessam o formulário sem campo nenhum, e é o `PUT` integral que
 * torna isso obrigatório: corpo sem eles é documento sem eles. Não é hipótese —
 * é a falha exata que o bloco Pagamento pagou uma vez, quando abrir um
 * orçamento com plano e clicar em `Gravar` APAGAVA a condição, com 200 e sem
 * aviso. `groupDiscounts` é o caso caro: no legado são ~8 grupos por documento
 * (300.337 linhas para 37.707 vendas), e perdê-los muda o valor do documento
 * sem erro em lugar nenhum.
 *
 * **Os campos calculados do serviço não sobem.** `OrderServiceItemDto` traz
 * `electricianAmountCents` e `totalCents`, que a escrita não aceita: são conta
 * do servidor, e reenviá-los deixaria o cliente propor um total próprio.
 *
 * **`demoDueDate` só viaja em demonstração.** Em `sale` o contrato manda `null`,
 * e um prazo de retorno pendurado num pedido de venda é prazo que nunca vence
 * porque nada o consulta.
 */
export function paraEscrita(p: PedidoDeVenda): OrderWriteRequest {
  const conhecido = new Set(p.ambientes.map((a) => a.codigo))
  const codigoDoItem = (item: ItemDoPedido) =>
    item.ambiente && conhecido.has(item.ambiente) ? item.ambiente : null
  const ehDemonstracao = p.tipo === 'demo'

  return {
    series: p.serie || null,
    issuedAt: p.dataEmissao,
    customerId: p.clienteId,
    projectName: p.descricaoObra || null,
    workId: p.obraId,
    folderNumber: p.numeroPasta || null,
    closedAt: p.dataFechamento,
    type: p.tipo,
    demoDueDate: ehDemonstracao ? p.prazoDemonstracao : null,
    salespersonId: p.consultorId,
    professionalId: p.profissionalId,
    discountMode: MODO_PARA_CONTRATO[p.modoDesconto],
    // Zero fora do modo GERAL — é o que o contrato descreve para os outros dois
    // ("documento e linhas ficam em zero"), e mandar o percentual guardado
    // faria o servidor aplicar um desconto que a tela não está mostrando.
    discountPercent: p.modoDesconto === 'GERAL' ? p.descontoPercentual : 0,
    groupDiscounts: p.descontosPorGrupo.map((g) => ({
      productGroupId: g.productGroupId,
      discountPercent: g.discountPercent,
    })),
    paymentTermId: p.condicaoPagamentoId,
    environments: p.ambientes.map((a) => ({ code: a.codigo, name: a.nome, order: a.ordem })),
    serviceItems: p.servicos.map((s) => ({
      lineNumber: s.lineNumber,
      environmentCode: s.environmentCode ?? null,
      serviceId: s.serviceId ?? null,
      description: s.description,
      quantity: s.quantity,
      unitPriceCents: s.unitPriceCents,
      discountPercent: s.discountPercent,
      electricianPercent: s.electricianPercent,
    })),
    items: p.itens.map((item, i) => ({
      lineNumber: i + 1,
      environmentCode: codigoDoItem(item),
      // O item da grade fala a língua do FORNECEDOR e não aponta para o
      // catálogo. `null` é honesto — inventar um `variantId` casaria com
      // produto que não existe.
      variantId: null,
      description: item.descricaoFornecedor,
      finish: item.acabamento || null,
      size: item.tamanho || null,
      quantity: Number(String(item.quantidade).replace(',', '.')) || 0,
      unit: item.unidade || null,
      unitPriceCents: item.valorUnitarioCentavos ?? 0,
      discountPercent: item.descontoPercentual ?? 0,
      supplierId: null,
      supplierName: item.fornecedor || null,
      supplierCode: item.codigoFornecedor || null,
      supplierDescription: item.descricaoFornecedor || null,
      productGroup: item.grupoProduto || null,
      pieceType: item.tipoPeca || null,
    })),
  }
}

/**
 * O provider do registry.
 *
 * A LINHA e o DOCUMENTO são tipos diferentes, como no orçamento: a listagem
 * devolve o `OrderDto` CRU porque o `sortBy` que viaja é o `accessorKey` da
 * coluna e a whitelist do servidor é em inglês. `empty` é local — o backend não
 * fornece registro em branco, e "Incluir" não espera rede.
 */
export interface PedidosDeVendaProvider
  extends ListProvider<OrderDto>,
    DocumentoProvider<PedidoDeVenda> {}

export const pedidosDeVendaApi: PedidosDeVendaProvider = {
  ...createApiListProvider<OrderDto>({
    url: URL_PEDIDOS_VENDA,
    filtraveis: FILTRAVEIS_PEDIDO_VENDA,
  }),

  async get(id) {
    const resposta: RespostaDaApi = await getOrder(id)
    const dto = itemOuNulo<OrderDetailDto>(resposta, 'o pedido de venda')
    return dto ? paraPedidoDeVenda(dto) : null
  },

  empty: () => pedidoDeVendaVazio(),
}

/** As duas raízes de uma vez: gravar muda a linha da listagem E a folha. */
function useInvalidarPedidosDeVenda() {
  const cliente = useQueryClient()
  return () => {
    void cliente.invalidateQueries({ queryKey: CHAVES_PEDIDO_VENDA.raiz, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_PEDIDO_VENDA.detalhe, exact: false })
  }
}

async function criarPedidoDeVenda(corpo: OrderWriteRequest) {
  const resposta: RespostaDaApi = await createOrder(corpo)
  return dadosOuErro<OrderDetailDto>(resposta, 'Falha ao criar o pedido de venda.')
}

/**
 * `PUT` substitui o documento INTEIRO — itens, ambientes, serviços e descontos
 * por grupo junto. O corpo se monta a partir do registro que veio do servidor,
 * nunca só dos campos da tela: campo ausente é campo apagado.
 */
async function alterarPedidoDeVenda(id: string, corpo: OrderWriteRequest) {
  const resposta: RespostaDaApi = await updateOrder(id, corpo)
  return dadosOuErro<OrderDetailDto>(resposta, 'Falha ao gravar o pedido de venda.')
}

/**
 * O `Gravar` do formulário — UM hook que decide `POST` ou `PUT` pelo id.
 *
 * A decisão não pode morar na tela: seria a mesma escolha repetida em cada
 * chamador, com uma chance de errar por chamador. Documento novo nasce com `id`
 * vazio (`pedidoDeVendaVazio`), porque id e número são do servidor.
 */
export function useGravarPedidoDeVenda() {
  const invalidar = useInvalidarPedidosDeVenda()
  return useMutation({
    mutationFn: async (pedido: PedidoDeVenda) => {
      const corpo = paraEscrita(pedido)
      return pedido.id ? alterarPedidoDeVenda(pedido.id, corpo) : criarPedidoDeVenda(corpo)
    },
    onSuccess: (gravado) => {
      invalidar()
      // A tela que daria o aviso já está sendo desmontada quando o `Gravar`
      // navega, por isso a fila do aviso mora em estado de módulo.
      avisar('Pedido de venda gravado.', gravado.number ? `Nº ${gravado.number}` : undefined)
    },
  })
}

/**
 * Cancelar é verbo PRÓPRIO: documento cancela, não desativa.
 *
 * Caminho próprio no contrato (`POST /api/orders/{id}/cancel`) e **terminal** —
 * o contrato diz que cancelar de novo, ou cancelar concluído, é 409. É por isso
 * que a listagem confirma antes: a desativação de cadastro se desfaz pelo
 * `Alterar`, esta não se desfaz.
 *
 * ## O motivo é OPCIONAL, e isso é do contrato, não desleixo da tela
 *
 * `CancelDocumentRequest` inteiro é opcional: os 3.354 cancelamentos do legado
 * são, na maioria, sem motivo. Exigi-lo aqui reprovaria o gesto que o operador
 * já faz para ganhar um campo preenchido com o primeiro item da lista. Quando
 * ele escolhe, `reasonId` diz a CLASSE e `note` diz o caso.
 *
 * **Corpo vazio não é `{}` — é ausência.** Mandar `{reasonId: null, note: null}`
 * passaria igual hoje, mas é uma afirmação ("não teve motivo") onde a verdade é
 * silêncio, e o dia em que o servidor distinguir as duas o front estará mentindo.
 */
export function useCancelarPedidoDeVenda() {
  const invalidar = useInvalidarPedidosDeVenda()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: MotivoDoCancelamento }) => {
      const resposta: RespostaDaApi = await cancelOrder(id, corpoDoCancelamento(motivo))
      return dadosOuErro<OrderDetailDto>(resposta, 'Falha ao cancelar o pedido de venda.')
    },
    onSuccess: (cancelado) => {
      invalidar()
      avisar(
        `Pedido de venda ${cancelado.number} cancelado.`,
        'O documento continua na listagem, marcado como cancelado.',
      )
    },
  })
}

/**
 * CONCLUIR — `POST /api/orders/{id}/conclude`, a "Conclusão do Pedido de Venda"
 * do legado (`FrmFecha_projeto`, item 273 do menu Vendas).
 *
 * Sem corpo: a transição não tem parâmetro. Quem decide se ela pode acontecer é
 * o servidor, e ele recusa por dois motivos DIFERENTES, que a tela precisa
 * separar porque a saída de cada um é outra:
 *
 *   `transicao-invalida`     → já concluído ou cancelado; não há o que fazer.
 *   `demonstracao-em-aberto` → a peça ainda está na rua; registre o retorno
 *                              PRIMEIRO, e aí conclua.
 *
 * A segunda é acionável e a primeira não. Mostrar as duas como "não foi
 * possível concluir" faria o operador tentar de novo no caso em que tentar de
 * novo nunca vai funcionar — e desistir no caso em que faltava um clique.
 */
export function useConcluirPedidoDeVenda() {
  const invalidar = useInvalidarPedidosDeVenda()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await concludeOrder(id)
      return dadosOuErro<OrderDetailDto>(resposta, 'Falha ao concluir o pedido de venda.')
    },
    onSuccess: (concluido) => {
      invalidar()
      avisar(
        `Pedido de venda ${concluido.number} concluído.`,
        'A venda está fechada. A situação não volta para "Em andamento".',
      )
    },
  })
}

/**
 * RETORNO DA DEMONSTRAÇÃO — `POST /api/orders/{id}/demo-return`.
 *
 * A demonstração sai do estoque como EMPRÉSTIMO, com prazo (`demoDueDate`), e
 * tem de voltar. Este é o carimbo da volta, e é ele que destrava o `Concluir`:
 * o mesmo `demonstracao-em-aberto` que recusa a conclusão some quando
 * `demoReturnedAt` deixa de ser nulo.
 *
 * Recusa em pedido `sale` (não há o que devolver), em retorno repetido e em
 * pedido cancelado — os três como `transicao-invalida`.
 */
export function useRegistrarRetornoDaDemonstracao() {
  const invalidar = useInvalidarPedidosDeVenda()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await returnDemoOrder(id)
      return dadosOuErro<OrderDetailDto>(resposta, 'Falha ao registrar o retorno da demonstração.')
    },
    onSuccess: (pedido) => {
      invalidar()
      avisar(
        `Retorno registrado no pedido ${pedido.number}.`,
        'A peça voltou ao estoque. O pedido já pode ser concluído.',
      )
    },
  })
}

/**
 * TRANSFERÊNCIA DE VENDA ENTRE PROFISSIONAIS — `POST /api/orders/{id}/professional`.
 *
 * "Transferência de Venda entre Profissionais" é item PRÓPRIO do menu Vendas do
 * legado (179), e não uma edição do campo: trocar quem indicou muda a quem a
 * comissão pertence. Por isso a troca deixa TRILHA (`professional-history`) e
 * não passa pelo `PUT` — o `PUT` substituiria o campo sem deixar de onde veio.
 *
 * A `note` diz por quê. É o único lugar onde a razão da troca cabe, e é o que
 * responde "por que esta venda mudou de dono?" seis meses depois.
 */
export function useTransferirProfissional() {
  const invalidar = useInvalidarPedidosDeVenda()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      profissionalId,
      observacao,
    }: { id: string; profissionalId: string; observacao?: string }) => {
      const resposta: RespostaDaApi = await transferOrderProfessional(id, {
        professionalId: profissionalId,
        note: observacao?.trim() ? observacao.trim() : null,
      })
      return dadosOuErro<OrderDetailDto>(resposta, 'Falha ao transferir a venda.')
    },
    onSuccess: (pedido) => {
      invalidar()
      // A trilha tem chave PRÓPRIA: ela cresce a cada troca e a folha do
      // documento não a carrega. Invalidar só o pedido deixaria o histórico
      // aberto na tela mostrando o estado de antes da troca que acabou de sair.
      void cliente.invalidateQueries({ queryKey: CHAVES_PEDIDO_VENDA.historico, exact: false })
      // A PARTICIPAÇÃO também: a transferência troca o profissional PRINCIPAL
      // da grade, e é a única operação desta fronteira que mexe nela. Sem esta
      // linha o painel continuaria mostrando quem saiu, ao lado de um cabeçalho
      // já atualizado — a divergência que o contrato chama de "trilha que mente".
      void cliente.invalidateQueries({ queryKey: CHAVES_PEDIDO_VENDA.participacao, exact: false })
      avisar(
        `Venda ${pedido.number} transferida.`,
        pedido.professionalName
          ? `A indicação agora é de ${pedido.professionalName}.`
          : 'A indicação foi trocada.',
      )
    },
  })
}

/**
 * A TRILHA da indicação — `GET /api/orders/{id}/professional-history`.
 *
 * Lista paginada de atribuições, cada uma com início, fim e a nota da troca. É
 * leitura de auditoria: só é buscada quando alguém abre o histórico, por isso
 * `enabled`.
 */
export function useHistoricoDeProfissional(id: string, habilitado: boolean) {
  return useQuery({
    queryKey: CHAVES_PEDIDO_VENDA.historicoDe(id),
    enabled: habilitado && Boolean(id),
    queryFn: async () => {
      const resposta: RespostaDaApi = await listOrderProfessionalHistory(id)
      return dadosOuErro<PagedResultOfOrderProfessionalAssignmentDto>(
        resposta,
        'Falha ao carregar o histórico de profissionais.',
      )
    },
  })
}

/**
 * A PARTICIPAÇÃO do pedido — `GET /api/orders/{id}/participants`.
 *
 * **É daqui que sai o `Consultor(a)` da folha.** O contrato diz que
 * `salespersonId` é o atendente `isPrincipal` desta lista, "não um segundo
 * lugar onde se grava" — e o campo do cabeçalho passou a ser leitura por causa
 * disso. A lista chega em UMA requisição, com as faixas embutidas em cada linha
 * (`OrderParticipantDto.tiers`).
 *
 * **Só LEITURA, e a ausência da escrita é decisão.** `ReplaceOrderParticipants`
 * existe no contrato e o backend a serve, mas gravar a grade exige o cadastro de
 * FAIXAS da pessoa (`/api/employees/{id}/commission-tiers`), que nenhuma tela
 * tem: o servidor copia o perfil de HOJE para dentro de cada linha nova, e
 * editar aqui sem ver o perfil seria decidir comissão às cegas. A grade
 * editável é a aba Participação do trilho de comissões (G8).
 */
export function useParticipantesDoPedido(id: string, habilitado = true) {
  return useQuery({
    queryKey: CHAVES_PEDIDO_VENDA.participacaoDe(id),
    enabled: habilitado && Boolean(id),
    queryFn: async () => {
      const resposta: RespostaDaApi = await listOrderParticipants(id)
      return dadosOuErro<PagedResultOfOrderParticipantDto>(
        resposta,
        'Falha ao carregar a participação do pedido.',
      )
    },
  })
}

/**
 * O atendente PRINCIPAL — quem responde por `salespersonId`.
 *
 * `undefined` quando não há nenhum, e a tela mostra o campo vazio. Escolher "o
 * primeiro da lista" inventaria um responsável, e responsável é quem recebe.
 */
export function atendentePrincipal(
  linhas: readonly OrderParticipantDto[] | undefined,
): OrderParticipantDto | undefined {
  return linhas?.find((p) => p.role === 'attendant' && p.isPrincipal)
}

/** O teto do contrato, reexportado para quem monta consulta sem paginar. */
export { PAGE_SIZE_MAX }
