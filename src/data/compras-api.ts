import type {
  PagedResultOfPurchaseArrivalRowDto,
  PagedResultOfPurchaseReplenishmentRowDto,
  PurchaseArrivalRowDto,
  PurchaseOrderDto,
  PurchaseOrderWriteRequest,
  PurchaseRequestDto,
  PurchaseRequestItemDto,
  PurchaseRequestWriteRequest,
} from '@/api/gerado'
import {
  cancelPurchaseOrder,
  cancelPurchaseRequest,
  createPurchaseOrder,
  createPurchaseRequest,
  getPurchaseArrivalForecast,
  getPurchaseOrder,
  getPurchaseRequest,
  getPurchaseStockReplenishment,
  listPurchaseRequests,
  reschedulePurchaseOrder,
  sendPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseRequest,
} from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
} from '@/data/api-provider'
import type { DocumentoProvider, ListProvider } from '@/data/provider'
import { avisar } from '@/lib/avisos'
import { formatQuantidade, parseQuantidade } from '@/lib/formatters'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DE COMPRAS — `/api/purchase-requests`, `/api/purchase-orders` e as
 * duas consultas de `/api/purchases/*`.
 *
 * As 14 operações estão no contrato desde a web#316 e o MSW as serve inteiras
 * (`src/mocks/api/compras.ts`). O que faltava era ESTA camada: até aqui as duas
 * telas de compra eram mock visual — schema Zod local com os nomes do legado
 * (`codigo`, `pedVenda`, `fornecedores: string[]`) e um `console.info` no lugar
 * da gravação. Nenhum campo do contrato tinha onde pousar, e por isso os cinco
 * eixos da fase C (navegação pedido↔ordem, reagendamento, faturamento mínimo
 * ecoado, vínculo com o pedido de venda, previsão de chegada) não existiam:
 * não é que estivessem mal desenhados, é que não havia dado para desenhar.
 *
 * ## Os dois documentos NÃO são o mesmo com outro nome
 *
 * O PEDIDO é a necessidade: N fornecedores, porque o fornecedor está na LINHA e
 * não no cabeçalho — a mesma necessidade se compra de vários. A ORDEM é o
 * combinado: UM fornecedor, e as linhas dela rastreiam de qual pedido vieram
 * (`sourceRequestId` + `sourceLineNumber`). Espelhar um no outro perderia
 * exatamente o que liga os dois.
 *
 * ## O que é do SERVIDOR e não sobe na escrita
 *
 * `number`, `status`, `subtotalCents`, `totalCents`, `sentAt`, `rescheduledAt`,
 * `minimumBillingCents` e todos os `*Name` ecoados. Situação muda por caminho
 * próprio (`/send`, `/reschedule`, `/cancel`); total que o cliente propõe é
 * total que diverge da linha na primeira arredondada; e o faturamento mínimo é
 * cópia CONGELADA do cadastro do fornecedor na emissão — reenviá-lo deixaria a
 * tela reescrever a régua contra a qual ela mesma é medida.
 */

export const URL_PEDIDOS_COMPRA = '/api/purchase-requests'
export const URL_ORDENS_COMPRA = '/api/purchase-orders'

/**
 * Whitelist de `sortBy` do pedido — a MESMA da descrição do contrato.
 *
 * `orderNumber` fica de fora por decisão do contrato: é eco do pedido de venda,
 * e ordenar por coluna de outra tabela transformaria a listagem em junção
 * obrigatória. Quem procura pelo pedido de venda usa `q`.
 */
export const ORDENAVEIS_PEDIDO_COMPRA: readonly string[] = [
  'number',
  'issuedAt',
  'status',
  'itemCount',
]

/**
 * A de `filters` é a do `sortBy` MAIS `supplierId` e `onlyOpenItems`.
 *
 * As duas respondem a pergunta que a ordenação não responde, e são o recorte de
 * trabalho de quem monta ordem: "os pedidos com linha deste fornecedor" e "só
 * os que ainda têm linha aberta".
 */
export const FILTRAVEIS_PEDIDO_COMPRA: readonly string[] = [
  ...ORDENAVEIS_PEDIDO_COMPRA,
  'supplierId',
  'onlyOpenItems',
]

/**
 * Whitelist de `sortBy` da ordem.
 *
 * `supplierName` fica fora por ser eco; `rescheduledAt` por um motivo próprio,
 * escrito no contrato: é nulo na maioria das linhas, e ordenar por coluna
 * majoritariamente nula agrupa o irrelevante numa ponta e parece defeito. Quem
 * quer as reagendadas usa a previsão de chegada, que já as marca.
 */
export const ORDENAVEIS_ORDEM_COMPRA: readonly string[] = [
  'number',
  'orderedAt',
  'sentAt',
  'expectedAt',
  'status',
  'totalCents',
]

