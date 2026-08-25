import type {
  PurchaseArrivalRowDto,
  PurchaseOrderDto,
  PurchaseOrderItemDto,
  PurchaseOrderRescheduleRequest,
  PurchaseOrderSendRequest,
  PurchaseOrderWriteRequest,
  PurchaseReplenishmentRowDto,
  PurchaseRequestDto,
  PurchaseRequestItemDto,
  PurchaseRequestWriteRequest,
} from '@/api/gerado'
import { diaLocalISO } from '@/lib/datas'
import { http, HttpResponse } from 'msw'
import { verificarEscrita } from './permissao'
import {
  TIPO,
  camposInvalidos,
  conflito,
  naoEncontrado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { TENANT_MATRIZ, novoId, store } from './store'

/**
 * O "backend" de COMPRAS no modo mock — pedido de compra, ordem de compra e as
 * duas consultas do módulo (contrato G2, comparativo Softlux vol. 03).
 *
 * As 14 operações estão em `contracts/openapi-v1.json` desde a #316 e **handler
 * nenhum as servia**. Não era esquecimento: `whitelist-do-contrato.test.ts`
 * nomeava as quatro listagens com o motivo — *"o mock não guarda qual linha já
 * foi levada por uma ordem"*. Este arquivo é esse estado. As entradas saíram do
 * inventário no mesmo commit, que é a regra daquela guarda.
 *
 * O buraco não era teórico: as 14 também estão em `FORA_DE_PROPOSITO` na
 * passagem (o `cabinet-erp-api` responde 501), então compras não tinha resposta
 * em NENHUM dos dois ambientes — nem no par local, nem em `cabinetonline.cc`,
 * que é 100% mock. Tela nenhuma podia ser construída contra isso.
 *
 * ## As três coisas que este mock existe para reproduzir
 *
 * 1. **O fornecedor está na LINHA do pedido, não no cabeçalho** (migração
 *    `0037`). É o oposto do pedido de venda, e é a decisão central do módulo: a
 *    necessidade de comprar chega misturada, e separar por fornecedor é
 *    trabalho da ORDEM. Sem isso não há o que agrupar, e a tela de montar ordem
 *    não teria função.
 * 2. **A ordem RESERVA a linha de pedido, e o cancelamento DEVOLVE.** É a razão
 *    de `cancel` ser operação própria: ordem cancelada que deixasse a linha
 *    marcada criaria necessidade órfã — peça que o cliente espera, que nenhuma
 *    ordem traz, e que nenhuma tela mostra como pendente.
 * 3. **O faturamento mínimo é N+1 contas, não uma.** Uma por grupo com mínimo
 *    próprio e uma geral contra todo o resto, sempre com o desconto aplicado e
 *    **sem** o acréscimo — frete não é mercadoria, e deixá-lo completar o mínimo
 *    faria o fornecedor recusar o faturamento que o servidor aprovou.
 *
 * ## O que ele NÃO reproduz, e está declarado
 *
 * O RECEBIMENTO. A cadeia do legado é pedido → ordem → envio → **recebimento**,
 * e o contrato para no envio: não há operação de dar entrada. Por isso
 * `qtyOnOrder` conta toda ordem enviada e nada nunca sai dessa conta — no
 * servidor de verdade quem a fecha é a nota de entrada, que ainda não existe em
 * caminho nenhum.
 */

/**
 * As whitelists de `sortBy` — CÓPIA da descrição do contrato, conferida por
 * igualdade em `src/data/whitelist-do-contrato.test.ts`.
 *
 * Não é zelo: o site público é 100% mock, então whitelist menor aqui é coluna
 * que ordena contra o `:3000` e responde 400 na demonstração — o defeito
 * aparece no clique do cabeçalho, nunca na suíte.
 */
export const ORDENAVEIS_PEDIDO_DE_COMPRA = ['number', 'issuedAt', 'status', 'itemCount']
export const ORDENAVEIS_ORDEM_DE_COMPRA = [
  'number',
  'orderedAt',
  'sentAt',
  'expectedAt',
  'status',
  'totalCents',
]
export const ORDENAVEIS_PREVISAO = ['expectedAt', 'sentAt', 'purchaseOrderNumber', 'daysLate']
export const ORDENAVEIS_REPOSICAO = [
  'description',
  'qtyOnHand',
  'qtyAllocated',
  'qtyAvailable',
  'qtyOnOrder',
  'qtySuggested',
]

/**
 * Nenhuma das quatro publica `filters`, e o contrato diz por quê no
 * `ListPurchaseRequests`: o recorte que a tela faz é por `status` e por
 * fornecedor, e os dois são parâmetro PRÓPRIO aqui. O filtro estruturado é
 * opt-in por recurso e cobra whitelist dos dois lados — uma lista de trabalho
 * com dois recortes conhecidos não precisa do vocabulário inteiro.
 *
 * Consequência prática, e é ela que este comentário guarda: `filters` que
 * chegue a qualquer um destes caminhos tem de ser **400**, não silêncio. Quem
 * apara em silêncio devolve a lista inteira com a condição desenhada no painel.
 */
const NAO_PUBLICA_FILTERS = 'Este recurso não publica o parâmetro filters.'

type Destino = 'stock' | 'sale'

/** A LINHA do pedido de compra, como o mock a guarda. */
interface LinhaDePedido {
  lineNumber: number
  variantId: string | null
  /** CONGELADA na emissão, como em `quote_items`: renomear produto não reescreve o que foi pedido. */
  description: string
  finish: string | null
  size: string | null
  /** Unidade de COMPRA, que pode não ser a de venda — o legado tem fator de conversão. */
  unit: string | null
  quantity: number
  destination: Destino
  supplierId: string
  sourceOrderItemLine: number | null
  notes: string | null
  /**
   * A ORDEM que levou esta linha — **o estado que faltava ao mock inteiro**.
   *
   * `null` = livre. É ele que decide `status` da linha, `status` do pedido, o
   * recorte `onlyOpenItems` e o 409 de `item-ja-em-ordem`. Guardado na linha e
   * não deduzido varrendo as ordens porque a dedução daria a mesma resposta com
   * um custo por página — e porque a `0038` o guarda assim do outro lado (o par
   * `source_request_id` + `source_line_number`, com o índice único parcial que a
   * `0057` corrigiu para que ordem cancelada devolva a linha).
   */
  purchaseOrderId: string | null
}

interface PedidoGuardado {
  id: string
  tenantId: string
  number: string
  issuedAt: string
  /** O pedido de VENDA que originou este. `null` no pedido de REPOSIÇÃO. */
  orderId: string | null
  notes: string | null
  /** Só `cancelled` é decisão de gente; os outros três estados são DERIVADOS. */
  cancelado: boolean
  itens: LinhaDePedido[]
}

/**
 * A LINHA da ordem. Copia da linha do pedido tudo o que descreve a peça, e o
 * contrato manda que seja assim: o `PurchaseOrderItemWriteRequest` traz só o par
 * de origem e o que foi negociado. Aceitar descrição do cliente deixaria a ordem
 * dizer que comprou uma peça e o pedido dizer que pediu outra, com o par intacto
 * entre as duas — que é o que torna o defeito invisível.
 */
interface LinhaDeOrdem {
  lineNumber: number
  sourceRequestId: string
  sourceLineNumber: number
  variantId: string | null
  description: string
  finish: string | null
  size: string | null
  unit: string | null
  quantity: number
  unitCostCents: number
  destination: Destino
  productGroupId: string | null
}

interface OrdemGuardada {
  id: string
  tenantId: string
  number: string
  status: 'draft' | 'sent' | 'cancelled'
  supplierId: string
  /** Qual empresa do grupo aparece como compradora. NÃO é o recorte de acesso. */
  buyingTenantId: string
  orderedAt: string
  sentAt: string | null
  expectedAt: string | null
  rescheduledAt: string | null
  rescheduleReason: string | null
  /** ECOADO na emissão: o fornecedor sobe o mínimo e a ordem antiga continua explicável. */
  minimumBillingCents: number | null
  carrierId: string | null
  paymentTermId: string | null
  /** Inteiro com 4 casas implícitas — `10000` = 1%, a escala da casa. */
  discountPercent: number
  surchargeCents: number
  notes: string | null
  itens: LinhaDeOrdem[]
}

interface Estado {
  pedidos: PedidoGuardado[]
  ordens: OrdemGuardada[]
}

/**
 * O PEDIDO DE VENDA visto de fora — o mínimo para a previsão de chegada
 * responder "quando chega a peça do cliente X", que é a pergunta que ela existe
 * para responder.
 *
 * **Existe porque `/api/orders` não tem handler no mock** (está nomeado assim em
 * `whitelist-do-contrato.test.ts`), e não porque compras queira ser dono do
 * pedido de venda. Some no dia em que o pedido ganhar o dele; até lá, `orderId`
 * que não estiver aqui resolve para `null` em vez de inventar cliente — a
 * escrita ACEITA o id assim mesmo, porque o mock não é a autoridade sobre um
 * recurso que ele não serve.
 */
const PEDIDOS_DE_VENDA_CONHECIDOS: Record<
  string,
  { number: string; customerId: string; customerName: string }
> = {
  'ped-0001': {
    number: '21646',
    customerId: 'parc-0003',
    customerName: 'CONSTRUTORA HORIZONTE SA',
  },
}

/**
 * O FORNECEDOR PADRÃO da variante — a quem a tela de reposição sugere pedir.
 *
 * Fora do store pelo mesmo motivo do bloco acima: `ProductVariantDto` não
 * publica fornecedor. A migração `0052` do `cabinet-erp-api` (produto
 * multi-fornecedor) já existe do outro lado e o contrato ainda não a expõe —
 * quando expuser, isto vira leitura da variante e o mapa sai daqui.
 */
const FORNECEDOR_PADRAO: Record<string, string> = {
  'var-0001': 'parc-0001',
  'var-0002': 'parc-0001',
  'var-0003': 'parc-0006',
}

/**
 * A RESERVA por (empresa, variante) — `stock_balances.quantity_allocated`, a
 * coluna que a migração `0035` criou.
 *
 * Mora aqui, e não em `store.saldos`, porque `StockBalanceDto` **não publica a
 * coluna**: acrescentá-la ao saldo guardado faria `GET
 * /api/variants/{id}/stock-balances` devolver uma chave que o contrato não
 * declara, e mock que devolve campo a mais ensina a tela a contar com o que o
 * servidor não manda. A reposição é hoje a única leitura que a expõe, e é dela
 * que o número sai.
 *
 * Sem ela a consulta seria saldo bruto com outro nome — e o comprador reporia
 * peça que já está prometida a um cliente que ainda não a levou.
 */
const RESERVA_POR_VARIANTE: { tenantId: string; variantId: string; qty: number }[] = [
  { tenantId: TENANT_MATRIZ, variantId: 'var-0001', qty: 3 },
  // As quatro peças douradas do saldo estão TODAS prometidas: disponível zero
  // com saldo quatro é exatamente o caso que a consulta existe para mostrar.
  { tenantId: TENANT_MATRIZ, variantId: 'var-0002', qty: 4 },
]

/**
 * Dia RELATIVO ao momento em que o mock roda.
 *
 * Datas fixas envelheceriam, e aqui o envelhecimento não é cosmético: a previsão
 * de chegada calcula `daysLate` contra HOJE, e `lateOnly` recorta por ele. Um
 * seed com `2026-09-30` gravado nasce "a chegar" e vira "atrasado" sozinho num
 * mês — a demonstração passa a mostrar um fornecedor em falta que ninguém criou,
 * e o teste que provava o caso NÃO-atrasado quebra sem nada ter mudado. É a
 * mesma razão pela qual a semente do dashboard já é relativa.
 */
function diaRelativo(deslocamento: number): string {
  const d = new Date()
  d.setDate(d.getDate() + deslocamento)
  return diaLocalISO(d)
}

function estadoInicial(): Estado {
  const pedidos: PedidoGuardado[] = [
    {
      id: 'pc-0001',
      tenantId: TENANT_MATRIZ,
      number: 'PC-7761',
      issuedAt: diaRelativo(-18),
      // REPOSIÇÃO: nasce do saldo, não de cliente nenhum.
      orderId: null,
      notes: null,
      cancelado: false,
      itens: [
        {
          lineNumber: 1,
          variantId: 'var-0002',
          description: 'PENDENTE VIDRO FUMÊ 30CM',
          finish: 'DOURADO',
          size: '30CM',
          unit: 'UN',
          quantity: 6,
          destination: 'stock',
          supplierId: 'parc-0001',
          sourceOrderItemLine: null,
          notes: null,
          purchaseOrderId: null,
        },
        {
          // A SEGUNDA linha é de OUTRO fornecedor, e é o ponto do seed: um
          // pedido com dois fornecedores é o caso normal, e é o que obriga a
          // ordem a existir como documento separado.
          lineNumber: 2,
          variantId: 'var-0003',
          description: 'ARANDELA ALUMÍNIO IP65',
          finish: 'BRANCO',
          size: 'ÚNICO',
          unit: 'UN',
          quantity: 10,
          destination: 'stock',
          supplierId: 'parc-0006',
          sourceOrderItemLine: null,
          notes: null,
          purchaseOrderId: 'oc-0002',
        },
      ],
    },
    {
      id: 'pc-0002',
      tenantId: TENANT_MATRIZ,
      number: 'PC-7762',
      issuedAt: diaRelativo(-17),
      orderId: 'ped-0001',
      notes: null,
      cancelado: false,
      itens: [
        {
          lineNumber: 1,
          variantId: 'var-0001',
          description: 'PENDENTE VIDRO FUMÊ 30CM',
          finish: 'PRETO FOSCO',
          size: '30CM',
          unit: 'UN',
          quantity: 4,
          // ENCOMENDA: tem pedido de venda e linha de origem, e o par é
          // obrigatório — `sale` sem a linha é reposição com um rótulo por cima.
          destination: 'sale',
          supplierId: 'parc-0001',
          sourceOrderItemLine: 1,
          notes: null,
          purchaseOrderId: 'oc-0001',
        },
      ],
    },
    {
      id: 'pc-0003',
      tenantId: TENANT_MATRIZ,
      number: 'PC-7763',
      issuedAt: diaRelativo(-16),
      orderId: null,
      notes: 'REPOSIÇÃO DE VITRINE',
      cancelado: false,
      itens: [
        {
          lineNumber: 1,
          variantId: 'var-0001',
          description: 'PENDENTE VIDRO FUMÊ 30CM',
          finish: 'PRETO FOSCO',
          size: '30CM',
          unit: 'UN',
          quantity: 2,
          destination: 'stock',
          supplierId: 'parc-0001',
          sourceOrderItemLine: null,
          notes: null,
          purchaseOrderId: null,
        },
      ],
    },
  ]

  const ordens: OrdemGuardada[] = [
    {
      id: 'oc-0001',
      tenantId: TENANT_MATRIZ,
      number: 'OC-5101',
      status: 'sent',
      supplierId: 'parc-0001',
      buyingTenantId: TENANT_MATRIZ,
      orderedAt: diaRelativo(-15),
      sentAt: diaRelativo(-15),
      // VENCIDA de propósito: sem uma linha atrasada, `lateOnly` e `daysLate`
      // ficam sem caso, e é o recorte de cobrança do comprador.
      expectedAt: diaRelativo(-8),
      rescheduledAt: null,
      rescheduleReason: null,
      minimumBillingCents: 250_000,
      carrierId: null,
      paymentTermId: null,
      discountPercent: 0,
      surchargeCents: 0,
      notes: null,
      itens: [
        {
          lineNumber: 1,
          sourceRequestId: 'pc-0002',
          sourceLineNumber: 1,
          variantId: 'var-0001',
          description: 'PENDENTE VIDRO FUMÊ 30CM',
          finish: 'PRETO FOSCO',
          size: '30CM',
          unit: 'UN',
          quantity: 4,
          unitCostCents: 120_000,
          destination: 'sale',
          productGroupId: null,
        },
      ],
    },
    {
      id: 'oc-0002',
      tenantId: TENANT_MATRIZ,
      number: 'OC-5102',
      status: 'sent',
      supplierId: 'parc-0006',
      buyingTenantId: TENANT_MATRIZ,
      orderedAt: diaRelativo(-13),
      sentAt: diaRelativo(-13),
      // REAGENDADA: as DUAS datas ficam, e é o ponto inteiro da operação —
      // sobrescrever `expectedAt` faria o fornecedor que atrasou três vezes
      // terminar com uma data cumprida.
      expectedAt: diaRelativo(9),
      rescheduledAt: diaRelativo(38),
      rescheduleReason: 'FORNECEDOR EM FÉRIAS COLETIVAS',
      minimumBillingCents: null,
      carrierId: null,
      paymentTermId: null,
      discountPercent: 50_000,
      surchargeCents: 18_000,
      notes: null,
      itens: [
        {
          lineNumber: 1,
          sourceRequestId: 'pc-0001',
          sourceLineNumber: 2,
          variantId: 'var-0003',
          description: 'ARANDELA ALUMÍNIO IP65',
          finish: 'BRANCO',
          size: 'ÚNICO',
          unit: 'UN',
          quantity: 10,
          unitCostCents: 29_000,
          destination: 'stock',
          productGroupId: null,
        },
      ],
    },
  ]

  return { pedidos, ordens }
}

let estado: Estado = estadoInicial()

/** Volta ao seed entre testes — o par do `resetQuotes`/`resetCrm`. */
export function resetCompras(): void {
  estado = estadoInicial()
}

// ---------------------------------------------------------------- derivações

/** Razão social do parceiro; cai no id quando ele sumiu, para a linha continuar legível. */
function nomeDeParceiro(id: string | null): string | null {
  if (!id) return null
  return store.parceiros.find((p) => p.id === id)?.legalName ?? id
}

function nomeDeApoio(id: string | null): string | null {
  if (!id) return null
  return store.lookups.find((l) => l.id === id)?.name ?? null
}

function fornecedorDoCadastro(id: string) {
  return store.parceiros.find((p) => p.id === id && p.isSupplier)
}

/**
 * O `status` do PEDIDO é DERIVADO das linhas — só `cancelled` é decisão de
 * gente. É a mesma regra da migração `0037`, que guarda a coluna por causa do
 * recorte da listagem e a recalcula a cada escrita de ordem.
 */
function statusDoPedido(pedido: PedidoGuardado): PurchaseRequestDto['status'] {
  if (pedido.cancelado) return 'cancelled'
  if (pedido.itens.length === 0) return 'open'
  const emOrdem = pedido.itens.filter((i) => i.purchaseOrderId !== null).length
  if (emOrdem === 0) return 'open'
  return emOrdem === pedido.itens.length ? 'ordered' : 'partially_ordered'
}

function ordemPorId(tenantId: string, id: string | null): OrdemGuardada | undefined {
  if (!id) return undefined
  return estado.ordens.find((o) => o.tenantId === tenantId && o.id === id)
}

function linhaDePedidoDto(pedido: PedidoGuardado, linha: LinhaDePedido): PurchaseRequestItemDto {
  const ordem = ordemPorId(pedido.tenantId, linha.purchaseOrderId)
  return {
    lineNumber: linha.lineNumber,
    variantId: linha.variantId,
    description: linha.description,
    finish: linha.finish,
    size: linha.size,
    unit: linha.unit,
    quantity: linha.quantity,
    destination: linha.destination,
    supplierId: linha.supplierId,
    supplierName: nomeDeParceiro(linha.supplierId) ?? '',
    sourceOrderItemLine: linha.sourceOrderItemLine,
    purchaseOrderId: linha.purchaseOrderId,
    purchaseOrderNumber: ordem?.number ?? null,
    status: pedido.cancelado ? 'cancelled' : linha.purchaseOrderId ? 'ordered' : 'open',
    notes: linha.notes,
  }
}

function pedidoDto(pedido: PedidoGuardado): PurchaseRequestDto {
  const venda = pedido.orderId ? PEDIDOS_DE_VENDA_CONHECIDOS[pedido.orderId] : undefined
  return {
    id: pedido.id,
    number: pedido.number,
    status: statusDoPedido(pedido),
    issuedAt: pedido.issuedAt,
    orderId: pedido.orderId,
    orderNumber: venda?.number ?? null,
    customerId: venda?.customerId ?? null,
    customerName: venda?.customerName ?? null,
    itemCount: pedido.itens.length,
    items: pedido.itens.map((linha) => linhaDePedidoDto(pedido, linha)),
    notes: pedido.notes,
  }
}

/** Total da LINHA de ordem. Derivado, nunca guardado — total recebido é total que diverge. */
function totalDaLinha(linha: LinhaDeOrdem): number {
  return Math.round(linha.quantity * linha.unitCostCents)
}

/** O desconto em centavos sobre uma base, na escala de 4 casas (`10000` = 1%). */
function descontoSobre(base: number, discountPercent: number): number {
  return Math.round((base * discountPercent) / 1_000_000)
}

function subtotalDaOrdem(ordem: OrdemGuardada): number {
  return ordem.itens.reduce((soma, linha) => soma + totalDaLinha(linha), 0)
}

function totalDaOrdem(ordem: OrdemGuardada): number {
  const subtotal = subtotalDaOrdem(ordem)
  return subtotal - descontoSobre(subtotal, ordem.discountPercent) + ordem.surchargeCents
}

/** A data VÁLIDA da ordem: a reagendada quando houve reagendamento. */
function dataValida(ordem: OrdemGuardada): string | null {
  return ordem.rescheduledAt ?? ordem.expectedAt
}

function linhaDeOrdemDto(ordem: OrdemGuardada, linha: LinhaDeOrdem): PurchaseOrderItemDto {
  const origem = estado.pedidos.find(
    (p) => p.tenantId === ordem.tenantId && p.id === linha.sourceRequestId,
  )
  return {
    lineNumber: linha.lineNumber,
    sourceRequestId: linha.sourceRequestId,
    sourceRequestNumber: origem?.number ?? '',
    sourceLineNumber: linha.sourceLineNumber,
    variantId: linha.variantId,
    description: linha.description,
    finish: linha.finish,
    size: linha.size,
    unit: linha.unit,
    quantity: linha.quantity,
    unitCostCents: linha.unitCostCents,
    totalCents: totalDaLinha(linha),
    destination: linha.destination,
    productGroupId: linha.productGroupId,
    productGroupName: nomeDeApoio(linha.productGroupId),
  }
}

function nomeDeEmpresa(id: string): string {
  return store.empresas.find((e) => e.tenantId === id)?.name ?? id
}

function ordemDto(ordem: OrdemGuardada): PurchaseOrderDto {
  return {
    id: ordem.id,
    number: ordem.number,
    status: ordem.status,
    supplierId: ordem.supplierId,
    supplierName: nomeDeParceiro(ordem.supplierId) ?? '',
    buyingTenantId: ordem.buyingTenantId,
    buyingTenantName: nomeDeEmpresa(ordem.buyingTenantId),
    orderedAt: ordem.orderedAt,
    sentAt: ordem.sentAt,
    expectedAt: ordem.expectedAt,
    rescheduledAt: ordem.rescheduledAt,
    rescheduleReason: ordem.rescheduleReason,
    minimumBillingCents: ordem.minimumBillingCents,
    carrierId: ordem.carrierId,
    carrierName: nomeDeParceiro(ordem.carrierId),
    paymentTermId: ordem.paymentTermId,
    paymentTermName:
      store.condicoesDePagamento.find(
        (c) => c.tenantId === ordem.tenantId && c.id === ordem.paymentTermId,
      )?.name ?? null,
    discountPercent: ordem.discountPercent,
    surchargeCents: ordem.surchargeCents,
    subtotalCents: subtotalDaOrdem(ordem),
    totalCents: totalDaOrdem(ordem),
    items: ordem.itens.map((linha) => linhaDeOrdemDto(ordem, linha)),
    notes: ordem.notes,
  }
}

// ------------------------------------------------------- faturamento mínimo

/**
 * As N+1 contas do faturamento mínimo, ou `undefined` quando a ordem passa.
 *
 * **Contra a soma das LINHAS com o desconto aplicado e SEM o acréscimo**, que é
 * o que o `POST` do contrato manda — e o oposto do que a descrição de
 * `totalCents` dizia até esta entrega (a frase foi corrigida no mesmo commit).
 * Frete e embalagem não são mercadoria: uma ordem de R$ 2.900 com R$ 150 de
 * frete passaria por R$ 3.050, e o fornecedor recusaria o faturamento que este
 * servidor aprovou.
 *
 * São N+1 e não uma: uma conta por grupo com mínimo próprio, e uma geral contra
 * todo o resto — as linhas sem grupo e as de grupo sem mínimo próprio. Uma conta
 * só deixaria o grupo caro cobrir a falta do grupo barato, que é justamente o
 * que o mínimo por grupo existe para impedir.
 */
function faltaFaturamentoMinimo(ordem: OrdemGuardada): string | undefined {
  const fornecedor = store.parceiros.find((p) => p.id === ordem.supplierId)
  if (!fornecedor) return undefined

  const liquido = (base: number) => base - descontoSobre(base, ordem.discountPercent)
  const comMinimoProprio = new Set(fornecedor.groupMinimums.map((g) => g.productGroupId))

  for (const grupo of fornecedor.groupMinimums) {
    const doGrupo = ordem.itens.filter((linha) => linha.productGroupId === grupo.productGroupId)
    // **A conta de um grupo só roda se a ordem TEM linha dele.** Sem isto, o
    // grupo configurado e ausente soma zero, zero é menor que o mínimo, e o
    // fornecedor que exige R$ 5.000 em luminárias recusaria uma ordem só de
    // perfil — recusaria, na prática, toda ordem que não fosse daquele grupo.
    // É o espelho do ramo que `faltasDeFaturamentoMinimo` do `cabinet-erp-api`
    // já tinha na conta GERAL ("só roda se sobrou linha para ela"), e a
    // divergência ficou invisível enquanto nenhum fornecedor do seed tinha
    // mínimo por grupo: o único caso que a exercitava escrevia o par direto no
    // store e sempre mandava uma linha daquele grupo junto.
    if (doGrupo.length === 0) continue
    const base = doGrupo.reduce((soma, linha) => soma + totalDaLinha(linha), 0)
    if (liquido(base) < grupo.minimumBillingCents) {
      return `O grupo ${nomeDeApoio(grupo.productGroupId) ?? grupo.productGroupId} não atinge o faturamento mínimo do fornecedor.`
    }
  }

  // O mínimo GERAL é o ECOADO na ordem, não o do cadastro de hoje: a validação
  // de ontem tem de continuar explicável depois que o fornecedor subir o dele.
  if (ordem.minimumBillingCents === null) return undefined
  const resto = ordem.itens
    .filter((linha) => !linha.productGroupId || !comMinimoProprio.has(linha.productGroupId))
    .reduce((soma, linha) => soma + totalDaLinha(linha), 0)
  if (liquido(resto) < ordem.minimumBillingCents) {
    return 'A ordem não atinge o faturamento mínimo do fornecedor.'
  }
  return undefined
}

// -------------------------------------------------------------- listagem

interface Consulta {
  q: string | null
  sortBy: string | null
  sortDesc: boolean
  page: number
  pageSize: number
  url: URL
}

function lerConsulta(url: URL): Consulta {
  return {
    q: url.searchParams.get('q'),
    sortBy: url.searchParams.get('sortBy'),
    sortDesc: url.searchParams.get('sortDesc') === 'true',
    page: Number(url.searchParams.get('page') ?? '1'),
    pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
    url,
  }
}

/**
 * Ordena, pagina e devolve `{rows,total}` — ou o 400 que o contrato manda.
 *
 * As três recusas são as do padrão da casa e nenhuma pode virar silêncio:
 * `sortBy` fora da whitelist, `pageSize` acima de 100, e `filters` num recurso
 * que não o publica. Aparar em silêncio faz quem pediu 500 e recebeu 100
 * concluir que só existem 100 registros.
 *
 * A comparação é NUMÉRICA quando os dois lados são número — `totalCents` como
 * texto poria 9.000 antes de 12.000 — e **nulo vai sempre para o fim**, nas duas
 * direções: `sentAt` e `daysLate` são nulos na maioria das linhas, e uma
 * ordenação que os jogue na frente parece defeito.
 */
function responder<T>(
  linhas: T[],
  consulta: Consulta,
  ordenaveis: readonly string[],
  padrao?: { campo: string; desc: boolean },
) {
  if (consulta.page < 1 || consulta.pageSize < 1 || consulta.pageSize > 100) {
    return problemaJson(
      400,
      'Paginação inválida: page é 1-based e pageSize vai até 100.',
      {},
      TIPO.paginacaoInvalida,
    )
  }
  if (consulta.sortBy && !ordenaveis.includes(consulta.sortBy)) {
    return problemaJson(400, `sortBy inválido: ${consulta.sortBy}.`, {}, TIPO.ordenacaoInvalida)
  }
  if (consulta.url.searchParams.get('filters')) {
    return problemaJson(400, NAO_PUBLICA_FILTERS, {}, TIPO.filtroInvalido)
  }

  const campo = consulta.sortBy ?? padrao?.campo
  const desc = consulta.sortBy ? consulta.sortDesc : (padrao?.desc ?? false)
  if (campo) {
    linhas.sort((a, b) => {
      // O acesso por chave é dinâmico de propósito — `campo` já passou pela
      // whitelist, que é o que decide se ele é legítimo. Interface gerada não
      // tem index signature, e exigi-la no genérico recusaria os quatro DTOs.
      const va = (a as Record<string, unknown>)[campo]
      const vb = (b as Record<string, unknown>)[campo]
      if (va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1
      if (vb === null || vb === undefined) return -1
      const ordem =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb))
      return desc ? -ordem : ordem
    })
  }

  const inicio = (consulta.page - 1) * consulta.pageSize
  return HttpResponse.json({
    rows: linhas.slice(inicio, inicio + consulta.pageSize),
    total: linhas.length,
  })
}

