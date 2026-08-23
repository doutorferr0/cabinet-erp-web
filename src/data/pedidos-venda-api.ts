import type {
  DocumentInstallmentDto,
  InstallmentPolicyDto,
  OrderDetailDto,
  OrderDto,
  OrderGroupDiscountDto,
  OrderServiceItemDto,
  OrderWriteRequest,
} from '@/api/gerado'
import { cancelOrder, createOrder, getOrder, updateOrder } from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  createApiListProvider,
  dadosOuErro,
  itemOuNulo,
} from '@/data/api-provider'
import type { DocumentoProvider, ListProvider } from '@/data/provider'
import { avisar } from '@/lib/avisos'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DO PEDIDO DE VENDA — `/api/orders`.
 *
 * O caminho está no contrato e o backend serve SEIS das dez operações
 * (`ListOrders`, `GetOrder`, `CreateOrder`, `UpdateOrder`, `CancelOrder`,
 * `CreateOrderFromQuote`); as outras quatro respondem **501**. O menu já
 * declarava a tela como `futuro: true` — "Ainda não existe. O orçamento fechado
 * vira pedido aqui" — e nenhum arquivo fora de `src/api/gerado/` mencionava
 * `/api/orders`. Esta é a primeira fronteira a consumi-lo.
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
  /** Quando a peça voltou — carimbo de `POST .../demo-return`, que o backend ainda não serve. */
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
 */
export function useCancelarPedidoDeVenda() {
  const invalidar = useInvalidarPedidosDeVenda()
  return useMutation({
    mutationFn: async (id: string) => {
      const resposta: RespostaDaApi = await cancelOrder(id)
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

/** O teto do contrato, reexportado para quem monta consulta sem paginar. */
export { PAGE_SIZE_MAX }