export const FILTRAVEIS_ORDEM_COMPRA: readonly string[] = [...ORDENAVEIS_ORDEM_COMPRA, 'supplierId']

/** Whitelist da previsão de chegada. O padrão é `expectedAt` crescente. */
export const ORDENAVEIS_PREVISAO: readonly string[] = [
  'expectedAt',
  'sentAt',
  'purchaseOrderNumber',
  'daysLate',
]

/** Whitelist da reposição. O padrão é `qtySuggested` decrescente. */
export const ORDENAVEIS_REPOSICAO: readonly string[] = [
  'description',
  'qtyOnHand',
  'qtyAllocated',
  'qtyAvailable',
  'qtyOnOrder',
  'qtySuggested',
]

/**
 * Chaves de cache num lugar só — DUAS raízes por documento, como no pedido de
 * venda: a listagem (`…Dto` cru) e a folha (a forma que o formulário edita).
 *
 * `['pedido-compra']` NÃO é prefixo de `['pedidos-compra']`: a comparação do
 * TanStack é elemento a elemento, e invalidar só uma deixaria a outra parada.
 *
 * A PREVISÃO e a REPOSIÇÃO têm raiz própria e não são filhas de nenhuma das
 * duas: são consultas derivadas de ordens de VÁRIOS documentos, e pendurá-las
 * numa folha faria gravar um pedido derrubar (ou pior, não derrubar) o quadro
 * inteiro. Enviar uma ordem muda a previsão — por isso `useEnviarOrdemDeCompra`
 * invalida as duas raízes explicitamente.
 */
export const CHAVES_COMPRAS = {
  pedidos: ['pedidos-compra'] as const,
  pedido: ['pedido-compra'] as const,
  umPedido: (id: string) => ['pedido-compra', id] as const,
  ordens: ['ordens-compra'] as const,
  ordem: ['ordem-compra'] as const,
  umaOrdem: (id: string) => ['ordem-compra', id] as const,
  previsao: ['compras-previsao'] as const,
  reposicao: ['compras-reposicao'] as const,
}

/** O DESTINO da peça, na língua da tela. */
export type DestinoDaCompra = 'stock' | 'sale'

/** Uma linha do pedido de compra, como a grade a edita. */
export interface ItemDoPedidoDeCompra {
  /** 1-based e ESTÁVEL: é por ela que a ordem rastreia a origem da linha. */
  linha: number
  varianteId: string | null
  descricao: string
  acabamento: string
  tamanho: string
  unidade: string
  /** TEXTO, não número: a grade é editável e `1,` viraria `1` no meio da digitação. */
  quantidade: string
  destino: DestinoDaCompra
  fornecedorId: string
  fornecedor: string
  /** A linha do pedido de VENDA que originou esta. */
  linhaDoPedidoDeVenda: number | null
  /** A ordem que já levou esta linha — derivado, some no `PUT`. */
  ordemId: string | null
  ordemNumero: string | null
  /** `open` · `ordered` · `cancelled`. Da LINHA, não do documento. */
  situacao: PurchaseRequestItemDto['status']
  observacao: string
}

/** O pedido de compra como o FORMULÁRIO o edita. */
export interface PedidoDeCompra {
  id: string
  numero: string
  situacao: PurchaseRequestDto['status']
  dataEmissao: string | null
  /** O ELO com a venda: o pedido de venda que originou a compra. */
  pedidoVendaId: string | null
  pedidoVendaNumero: string | null
  clienteId: string | null
  cliente: string | null
  observacao: string
  itens: ItemDoPedidoDeCompra[]
}

/** Uma linha da ordem de compra. */
export interface ItemDaOrdemDeCompra {
  linha: number
  /** DE ONDE a linha veio — o par que amarra ordem e pedido. */
  pedidoOrigemId: string
  pedidoOrigemNumero: string
  linhaDeOrigem: number
  varianteId: string | null
  descricao: string
  acabamento: string
  tamanho: string
  unidade: string
  /** Pode ser MENOR que a do pedido: o fornecedor atende parcial. */
  quantidade: string
  custoUnitarioCentavos: number | null
  /** Calculado no servidor; a grade o mostra e nunca o envia. */
  totalCentavos: number
  destino: DestinoDaCompra
  grupoProdutoId: string | null
  grupoProduto: string | null
}