function casaTexto(q: string | null, campos: (string | null | undefined)[]): boolean {
  if (!q) return true
  const alvo = q.toLowerCase()
  return campos.some((texto) => (texto ?? '').toLowerCase().includes(alvo))
}

// --------------------------------------------------------------- validação

function fornecedorInvalido(supplierId: string, caminho: string) {
  if (!supplierId) return { path: caminho, message: 'Informe o fornecedor da linha.' }
  if (!fornecedorDoCadastro(supplierId)) {
    return { path: caminho, message: 'Este parceiro não é fornecedor.' }
  }
  return undefined
}

/**
 * Validação do pedido, comum ao `POST` e ao `PUT`.
 *
 * O par destino×origem é o que o contrato chama de 400 por escrito, e é o mesmo
 * CHECK da `0037` (`(destination = 'sale') = (source_order_item_line IS NOT
 * NULL)`): encomenda sem a venda que a encomendou é reposição com outro nome, e
 * reposição COM a linha é a mesma incoerência ao contrário.
 */
function pedidoInvalido(corpo: PurchaseRequestWriteRequest) {
  const fields: { path: string; message: string }[] = []
  if (!corpo.issuedAt) fields.push({ path: 'issuedAt', message: 'Informe a data de emissão.' })

  const vistas = new Set<number>()
  for (const [i, linha] of (corpo.items ?? []).entries()) {
    const base = `items[${i}]`
    if (vistas.has(linha.lineNumber)) {
      fields.push({ path: `${base}.lineNumber`, message: 'Número de linha repetido.' })
    }
    vistas.add(linha.lineNumber)

    if (!linha.description) {
      fields.push({ path: `${base}.description`, message: 'Informe a descrição da linha.' })
    }
    if (!(linha.quantity > 0)) {
      fields.push({ path: `${base}.quantity`, message: 'A quantidade tem de ser positiva.' })
    }
    const semFornecedor = fornecedorInvalido(linha.supplierId, `${base}.supplierId`)
    if (semFornecedor) fields.push(semFornecedor)

    const temOrigem = linha.sourceOrderItemLine !== null && linha.sourceOrderItemLine !== undefined
    if (linha.destination === 'sale') {
      if (!corpo.orderId) {
        fields.push({
          path: `${base}.destination`,
          message: 'Linha de encomenda exige o pedido de venda no cabeçalho.',
        })
      }
      if (!temOrigem) {
        fields.push({
          path: `${base}.sourceOrderItemLine`,
          message: 'Linha de encomenda exige a linha do pedido de venda.',
        })
      }
    } else if (temOrigem) {
      fields.push({
        path: `${base}.sourceOrderItemLine`,
        message: 'Linha de reposição não tem linha de pedido de venda.',
      })
    }
  }
  return fields.length > 0 ? camposInvalidos(fields) : undefined
}