/** A ordem de compra como o FORMULÁRIO a edita. */
export interface OrdemDeCompra {
  id: string
  numero: string
  situacao: PurchaseOrderDto['status']
  fornecedorId: string
  fornecedor: string
  empresaCompradoraId: string
  empresaCompradora: string
  dataOrdem: string | null
  dataEnvio: string | null
  /** A promessa ORIGINAL. Congelada: reagendar não a reescreve. */
  dataPrevista: string | null
  /** A data REPROMETIDA, `null` na ordem nunca reagendada. */
  dataReagendada: string | null
  motivoDoReagendamento: string | null
  /** ECOADO do cadastro do fornecedor na emissão. A tela mede contra ele. */
  faturamentoMinimoCentavos: number | null
  transportadoraId: string | null
  transportadora: string | null
  condicaoPagamentoId: string | null
  condicaoPagamento: string | null
  /** Percentual com 4 casas implícitas (`10000` = 1%), como todo % da casa. */
  descontoPercentual: number
  acrescimoCentavos: number
  subtotalCentavos: number
  totalCentavos: number
  observacao: string
  itens: ItemDaOrdemDeCompra[]
}

/**
 * Documento novo. Id e número são do SERVIDOR — nascem vazios, e é o id vazio
 * que faz o hook de gravação escolher `POST` em vez de `PUT`.
 */
export function pedidoDeCompraVazio(): PedidoDeCompra {
  return {
    id: '',
    numero: '',
    situacao: 'open',
    dataEmissao: hojeISO(),
    pedidoVendaId: null,
    pedidoVendaNumero: null,
    clienteId: null,
    cliente: null,
    observacao: '',
    itens: [],
  }
}

export function ordemDeCompraVazia(): OrdemDeCompra {
  return {
    id: '',
    numero: '',
    situacao: 'draft',
    fornecedorId: '',
    fornecedor: '',
    empresaCompradoraId: '',
    empresaCompradora: '',
    dataOrdem: hojeISO(),
    dataEnvio: null,
    dataPrevista: null,
    dataReagendada: null,
    motivoDoReagendamento: null,
    faturamentoMinimoCentavos: null,
    transportadoraId: null,
    transportadora: null,
    condicaoPagamentoId: null,
    condicaoPagamento: null,
    descontoPercentual: 0,
    acrescimoCentavos: 0,
    subtotalCentavos: 0,
    totalCentavos: 0,
    observacao: '',
    itens: [],
  }
}

/** `yyyy-mm-dd` de hoje, no fuso local — data de emissão sugerida. */
function hojeISO(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

/** `PurchaseRequestDto` → a forma que o formulário edita. */
export function paraPedidoDeCompra(dto: PurchaseRequestDto): PedidoDeCompra {
  return {
    id: dto.id,
    numero: dto.number,
    situacao: dto.status,
    dataEmissao: dto.issuedAt ?? null,
    pedidoVendaId: dto.orderId ?? null,
    pedidoVendaNumero: dto.orderNumber ?? null,
    clienteId: dto.customerId ?? null,
    cliente: dto.customerName ?? null,
    observacao: dto.notes ?? '',
    itens: (dto.items ?? []).map((item) => ({
      linha: item.lineNumber,
      varianteId: item.variantId ?? null,
      descricao: item.description,
      acabamento: item.finish ?? '',
      tamanho: item.size ?? '',
      unidade: item.unit ?? '',
      quantidade: formatQuantidade(item.quantity),
      destino: item.destination,
      fornecedorId: item.supplierId,
      fornecedor: item.supplierName,
      linhaDoPedidoDeVenda: item.sourceOrderItemLine ?? null,
      ordemId: item.purchaseOrderId ?? null,
      ordemNumero: item.purchaseOrderNumber ?? null,
      situacao: item.status,
      observacao: item.notes ?? '',
    })),
  }
}

/**
 * A forma da tela → o corpo de escrita do pedido.
 *
 * **`lineNumber` sai da POSIÇÃO, não do que estava na linha.** É o que mantém a
 * numeração densa depois de excluir uma linha do meio — e a ordem de compra
 * rastreia a origem por esse número, então buraco na sequência viraria linha
 * órfã na ordem seguinte.
 *
 * **`purchaseOrderId`, `purchaseOrderNumber` e `status` não sobem.** Os três
 * são derivados: quem os escreve é a ordem que levou a linha. Mandá-los daqui
 * seria a tela afirmando que uma linha já foi atendida.
 */
export function paraEscritaDoPedido(p: PedidoDeCompra): PurchaseRequestWriteRequest {
  return {
    issuedAt: p.dataEmissao ?? hojeISO(),
    orderId: p.pedidoVendaId,
    notes: p.observacao || null,
    items: p.itens.map((item, i) => ({
      lineNumber: i + 1,
      variantId: item.varianteId,
      description: item.descricao,
      finish: item.acabamento || null,
      size: item.tamanho || null,
      unit: item.unidade || null,
      quantity: parseQuantidade(item.quantidade) ?? 0,
      destination: item.destino,
      supplierId: item.fornecedorId,
      sourceOrderItemLine: item.linhaDoPedidoDeVenda,
      notes: item.observacao || null,
    })),
  }
}

/** `PurchaseOrderDto` → a forma que o formulário edita. */
export function paraOrdemDeCompra(dto: PurchaseOrderDto): OrdemDeCompra {
  return {
    id: dto.id,
    numero: dto.number,
    situacao: dto.status,
    fornecedorId: dto.supplierId,
    fornecedor: dto.supplierName,
    empresaCompradoraId: dto.buyingTenantId,
    empresaCompradora: dto.buyingTenantName,
    dataOrdem: dto.orderedAt ?? null,
    dataEnvio: dto.sentAt ?? null,
    dataPrevista: dto.expectedAt ?? null,
    dataReagendada: dto.rescheduledAt ?? null,
    motivoDoReagendamento: dto.rescheduleReason ?? null,
    faturamentoMinimoCentavos: dto.minimumBillingCents ?? null,
    transportadoraId: dto.carrierId ?? null,
    transportadora: dto.carrierName ?? null,
    condicaoPagamentoId: dto.paymentTermId ?? null,
    condicaoPagamento: dto.paymentTermName ?? null,
    descontoPercentual: dto.discountPercent ?? 0,
    acrescimoCentavos: dto.surchargeCents ?? 0,
    subtotalCentavos: dto.subtotalCents,
    totalCentavos: dto.totalCents,
    observacao: dto.notes ?? '',
    itens: (dto.items ?? []).map((item) => ({
      linha: item.lineNumber,
      pedidoOrigemId: item.sourceRequestId,
      pedidoOrigemNumero: item.sourceRequestNumber,
      linhaDeOrigem: item.sourceLineNumber,
      varianteId: item.variantId ?? null,
      descricao: item.description,
      acabamento: item.finish ?? '',
      tamanho: item.size ?? '',
      unidade: item.unit ?? '',
      quantidade: formatQuantidade(item.quantity),
      custoUnitarioCentavos: item.unitCostCents,
      totalCentavos: item.totalCents,
      destino: item.destination,
      grupoProdutoId: item.productGroupId ?? null,
      grupoProduto: item.productGroupName ?? null,
    })),
  }
}

/**
 * A forma da tela → o corpo de escrita da ordem.
 *
 * **`sourceRequestId` e `sourceLineNumber` VIAJAM, e são obrigatórios.** Não é
 * eco: são o par que diz de qual linha de qual pedido esta veio, e é ele que o
 * servidor usa para marcar a linha do pedido como atendida. Perdê-los no `PUT`
 * integral desataria a amarração inteira, com 200.
 *
 * **`description`, `finish`, `size` e `unit` NÃO sobem** — o
 * `PurchaseOrderItemWriteRequest` não os aceita: eles são congelados a partir
 * da linha do pedido de origem. Mandar descrição daqui deixaria a ordem
 * descrever uma peça diferente da que foi pedida.
 */
export function paraEscritaDaOrdem(o: OrdemDeCompra): PurchaseOrderWriteRequest {
  return {
    supplierId: o.fornecedorId,
    buyingTenantId: o.empresaCompradoraId,
    orderedAt: o.dataOrdem ?? hojeISO(),
    expectedAt: o.dataPrevista,
    carrierId: o.transportadoraId,
    paymentTermId: o.condicaoPagamentoId,
    discountPercent: o.descontoPercentual,
    surchargeCents: o.acrescimoCentavos,
    notes: o.observacao || null,
    items: o.itens.map((item, i) => ({
      lineNumber: i + 1,
      sourceRequestId: item.pedidoOrigemId,
      sourceLineNumber: item.linhaDeOrigem,
      quantity: parseQuantidade(item.quantidade) ?? 0,
      unitCostCents: item.custoUnitarioCentavos ?? 0,
      productGroupId: item.grupoProdutoId,
    })),
  }
}

/**
 * O MÍNIMO que as duas contas de dinheiro precisam de uma linha.
 *
 * Estrutural e não `ItemDaOrdemDeCompra`: a grade guarda a linha com o destino
 * em português (é a célula `select` que exibe o texto que guarda), e exigir o
 * tipo inteiro obrigaria a tela a remontar cada linha só para somar — remontagem
 * que, feita à mão em dois lugares, é onde um dos dois esquece um campo.
 */
export interface LinhaComCusto {
  quantidade: string
  custoUnitarioCentavos: number | null
}

/**
 * O subtotal como a TELA o calcula, enquanto o documento não foi ao servidor.
 *
 * Existe porque o `subtotalCents` do DTO é do último `GET`: a linha que o
 * operador acabou de digitar não está nele, e a ordem que ainda não gravou não
 * tem DTO nenhum. É a única conta de dinheiro que este arquivo faz, e ela é de
 * EXIBIÇÃO — o total que vale é sempre o que o servidor devolve.
 */
export function subtotalDaOrdem(itens: readonly LinhaComCusto[]): number {
  return itens.reduce((soma, item) => {
    const quantidade = parseQuantidade(item.quantidade) ?? 0
    return soma + Math.round(quantidade * (item.custoUnitarioCentavos ?? 0))
  }, 0)
}

/**
 * Quanto falta para a ordem alcançar o faturamento mínimo do fornecedor.
 *
 * `null` quando não há mínimo cadastrado OU quando ele já foi alcançado — as
 * duas situações em que a tela não tem nada a dizer. **O acréscimo não entra na
 * conta**: o contrato diz que frete e taxa não contam para o mínimo, e somá-los
 * faria a tela liberar uma ordem que o servidor recusa com 409.
 */
export function faltaParaOMinimo(ordem: {
  faturamentoMinimoCentavos: number | null
  itens: readonly LinhaComCusto[]
}): number | null {
  if (ordem.faturamentoMinimoCentavos === null) return null
  const falta = ordem.faturamentoMinimoCentavos - subtotalDaOrdem(ordem.itens)
  return falta > 0 ? falta : null
}

/**
 * As linhas AINDA ABERTAS de um pedido, na forma de linha de ordem.
 *
 * É a ponte pedido → ordem: o botão "Gerar ordem de compra" leva as linhas
 * abertas do fornecedor escolhido, já com a origem amarrada. Linha `ordered`
 * fica de fora — o servidor a recusaria com `item-ja-em-ordem`, e oferecê-la na
 * tela seria montar uma ordem que só falha ao gravar.
 */
export function linhasAbertasParaOrdem(
  pedido: PedidoDeCompra,
  fornecedorId: string,
): ItemDaOrdemDeCompra[] {
  return pedido.itens
    .filter((item) => item.situacao === 'open' && item.fornecedorId === fornecedorId)
    .map((item, i) => ({
      linha: i + 1,
      pedidoOrigemId: pedido.id,
      pedidoOrigemNumero: pedido.numero,
      linhaDeOrigem: item.linha,
      varianteId: item.varianteId,
      descricao: item.descricao,
      acabamento: item.acabamento,
      tamanho: item.tamanho,
      unidade: item.unidade,
      quantidade: item.quantidade,
      custoUnitarioCentavos: null,
      totalCentavos: 0,
      destino: item.destino,
      grupoProdutoId: null,
      grupoProduto: null,
    }))
}

/** Os fornecedores DISTINTOS que aparecem nas linhas abertas do pedido. */
export function fornecedoresComLinhaAberta(pedido: PedidoDeCompra): { id: string; nome: string }[] {
  const vistos = new Map<string, string>()
  for (const item of pedido.itens) {
    if (item.situacao === 'open' && !vistos.has(item.fornecedorId)) {
      vistos.set(item.fornecedorId, item.fornecedor)
    }
  }
  return [...vistos].map(([id, nome]) => ({ id, nome }))
}

export interface PedidosDeCompraProvider
  extends ListProvider<PurchaseRequestDto>,
    DocumentoProvider<PedidoDeCompra> {}

export const pedidosDeCompraApi: PedidosDeCompraProvider = {
  ...createApiListProvider<PurchaseRequestDto>({
    url: URL_PEDIDOS_COMPRA,
    filtraveis: FILTRAVEIS_PEDIDO_COMPRA,
  }),

  async get(id) {
    const resposta: RespostaDaApi = await getPurchaseRequest(id)
    const dto = itemOuNulo<PurchaseRequestDto>(resposta, 'o pedido de compra')
    return dto ? paraPedidoDeCompra(dto) : null
  },

  empty: () => pedidoDeCompraVazio(),
}

export interface OrdensDeCompraProvider
  extends ListProvider<PurchaseOrderDto>,
    DocumentoProvider<OrdemDeCompra> {}

export const ordensDeCompraApi: OrdensDeCompraProvider = {
  ...createApiListProvider<PurchaseOrderDto>({
    url: URL_ORDENS_COMPRA,
    filtraveis: FILTRAVEIS_ORDEM_COMPRA,
  }),

  async get(id) {
    const resposta: RespostaDaApi = await getPurchaseOrder(id)
    const dto = itemOuNulo<PurchaseOrderDto>(resposta, 'a ordem de compra')
    return dto ? paraOrdemDeCompra(dto) : null
  },

  empty: () => ordemDeCompraVazia(),
}

/**
 * As DUAS raízes do pedido, mais as duas consultas.
 *
 * A previsão entra porque uma linha de pedido cancelada some das ordens que a
 * esperavam; a reposição entra porque `qtySuggested` desconta o que já está em
 * ordem. Nenhuma das duas é filha da folha do documento, então invalidar só o
 * pedido deixaria as duas mostrando o quadro de antes.
 */
function useInvalidarPedidos() {
  const cliente = useQueryClient()
  return () => {
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.pedidos, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.pedido, exact: false })
  }
}