/** 409 de documento já cancelado — o mesmo texto do orçamento e do pedido. */
function jaCancelado() {
  return problemaJson(409, 'Documento já está cancelado.', {}, TIPO.transicaoInvalida)
}

function proximoNumero(prefixo: string, existentes: string[]): string {
  const maior = existentes
    .map((n) => Number(n.replace(`${prefixo}-`, '')))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefixo}-${maior + 1}`
}

function daEmpresa<T extends { tenantId: string }>(linhas: T[], tenantId: string): T[] {
  return linhas.filter((l) => l.tenantId === tenantId)
}

// ---------------------------------------------------------------- handlers

export const handlersDeCompras = [
  // ------------------------------------------------ pedido de compra
  http.get('*/api/purchase-requests', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    // Sem empresa a LEITURA DE LISTA é vazia, não erro: a empresa vem da
    // SESSÃO, então "sem empresa" descreve o operador recém-criado.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const status = consulta.url.searchParams.get('status')
    const supplierId = consulta.url.searchParams.get('supplierId')
    const somenteAbertas = consulta.url.searchParams.get('onlyOpenItems') === 'true'

    const linhas = daEmpresa(estado.pedidos, store.activeTenantId)
      .map(pedidoDto)
      .filter((p) => (status ? p.status === status : true))
      // `supplierId` recorta por LINHA e não por cabeçalho: o pedido não tem
      // fornecedor — as linhas têm, e podem ser de vários.
      .filter((p) => (supplierId ? p.items.some((i) => i.supplierId === supplierId) : true))
      .filter((p) => (somenteAbertas ? p.items.some((i) => i.status === 'open') : true))
      .filter((p) => casaTexto(consulta.q, [p.number, p.orderNumber, p.customerName, p.notes]))

    return responder(linhas, consulta, ORDENAVEIS_PEDIDO_DE_COMPRA)
  }),

  http.get('*/api/purchase-requests/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    // O DETALHE por id é 409 e não lista vazia: é o código que o contrato
    // reserva para "este recurso exige empresa".
    if (!store.activeTenantId) return semEmpresaAtiva()

    const pedido = daEmpresa(estado.pedidos, store.activeTenantId).find((p) => p.id === params.id)
    if (!pedido) return naoEncontrado('Pedido de compra não encontrado.')
    return HttpResponse.json(pedidoDto(pedido))
  }),

  http.post('*/api/purchase-requests', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as PurchaseRequestWriteRequest
    const invalido = pedidoInvalido(corpo)
    if (invalido) return invalido

    const pedido: PedidoGuardado = {
      id: novoId('pc'),
      tenantId: store.activeTenantId,
      // O NÚMERO é do servidor: cliente que escolhe número colide entre
      // empresas, e o `PurchaseRequestWriteRequest` nem publica o campo.
      number: proximoNumero(
        'PC',
        daEmpresa(estado.pedidos, store.activeTenantId).map((p) => p.number),
      ),
      issuedAt: corpo.issuedAt,
      orderId: corpo.orderId ?? null,
      notes: corpo.notes ?? null,
      cancelado: false,
      itens: (corpo.items ?? []).map((linha) => ({
        lineNumber: linha.lineNumber,
        variantId: linha.variantId ?? null,
        description: linha.description,
        finish: linha.finish ?? null,
        size: linha.size ?? null,
        unit: linha.unit ?? null,
        quantity: linha.quantity,
        destination: linha.destination as Destino,
        supplierId: linha.supplierId,
        sourceOrderItemLine: linha.sourceOrderItemLine ?? null,
        notes: linha.notes ?? null,
        purchaseOrderId: null,
      })),
    }
    estado.pedidos.push(pedido)
    return HttpResponse.json(pedidoDto(pedido), { status: 201 })
  }),

  http.put('*/api/purchase-requests/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const pedido = daEmpresa(estado.pedidos, store.activeTenantId).find((p) => p.id === params.id)
    if (!pedido) return naoEncontrado('Pedido de compra não encontrado.')
    if (pedido.cancelado) return jaCancelado()

    // **409 quando alguma linha já foi levada por uma ordem.** Mudar a origem
    // por baixo da ordem deixaria o par `sourceRequestId` + `sourceLineNumber`
    // apontando para uma linha que virou outra coisa, COM O PAR INTACTO — que é
    // o que torna o defeito invisível. Desistir aí é cancelar e abrir outro.
    if (pedido.itens.some((i) => i.purchaseOrderId !== null)) {
      return conflito(
        'Pedido com linha já levada por uma ordem não se reescreve.',
        TIPO.itemJaEmOrdem,
      )
    }

    const corpo = (await request.json()) as PurchaseRequestWriteRequest
    const invalido = pedidoInvalido(corpo)
    if (invalido) return invalido

    // `PUT` INTEGRAL: o que o corpo não trouxer é apagado, itens junto.
    pedido.issuedAt = corpo.issuedAt
    pedido.orderId = corpo.orderId ?? null
    pedido.notes = corpo.notes ?? null
    pedido.itens = (corpo.items ?? []).map((linha) => ({
      lineNumber: linha.lineNumber,
      variantId: linha.variantId ?? null,
      description: linha.description,
      finish: linha.finish ?? null,
      size: linha.size ?? null,
      unit: linha.unit ?? null,
      quantity: linha.quantity,
      destination: linha.destination as Destino,
      supplierId: linha.supplierId,
      sourceOrderItemLine: linha.sourceOrderItemLine ?? null,
      notes: linha.notes ?? null,
      purchaseOrderId: null,
    }))
    return HttpResponse.json(pedidoDto(pedido))
  }),

  http.post('*/api/purchase-requests/:id/cancel', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const pedido = daEmpresa(estado.pedidos, store.activeTenantId).find((p) => p.id === params.id)
    if (!pedido) return naoEncontrado('Pedido de compra não encontrado.')
    if (pedido.cancelado) return jaCancelado()
    // Cancelar o pedido cuja peça já foi comprada não desfaz a compra — só faria
    // a ordem apontar para um documento cancelado. Aí o que se cancela é a ORDEM.
    if (pedido.itens.some((i) => i.purchaseOrderId !== null)) {
      return conflito('Pedido com linha já em ordem não se cancela.', TIPO.itemJaEmOrdem)
    }

    pedido.cancelado = true
    return HttpResponse.json(pedidoDto(pedido))
  }),

  // -------------------------------------------------- ordem de compra
  http.get('*/api/purchase-orders', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const status = consulta.url.searchParams.get('status')
    const supplierId = consulta.url.searchParams.get('supplierId')

    const linhas = daEmpresa(estado.ordens, store.activeTenantId)
      .map(ordemDto)
      .filter((o) => (status ? o.status === status : true))
      .filter((o) => (supplierId ? o.supplierId === supplierId : true))
      .filter((o) => casaTexto(consulta.q, [o.number, o.supplierName, o.notes]))

    return responder(linhas, consulta, ORDENAVEIS_ORDEM_DE_COMPRA)
  }),

  http.get('*/api/purchase-orders/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const ordem = daEmpresa(estado.ordens, store.activeTenantId).find((o) => o.id === params.id)
    if (!ordem) return naoEncontrado('Ordem de compra não encontrada.')
    return HttpResponse.json(ordemDto(ordem))
  }),

  http.post('*/api/purchase-orders', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as PurchaseOrderWriteRequest
    const tenantId = store.activeTenantId
    const invalido = cabecalhoDeOrdemInvalido(corpo)
    if (invalido) return invalido

    const montada = montarLinhas(tenantId, corpo, null)
    if ('recusa' in montada) return montada.recusa

    const fornecedor = fornecedorDoCadastro(corpo.supplierId)
    const ordem: OrdemGuardada = {
      id: novoId('oc'),
      tenantId,
      number: proximoNumero(
        'OC',
        daEmpresa(estado.ordens, tenantId).map((o) => o.number),
      ),
      status: 'draft',
      supplierId: corpo.supplierId,
      buyingTenantId: corpo.buyingTenantId,
      orderedAt: corpo.orderedAt,
      sentAt: null,
      expectedAt: corpo.expectedAt ?? null,
      rescheduledAt: null,
      rescheduleReason: null,
      // ECOADO na emissão, e é o que a conta usa daqui em diante.
      minimumBillingCents: fornecedor?.minimumBillingCents ?? null,
      carrierId: corpo.carrierId ?? null,
      paymentTermId: corpo.paymentTermId ?? null,
      discountPercent: corpo.discountPercent,
      surchargeCents: corpo.surchargeCents,
      notes: corpo.notes ?? null,
      itens: montada.itens,
    }

    const falta = faltaFaturamentoMinimo(ordem)
    if (falta) return conflito(falta, TIPO.faturamentoMinimoNaoAtingido)

    estado.ordens.push(ordem)
    reservarLinhas(ordem)
    return HttpResponse.json(ordemDto(ordem), { status: 201 })
  }),

  http.put('*/api/purchase-orders/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const tenantId = store.activeTenantId
    const ordem = daEmpresa(estado.ordens, tenantId).find((o) => o.id === params.id)
    if (!ordem) return naoEncontrado('Ordem de compra não encontrada.')
    if (ordem.status === 'cancelled') return jaCancelado()
    // Depois do `send` o fornecedor tem o documento na mão. Uma ordem enviada
    // que se reescreve é uma ordem que diverge, em silêncio, da que ele atende.
    if (ordem.status === 'sent') {
      return conflito('Ordem já enviada não se reescreve.', TIPO.ordemJaEnviada)
    }

    const corpo = (await request.json()) as PurchaseOrderWriteRequest
    const invalido = cabecalhoDeOrdemInvalido(corpo)
    if (invalido) return invalido

    const montada = montarLinhas(tenantId, corpo, ordem.id)
    if ('recusa' in montada) return montada.recusa

    const proposta: OrdemGuardada = {
      ...ordem,
      supplierId: corpo.supplierId,
      buyingTenantId: corpo.buyingTenantId,
      orderedAt: corpo.orderedAt,
      expectedAt: corpo.expectedAt ?? null,
      carrierId: corpo.carrierId ?? null,
      paymentTermId: corpo.paymentTermId ?? null,
      discountPercent: corpo.discountPercent,
      surchargeCents: corpo.surchargeCents,
      notes: corpo.notes ?? null,
      itens: montada.itens,
    }
    // É EDITANDO que o comprador tira a linha que sustentava o mínimo — por isso
    // a conta roda no `PUT` igual ao `POST`, e sobre a ordem PROPOSTA.
    const falta = faltaFaturamentoMinimo(proposta)
    if (falta) return conflito(falta, TIPO.faturamentoMinimoNaoAtingido)

    liberarLinhas(ordem)
    Object.assign(ordem, proposta)
    reservarLinhas(ordem)
    return HttpResponse.json(ordemDto(ordem))
  }),

  http.post('*/api/purchase-orders/:id/send', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const ordem = daEmpresa(estado.ordens, store.activeTenantId).find((o) => o.id === params.id)
    if (!ordem) return naoEncontrado('Ordem de compra não encontrada.')
    if (ordem.status === 'cancelled') return jaCancelado()
    // Reenviar reescreveria `sentAt` e apagaria quando a ordem de fato saiu —
    // a data contra a qual todo atraso é medido. O que se reenvia é o e-mail.
    if (ordem.status === 'sent') {
      return conflito('Ordem já enviada.', TIPO.ordemJaEnviada)
    }

    const corpo = ((await request.json().catch(() => ({}))) ?? {}) as PurchaseOrderSendRequest
    ordem.status = 'sent'
    // Omitido é "mandei agora"; o campo existe para o lançamento retroativo,
    // que num ERP de operação real é rotina, não exceção.
    ordem.sentAt = corpo.sentAt ?? diaLocalISO(new Date())
    return HttpResponse.json(ordemDto(ordem))
  }),

  http.post('*/api/purchase-orders/:id/reschedule', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const ordem = daEmpresa(estado.ordens, store.activeTenantId).find((o) => o.id === params.id)
    if (!ordem) return naoEncontrado('Ordem de compra não encontrada.')

    const corpo = (await request.json()) as PurchaseOrderRescheduleRequest
    const fields: { path: string; message: string }[] = []
    if (!corpo.expectedAt) fields.push({ path: 'expectedAt', message: 'Informe a data nova.' })
    if (!corpo.reason)
      fields.push({ path: 'reason', message: 'Informe o motivo do reagendamento.' })
    if (fields.length > 0) return camposInvalidos(fields)

    // Antes do envio não há promessa a quebrar: o que se muda é `expectedAt`,
    // pelo `PUT`.
    if (ordem.status !== 'sent') {
      return conflito('Só ordem enviada se reagenda.', TIPO.transicaoInvalida)
    }
    // A `0038` recusa reagendar o que não foi prometido, e o mock recusa igual.
    if (!ordem.expectedAt) {
      return conflito('Ordem sem data prometida não se reagenda.', TIPO.transicaoInvalida)
    }

    // AS DUAS DATAS FICAM. Sobrescrever `expectedAt` faria o fornecedor que
    // atrasou três vezes terminar com uma data cumprida.
    ordem.rescheduledAt = corpo.expectedAt
    ordem.rescheduleReason = corpo.reason
    return HttpResponse.json(ordemDto(ordem))
  }),

  http.post('*/api/purchase-orders/:id/cancel', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('purchases')
    if (semPermissao) return semPermissao

    const ordem = daEmpresa(estado.ordens, store.activeTenantId).find((o) => o.id === params.id)
    if (!ordem) return naoEncontrado('Ordem de compra não encontrada.')
    if (ordem.status === 'cancelled') return jaCancelado()

    // Cancelar ordem ENVIADA é permitido, e é decisão: o fornecedor cancela
    // pedido, e um sistema que só deixasse cancelar rascunho obrigaria a
    // operação a mentir sobre o que existe.
    ordem.status = 'cancelled'
    // A DEVOLUÇÃO é a razão de esta operação existir em vez de um `status` no
    // `PUT`: a ordem cancelada que deixasse as linhas marcadas criaria
    // necessidade órfã — peça que o cliente espera e nenhuma ordem traz.
    liberarLinhas(ordem)
    return HttpResponse.json(ordemDto(ordem))
  }),

  // ------------------------------------------------ previsão de chegada
  http.get('*/api/purchases/arrival-forecast', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const p = consulta.url.searchParams
    const supplierId = p.get('supplierId')
    const customerId = p.get('customerId')
    const destination = p.get('destination')
    const somenteAtrasadas = p.get('lateOnly') === 'true'
    const de = p.get('from')
    const ate = p.get('to')

    const linhas = daEmpresa(estado.ordens, store.activeTenantId)
      // Só ENVIADA e não cancelada. Ordem em `draft` é intenção do comprador, e
      // mostrá-la como peça a caminho é o que faz o vendedor prometer data ao
      // cliente com base numa ordem que ninguém mandou.
      .filter((o) => o.status === 'sent')
      .flatMap((o) => o.itens.map((linha) => previsaoDto(o, linha)))
      .filter((l) => (supplierId ? l.supplierId === supplierId : true))
      .filter((l) => (customerId ? l.customerId === customerId : true))
      .filter((l) => (destination ? l.destination === destination : true))
      .filter((l) => (somenteAtrasadas ? (l.daysLate ?? 0) > 0 : true))
      .filter((l) => (de ? (l.expectedAt ?? '') >= de : true))
      .filter((l) => (ate ? (l.expectedAt ?? '') <= ate : true))
      .filter((l) =>
        casaTexto(consulta.q, [
          l.description,
          l.purchaseOrderNumber,
          l.supplierName,
          l.customerName,
          l.orderNumber,
        ]),
      )

    // O padrão é `expectedAt` crescente: a tela abre no que chega primeiro, e
    // uma previsão ordenada por outra coisa obriga a reordenar toda vez.
    return responder(linhas, consulta, ORDENAVEIS_PREVISAO, { campo: 'expectedAt', desc: false })
  }),

  // --------------------------------------- compras para estoque / reserva
  http.get('*/api/purchases/stock-replenishment', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const tenantId = store.activeTenantId
    const p = consulta.url.searchParams
    const supplierId = p.get('supplierId')
    const locationId = p.get('locationId')
    const somenteAbaixo = p.get('belowMinimumOnly') === 'true'

    const linhas = store.produtos
      .flatMap((produto) =>
        produto.variants.map((variante) => reposicaoDto(tenantId, produto.description, variante)),
      )
      .map((linha) => (locationId ? recortarAoDeposito(tenantId, linha, locationId) : linha))
      .filter((l) => (supplierId ? l.supplierId === supplierId : true))
      .filter((l) => (somenteAbaixo ? l.qtySuggested > 0 : true))
      .filter((l) => casaTexto(consulta.q, [l.description, l.finish, l.size]))

    // O padrão é `qtySuggested` decrescente: a tela abre no que mais falta, que
    // é a única ordem em que uma lista de reposição é útil sem ninguém tocá-la.
    return responder(linhas, consulta, ORDENAVEIS_REPOSICAO, { campo: 'qtySuggested', desc: true })
  }),
]

// -------------------------------------------------- montagem e reserva

/** Validação do CABEÇALHO da ordem — o que não depende das linhas de origem. */
function cabecalhoDeOrdemInvalido(corpo: PurchaseOrderWriteRequest) {
  const fields: { path: string; message: string }[] = []
  const semFornecedor = fornecedorInvalido(corpo.supplierId, 'supplierId')
  if (semFornecedor) fields.push(semFornecedor)
  if (!corpo.orderedAt) fields.push({ path: 'orderedAt', message: 'Informe a data da ordem.' })
  if (!corpo.buyingTenantId) {
    fields.push({ path: 'buyingTenantId', message: 'Informe a empresa compradora.' })
  }
  // A escala é a da casa: `10000` = 1%, `1000000` = 100% — a mesma do orçamento
  // e do pedido de venda, e a que a `0057` do api passou a exigir.
  if (corpo.discountPercent < 0 || corpo.discountPercent > 1_000_000) {
    fields.push({ path: 'discountPercent', message: 'O desconto vai de 0 a 1000000 (100%).' })
  }
  if (corpo.surchargeCents < 0) {
    fields.push({ path: 'surchargeCents', message: 'O acréscimo não pode ser negativo.' })
  }
  if ((corpo.items ?? []).length === 0) {
    fields.push({ path: 'items', message: 'A ordem precisa de ao menos uma linha.' })
  }
  return fields.length > 0 ? camposInvalidos(fields) : undefined
}

/**
 * Resolve cada linha da ordem contra a linha de pedido que ela aponta, COPIANDO
 * dali o que descreve a peça.
 *
 * As duas recusas de negócio moram aqui, e as duas são 409 e não 400 porque o
 * corpo pode estar perfeitamente bem formado — o que está errado é o estado do
 * documento de origem, que o cliente não tinha como validar sozinho:
 *
 * - `fornecedor-divergente`: a linha vem de um item de OUTRO fornecedor. A ordem
 *   é de um só por definição.
 * - `item-ja-em-ordem`: a linha já foi levada por outra ordem. É a corrida entre
 *   dois compradores montando ordem ao mesmo tempo.
 *
 * `ordemAtual` é a ordem que está sendo REESCRITA: as linhas que já são dela não
 * contam como tomadas, senão todo `PUT` recusaria a si mesmo.
 */
function montarLinhas(
  tenantId: string,
  corpo: PurchaseOrderWriteRequest,
  ordemAtual: string | null,
): { itens: LinhaDeOrdem[] } | { recusa: ReturnType<typeof problemaJson> } {
  const itens: LinhaDeOrdem[] = []
  for (const linha of corpo.items ?? []) {
    const pedido = daEmpresa(estado.pedidos, tenantId).find((p) => p.id === linha.sourceRequestId)
    const origem = pedido?.itens.find((i) => i.lineNumber === linha.sourceLineNumber)
    if (!pedido || !origem) {
      return {
        recusa: camposInvalidos([
          {
            path: `items[${itens.length}].sourceRequestId`,
            message: 'Linha de pedido de compra não encontrada.',
          },
        ]),
      }
    }
    if (origem.supplierId !== corpo.supplierId) {
      return {
        recusa: conflito(
          `A linha ${origem.lineNumber} do pedido ${pedido.number} é de outro fornecedor.`,
          TIPO.fornecedorDivergente,
        ),
      }
    }
    if (origem.purchaseOrderId !== null && origem.purchaseOrderId !== ordemAtual) {
      return {
        recusa: conflito(
          `A linha ${origem.lineNumber} do pedido ${pedido.number} já está em outra ordem.`,
          TIPO.itemJaEmOrdem,
        ),
      }
    }
    if (!(linha.quantity > 0) || linha.unitCostCents < 0) {
      return {
        recusa: camposInvalidos([
          {
            path: `items[${itens.length}].quantity`,
            message: 'Quantidade positiva e custo não negativo.',
          },
        ]),
      }
    }

    itens.push({
      lineNumber: linha.lineNumber,
      sourceRequestId: linha.sourceRequestId,
      sourceLineNumber: linha.sourceLineNumber,
      // COPIADOS da origem — o cliente não os manda, e é isso que impede a ordem
      // de dizer que comprou uma peça e o pedido dizer que pediu outra.
      variantId: origem.variantId,
      description: origem.description,
      finish: origem.finish,
      size: origem.size,
      unit: origem.unit,
      destination: origem.destination,
      quantity: linha.quantity,
      unitCostCents: linha.unitCostCents,
      productGroupId: linha.productGroupId ?? null,
    })
  }
  return { itens }
}

/** Marca as linhas de pedido como levadas por esta ordem. */
function reservarLinhas(ordem: OrdemGuardada): void {
  for (const linha of ordem.itens) {
    const pedido = estado.pedidos.find(
      (p) => p.tenantId === ordem.tenantId && p.id === linha.sourceRequestId,
    )
    const origem = pedido?.itens.find((i) => i.lineNumber === linha.sourceLineNumber)
    if (origem) origem.purchaseOrderId = ordem.id
  }
}

/** Devolve ao estado `open` as linhas que esta ordem levava. */
function liberarLinhas(ordem: OrdemGuardada): void {
  for (const pedido of estado.pedidos) {
    if (pedido.tenantId !== ordem.tenantId) continue
    for (const linha of pedido.itens) {
      if (linha.purchaseOrderId === ordem.id) linha.purchaseOrderId = null
    }
  }
}

// ------------------------------------------------------------ consultas

function diasDeAtraso(valida: string | null): number | null {
  if (!valida) return null
  const hoje = diaLocalISO(new Date())
  if (valida >= hoje) return null
  const dia = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(hoje) - Date.parse(valida)) / dia)
}

function previsaoDto(ordem: OrdemGuardada, linha: LinhaDeOrdem): PurchaseArrivalRowDto {
  const pedido = estado.pedidos.find(
    (p) => p.tenantId === ordem.tenantId && p.id === linha.sourceRequestId,
  )
  const venda = pedido?.orderId ? PEDIDOS_DE_VENDA_CONHECIDOS[pedido.orderId] : undefined
  const valida = dataValida(ordem)
  return {
    purchaseOrderId: ordem.id,
    purchaseOrderNumber: ordem.number,
    supplierId: ordem.supplierId,
    supplierName: nomeDeParceiro(ordem.supplierId) ?? '',
    sentAt: ordem.sentAt,
    expectedAt: valida,
    // A promessa ORIGINAL só sai quando houve reagendamento — a tela destaca a
    // linha reagendada, e sem isso ela destacaria todas.
    originalExpectedAt: ordem.rescheduledAt ? ordem.expectedAt : null,
    daysLate: diasDeAtraso(valida),
    variantId: linha.variantId,
    description: linha.description,
    finish: linha.finish,
    size: linha.size,
    quantity: linha.quantity,
    destination: linha.destination,
    // Reposição não tem cliente, e é isso que a tela mostra — "estoque", não
    // vazio. Só a linha `sale` carrega a venda.
    orderId: linha.destination === 'sale' ? (pedido?.orderId ?? null) : null,
    orderNumber: linha.destination === 'sale' ? (venda?.number ?? null) : null,
    customerId: linha.destination === 'sale' ? (venda?.customerId ?? null) : null,
    customerName: linha.destination === 'sale' ? (venda?.customerName ?? null) : null,
  }
}

function saldoDaVariante(tenantId: string, variantId: string, locationId?: string): number {
  return store.saldos
    .filter((s) => s.tenantId === tenantId && s.variantId === variantId)
    .filter((s) => (locationId ? s.locationId === locationId : true))
    .reduce((soma, s) => soma + s.qty, 0)
}

function reservaDaVariante(tenantId: string, variantId: string): number {
  return RESERVA_POR_VARIANTE.filter(
    (r) => r.tenantId === tenantId && r.variantId === variantId,
  ).reduce((soma, r) => soma + r.qty, 0)
}

/**
 * Quanto já vem em ordem ENVIADA. `draft` não entra: intenção do comprador não é
 * peça a caminho, e contá-la faria a sugestão zerar por causa de uma ordem que
 * ninguém mandou.
 */
function emOrdem(tenantId: string, variantId: string): number {
  return estado.ordens
    .filter((o) => o.tenantId === tenantId && o.status === 'sent')
    .flatMap((o) => o.itens)
    .filter((linha) => linha.variantId === variantId)
    .reduce((soma, linha) => soma + linha.quantity, 0)
}

function reposicaoDto(
  tenantId: string,
  descricaoDoProduto: string,
  variante: { id: string; finish: string; size: string; minStock?: number | null },
): PurchaseReplenishmentRowDto {
  const qtyOnHand = saldoDaVariante(tenantId, variante.id)
  const qtyAllocated = reservaDaVariante(tenantId, variante.id)
  const qtyOnOrder = emOrdem(tenantId, variante.id)
  const minimumQty = variante.minStock ?? null
  const qtyAvailable = qtyOnHand - qtyAllocated
  const fornecedor = FORNECEDOR_PADRAO[variante.id] ?? null
  return {
    variantId: variante.id,
    description: descricaoDoProduto,
    finish: variante.finish,
    size: variante.size,
    qtyOnHand,
    qtyAllocated,
    qtyAvailable,
    qtyOnOrder,
    // Sem mínimo cadastrado não há alvo contra o qual faltar — e a sugestão é
    // `0`, não "compre tudo".
    qtySuggested: minimumQty === null ? 0 : Math.max(0, minimumQty - (qtyAvailable + qtyOnOrder)),
    minimumQty,
    supplierId: fornecedor,
    supplierName: nomeDeParceiro(fornecedor),
  }
}

/**
 * Recorta a linha a UM depósito.
 *
 * Só o saldo FÍSICO é recortável: reserva e ordem em trânsito não têm depósito —
 * a reserva é da empresa, e a peça a caminho ainda não escolheu galpão. Ratear
 * as duas por depósito seria inventar uma dimensão que o dado não tem.
 */
function recortarAoDeposito(
  tenantId: string,
  linha: PurchaseReplenishmentRowDto,
  locationId: string,
): PurchaseReplenishmentRowDto {
  const qtyOnHand = saldoDaVariante(tenantId, linha.variantId, locationId)
  const qtyAvailable = qtyOnHand - linha.qtyAllocated
  return {
    ...linha,
    qtyOnHand,
    qtyAvailable,
    qtySuggested:
      linha.minimumQty == null
        ? 0
        : Math.max(0, linha.minimumQty - (qtyAvailable + linha.qtyOnOrder)),
  }
}