/**
 * Invalidar a ordem invalida TAMBÉM o pedido — e é obrigatório.
 *
 * Gravar uma ordem marca como `ordered` as linhas dos pedidos que ela levou.
 * Sem isto, o pedido aberto na outra aba continuaria oferecendo para ordenar
 * uma linha que acabou de sair, e a segunda ordem falharia com `item-ja-em-ordem`
 * num gesto que a tela tinha acabado de permitir.
 */
function useInvalidarOrdens() {
  const cliente = useQueryClient()
  return () => {
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.ordens, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.ordem, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.pedidos, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.pedido, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.previsao, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_COMPRAS.reposicao, exact: false })
  }
}

/**
 * O `Gravar` do pedido — UM hook que decide `POST` ou `PUT` pelo id.
 *
 * A decisão não pode morar na tela: seria a mesma escolha repetida em cada
 * chamador, com uma chance de errar por chamador.
 */
export function useGravarPedidoDeCompra() {
  const invalidar = useInvalidarPedidos()
  return useMutation({
    mutationFn: async (pedido: PedidoDeCompra) => {
      const corpo = paraEscritaDoPedido(pedido)
      const resposta: RespostaDaApi = pedido.id
        ? await updatePurchaseRequest(pedido.id, corpo)
        : await createPurchaseRequest(corpo)
      return dadosOuErro<PurchaseRequestDto>(resposta, 'Falha ao gravar o pedido de compra.')
    },
    onSuccess: (gravado) => {
      invalidar()
      avisar('Pedido de compra gravado.', gravado.number ? `Nº ${gravado.number}` : undefined)
    },
  })
}

/**
 * CANCELAR o pedido — `POST /api/purchase-requests/{id}/cancel`.
 *
 * Terminal, e recusa quando alguma linha já foi levada por ordem: o documento
 * que virou compromisso com o fornecedor não se apaga por aqui. O `detail` do
 * servidor é o que a tela mostra, porque é ele que diz QUAL linha travou.
 */
export function useCancelarPedidoDeCompra() {
  const invalidar = useInvalidarPedidos()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await cancelPurchaseRequest(id)
      return dadosOuErro<PurchaseRequestDto>(resposta, 'Falha ao cancelar o pedido de compra.')
    },
    onSuccess: (cancelado) => {
      invalidar()
      avisar(
        `Pedido de compra ${cancelado.number} cancelado.`,
        'O documento continua na listagem, marcado como cancelado.',
      )
    },
  })
}

export function useGravarOrdemDeCompra() {
  const invalidar = useInvalidarOrdens()
  return useMutation({
    mutationFn: async (ordem: OrdemDeCompra) => {
      const corpo = paraEscritaDaOrdem(ordem)
      const resposta: RespostaDaApi = ordem.id
        ? await updatePurchaseOrder(ordem.id, corpo)
        : await createPurchaseOrder(corpo)
      return dadosOuErro<PurchaseOrderDto>(resposta, 'Falha ao gravar a ordem de compra.')
    },
    onSuccess: (gravada) => {
      invalidar()
      avisar('Ordem de compra gravada.', gravada.number ? `Nº ${gravada.number}` : undefined)
    },
  })
}

/**
 * ENVIAR — `POST /api/purchase-orders/{id}/send`.
 *
 * É a transição que torna a ordem um compromisso: depois dela o `PUT` é 409
 * (`ordem-ja-enviada`), porque o fornecedor já tem o documento na mão. É também
 * o que faz a ordem aparecer na previsão de chegada e contar em `qtyOnOrder` —
 * ordem `draft` não entra em nenhuma das duas, e é por isso que este hook
 * invalida as consultas.
 *
 * `sentAt` opcional: omitido, o servidor carimba a data de hoje. A tela só o
 * manda quando o comprador registra um envio que aconteceu ontem.
 */
export function useEnviarOrdemDeCompra() {
  const invalidar = useInvalidarOrdens()
  return useMutation({
    mutationFn: async ({ id, dataEnvio }: { id: string; dataEnvio?: string | null }) => {
      const resposta: RespostaDaApi = await sendPurchaseOrder(id, {
        sentAt: dataEnvio ?? null,
      })
      return dadosOuErro<PurchaseOrderDto>(resposta, 'Falha ao enviar a ordem de compra.')
    },
    onSuccess: (ordem) => {
      invalidar()
      avisar(
        `Ordem ${ordem.number} enviada ao fornecedor.`,
        'A partir daqui ela entra na previsão de chegada e não se reescreve — só se reagenda.',
      )
    },
  })
}

/**
 * REAGENDAR — `POST /api/purchase-orders/{id}/reschedule`.
 *
 * A data reprometida vai para `rescheduledAt` e **a promessa original fica onde
 * está**: é a comparação entre as duas que mede o fornecedor, e sobrescrever
 * `expectedAt` apagaria o atraso no ato de registrá-lo.
 *
 * Duas recusas, e as duas são de DESENHO, não de erro do operador:
 * só ordem ENVIADA se reagenda (a `draft` se corrige pelo `PUT`), e ordem sem
 * data prometida não ganha data por aqui — `ck_purchase_orders_reagenda_o_prometido`
 * exige promessa original. A segunda é um beco conhecido: ordem enviada sem
 * `expectedAt` não tem como ganhar uma. Quem chama desabilita o gesto em vez de
 * deixar o operador descobrir pelo 409.
 */
export function useReagendarOrdemDeCompra() {
  const invalidar = useInvalidarOrdens()
  return useMutation({
    mutationFn: async ({
      id,
      dataPrevista,
      motivo,
    }: { id: string; dataPrevista: string; motivo: string }) => {
      const resposta: RespostaDaApi = await reschedulePurchaseOrder(id, {
        expectedAt: dataPrevista,
        reason: motivo,
      })
      return dadosOuErro<PurchaseOrderDto>(resposta, 'Falha ao reagendar a ordem de compra.')
    },
    onSuccess: (ordem) => {
      invalidar()
      avisar(
        `Ordem ${ordem.number} reagendada.`,
        'A promessa original continua registrada — é contra ela que o atraso é medido.',
      )
    },
  })
}

export function useCancelarOrdemDeCompra() {
  const invalidar = useInvalidarOrdens()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await cancelPurchaseOrder(id)
      return dadosOuErro<PurchaseOrderDto>(resposta, 'Falha ao cancelar a ordem de compra.')
    },
    onSuccess: (ordem) => {
      invalidar()
      avisar(
        `Ordem de compra ${ordem.number} cancelada.`,
        'As linhas dos pedidos voltam a ficar disponíveis para outra ordem.',
      )
    },
  })
}

/** O recorte da previsão de chegada, como a tela o monta. */
export interface FiltroDaPrevisao {
  q?: string
  fornecedorId?: string
  clienteId?: string
  destino?: DestinoDaCompra
  soAtrasadas?: boolean
  de?: string
  ate?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDesc?: boolean
}

/**
 * PREVISÃO DE CHEGADA — `GET /api/purchases/arrival-forecast`.
 *
 * A consulta que o comprador abre de manhã: o que foi enviado e ainda não
 * chegou, com a data VÁLIDA (a reagendada quando houve reagendamento) e os dias
 * de atraso já calculados pelo servidor.
 *
 * **Não é a listagem de ordens com filtro.** A linha aqui é o ITEM, não o
 * documento: uma ordem de dez peças com três em atraso aparece como três
 * linhas, e é assim que o comprador cobra o fornecedor — pelo que falta, não
 * pelo documento inteiro. É também por isso que ela não passa pelo registry de
 * providers: não tem tela de documento nem "Incluir".
 */
export function usePrevisaoDeChegada(filtro: FiltroDaPrevisao = {}) {
  return useQuery({
    queryKey: [...CHAVES_COMPRAS.previsao, filtro] as const,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getPurchaseArrivalForecast({
        ...(filtro.q ? { q: filtro.q } : {}),
        ...(filtro.fornecedorId ? { supplierId: filtro.fornecedorId } : {}),
        ...(filtro.clienteId ? { customerId: filtro.clienteId } : {}),
        ...(filtro.destino ? { destination: filtro.destino } : {}),
        ...(filtro.soAtrasadas ? { lateOnly: true } : {}),
        ...(filtro.de ? { from: filtro.de } : {}),
        ...(filtro.ate ? { to: filtro.ate } : {}),
        page: filtro.page ?? 1,
        pageSize: filtro.pageSize ?? 50,
        sortBy: filtro.sortBy ?? 'expectedAt',
        sortDesc: filtro.sortDesc ?? false,
      })
      return dadosOuErro<PagedResultOfPurchaseArrivalRowDto>(
        resposta,
        'Falha ao consultar a previsão de chegada.',
      )
    },
  })
}

/** O recorte da reposição. */
export interface FiltroDaReposicao {
  q?: string
  fornecedorId?: string
  depositoId?: string
  soAbaixoDoMinimo?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortDesc?: boolean
}

/**
 * COMPRAS PARA ESTOQUE — `GET /api/purchases/stock-replenishment`.
 *
 * `qtySuggested` já vem do servidor descontando o que está reservado
 * (`quantity_allocated` da 0035) e o que já vem em ordem ENVIADA. A tela não
 * refaz essa conta: refazê-la em TypeScript daria dois números para a mesma
 * pergunta, e o que diverge é sempre o da tela.
 */
export function useReposicaoDeEstoque(filtro: FiltroDaReposicao = {}) {
  return useQuery({
    queryKey: [...CHAVES_COMPRAS.reposicao, filtro] as const,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getPurchaseStockReplenishment({
        ...(filtro.q ? { q: filtro.q } : {}),
        ...(filtro.fornecedorId ? { supplierId: filtro.fornecedorId } : {}),
        ...(filtro.depositoId ? { locationId: filtro.depositoId } : {}),
        ...(filtro.soAbaixoDoMinimo ? { belowMinimumOnly: true } : {}),
        page: filtro.page ?? 1,
        pageSize: filtro.pageSize ?? 50,
        sortBy: filtro.sortBy ?? 'qtySuggested',
        sortDesc: filtro.sortDesc ?? true,
      })
      return dadosOuErro<PagedResultOfPurchaseReplenishmentRowDto>(
        resposta,
        'Falha ao consultar as compras para estoque.',
      )
    },
  })
}

/**
 * Os PEDIDOS com linha aberta de um fornecedor — a matéria-prima da ordem.
 *
 * `onlyOpenItems` é o recorte de trabalho do comprador: o pedido totalmente
 * atendido não some da listagem geral, mas não atrapalha esta tela. `enabled`
 * porque só faz sentido depois de escolhido o fornecedor — sem ele a consulta
 * traria todos os pedidos abertos da empresa, que é uma lista que ninguém pediu.
 */
export function usePedidosComLinhaAberta(fornecedorId: string, habilitado = true) {
  return useQuery({
    queryKey: [...CHAVES_COMPRAS.pedidos, 'abertos', fornecedorId] as const,
    enabled: habilitado && Boolean(fornecedorId),
    queryFn: async () => {
      const resposta: RespostaDaApi = await listPurchaseRequests({
        supplierId: fornecedorId,
        onlyOpenItems: true,
        page: 1,
        pageSize: PAGE_SIZE_MAX,
        sortBy: 'issuedAt',
        sortDesc: false,
      })
      const pagina = dadosOuErro<{ rows?: PurchaseRequestDto[]; total?: number }>(
        resposta,
        'Falha ao consultar os pedidos de compra em aberto.',
      )
      return (pagina.rows ?? []).map(paraPedidoDeCompra)
    },
  })
}

/** Uma linha da previsão, como veio — a tela não a traduz. */
export type LinhaDaPrevisao = PurchaseArrivalRowDto

export { PAGE_SIZE_MAX }

/**
 * O DESTINO em português, para o combo da grade.
 *
 * Mora aqui, e não em `tabelas.ts`, porque é TRADUÇÃO de um enum do contrato e
 * não tabela de apoio: `stock`/`sale` é o eixo que decide se a peça repõe o
 * galpão ou é encomenda de um cliente, e as duas telas de compra o leem. Solto
 * em cada feature, seriam dois vocabulários para o mesmo enum — e o dia em que
 * um deles ganhasse um terceiro rótulo, a outra tela gravaria `stock` calada.
 */
export const DESTINO_ROTULO: Record<DestinoDaCompra, string> = {
  stock: 'Estoque',
  sale: 'Venda',
}

export const ROTULOS_DE_DESTINO: readonly string[] = Object.values(DESTINO_ROTULO)

/** Inversa da `DESTINO_ROTULO`. Rótulo desconhecido cai em `stock` — fecha, não abre. */
export function destinoDoRotulo(rotulo: string): DestinoDaCompra {
  return rotulo === DESTINO_ROTULO.sale ? 'sale' : 'stock'
}

/** A SITUAÇÃO da linha do pedido, em português. */
export const SITUACAO_DA_LINHA: Record<ItemDoPedidoDeCompra['situacao'], string> = {
  open: 'Em aberto',
  ordered: 'Em ordem',
  cancelled: 'Cancelada',
}

/** A SITUAÇÃO do pedido de compra, em português. */
export const SITUACAO_DO_PEDIDO: Record<PedidoDeCompra['situacao'], string> = {
  open: 'Em aberto',
  partially_ordered: 'Parcialmente em ordem',
  ordered: 'Em ordem',
  cancelled: 'Cancelado',
}

/** A SITUAÇÃO da ordem de compra, em português. */
export const SITUACAO_DA_ORDEM: Record<OrdemDeCompra['situacao'], string> = {
  draft: 'Em montagem',
  sent: 'Enviada',
  cancelled: 'Cancelada',
}
