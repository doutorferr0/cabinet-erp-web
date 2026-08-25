import type {
  AddDeliveryItemRequest,
  CloseDeliveryRequest,
  CreateDeliveryRequest,
  DeliveryDetailDto,
  DeliveryDto,
  DeliveryItemDto,
  FulfillmentFactDto,
  OrderFulfillmentDto,
  OrderItemFulfillmentDto,
  PickOrderItemRequest,
  PickingQueueItemDto,
  ReleaseOrderItemRequest,
} from '@/api/gerado'
import {
  FATOS_SEMEADOS,
  type ItemDoPedidoEmSeparacao,
  PEDIDOS_EM_SEPARACAO,
  type PedidoEmSeparacao,
} from '@/mocks/entregas'
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
import { novoId, store } from './store'

/**
 * O BLOCO FÍSICO DA VENDA no mock — liberar, separar, o romaneio e a situação.
 *
 * Serve as dez operações do G4 (`web#342`), que `rotas-do-backend.ts` mantém do
 * lado do MOCK. O `cabinet-erp-api` já as publica (`src/modules/entrega/rotas.ts`,
 * na `main` desde a #186), mas ligar a passagem é medição de par local e outra
 * decisão: enquanto não for medida, quem responde é este arquivo — e é ele que
 * mantém `cabinetonline.cc`, 100% mock, com o quadro de cargas de pé.
 *
 * ## O progresso é DERIVADO. Sempre.
 *
 * Não existe `quantityPicked` guardada em lugar nenhum: o estado é a lista de
 * FATOS (`order_fulfillments`, append-only), e as três quantidades saem de somar
 * os fatos de cada tipo. É a mesma escolha do backend, e não é estética —
 * guardar o acumulado ao lado dos fatos criaria duas verdades sobre a mesma
 * peça, e a que diverge primeiro é sempre a que a tela mostra.
 *
 * ## A ESCADA é monótona, e cada degrau recusa com URN PRÓPRIA
 *
 *   vendido ≥ liberado ≥ separado ≥ entregue
 *
 * Liberar acima do vendido, separar acima do liberado e entregar acima do
 * separado são três 409 DIFERENTES, porque a saída de cada um é outra: corrigir
 * a quantidade, liberar antes, separar antes. Um 409 genérico devolveria à tela
 * o que o status já disse.
 */

interface FatoGuardado {
  id: string
  orderId: string
  lineNumber: number
  kind: 'release' | 'pick' | 'deliver'
  quantity: number
  locationId: string | null
  deliveryId: string | null
  stockMovementId: string | null
  occurredAt: string
  notes: string | null
}

interface RomaneioGuardado {
  id: string
  number: string
  orderId: string
  status: 'open' | 'closed' | 'cancelled'
  scheduledFor: string | null
  deliveredAt: string | null
  carrierId: string | null
  carrierName: string | null
  receivedBy: string | null
  receivedDocument: string | null
  signatureRef: string | null
  closedAt: string | null
  notes: string | null
  criadoEm: string
}

interface Estado {
  pedidos: PedidoEmSeparacao[]
  fatos: FatoGuardado[]
  romaneios: RomaneioGuardado[]
  proximoRomaneio: number
}

function estadoInicial(): Estado {
  return {
    pedidos: PEDIDOS_EM_SEPARACAO.map((p) => ({
      ...p,
      datasPorAmbiente: { ...p.datasPorAmbiente },
      itens: p.itens.map((i) => ({ ...i })),
    })),
    fatos: FATOS_SEMEADOS.map((f, indice) => ({
      id: `fato-semeado-${indice + 1}`,
      orderId: f.orderId,
      lineNumber: f.lineNumber,
      kind: f.kind,
      quantity: f.quantity,
      locationId: null,
      deliveryId: null,
      stockMovementId: null,
      occurredAt: new Date().toISOString(),
      notes: null,
    })),
    romaneios: [],
    proximoRomaneio: 1,
  }
}

let estado: Estado = estadoInicial()

/** Reinício entre testes — o mesmo contrato de `resetStore`. */
export function resetEntregas(): void {
  estado = estadoInicial()
}

/**
 * A whitelist de `sortBy` da fila, LITERAL do contrato.
 *
 * `description` fica de fora de propósito: ordenar a fila do galpão por nome de
 * peça embaralha as linhas do mesmo pedido, que é justamente o agrupamento que
 * quem separa usa para não fazer duas viagens.
 */
export const ORDENAVEIS_DA_FILA = [
  'scheduledDeliveryAt',
  'orderNumber',
  'customerName',
  'pendingPick',
] as const

/** A do romaneio. `customerName` e `carrierName` são eco de outra tabela. */
export const ORDENAVEIS_DO_ROMANEIO = ['number', 'scheduledFor', 'deliveredAt', 'status'] as const

function pedidoDe(orderId: string): PedidoEmSeparacao | undefined {
  return estado.pedidos.find((p) => p.id === orderId)
}

function somaDe(orderId: string, lineNumber: number, kind: FatoGuardado['kind']): number {
  return estado.fatos
    .filter((f) => f.orderId === orderId && f.lineNumber === lineNumber && f.kind === kind)
    .reduce((total, f) => total + f.quantity, 0)
}

/**
 * A data prometida do item, com a herança do ambiente aplicada.
 *
 * Devolve também DE ONDE ela veio: `scheduledDateInherited` é o que permite a
 * tela dizer "a data é do ambiente" em vez de deixar o operador achar que
 * alguém a combinou item a item.
 */
function dataPrometida(
  pedido: PedidoEmSeparacao,
  item: ItemDoPedidoEmSeparacao,
): { data: string | null; herdada: boolean } {
  if (item.scheduledDeliveryAt) return { data: item.scheduledDeliveryAt, herdada: false }
  const doAmbiente = item.environmentCode
    ? pedido.datasPorAmbiente[item.environmentCode]
    : undefined
  return { data: doAmbiente ?? null, herdada: Boolean(doAmbiente) }
}

/** Arredonda para 3 casas — a precisão de quantidade do contrato. */
function q3(valor: number): number {
  return Math.round(valor * 1000) / 1000
}

/**
 * O progresso de UMA linha — a derivação inteira num lugar só.
 *
 * `physicalState` é o degrau mais avançado que cobre a linha INTEIRA. A
 * alternativa (o degrau mais avançado com QUALQUER progresso) marcaria como
 * entregue a linha de 10 com 1 entregue, e é assim que peça fica no galpão com
 * o pedido dizendo que saiu. `partial` ao lado carrega o resto da verdade.
 */
function progressoDaLinha(
  pedido: PedidoEmSeparacao,
  item: ItemDoPedidoEmSeparacao,
): OrderItemFulfillmentDto {
  const liberado = q3(somaDe(pedido.id, item.lineNumber, 'release'))
  const separado = q3(somaDe(pedido.id, item.lineNumber, 'pick'))
  const entregue = q3(somaDe(pedido.id, item.lineNumber, 'deliver'))
  const { data, herdada } = dataPrometida(pedido, item)

  const estadoFisico: OrderItemFulfillmentDto['physicalState'] =
    entregue >= item.quantity
      ? 'delivered'
      : separado >= item.quantity
        ? 'picked'
        : liberado >= item.quantity
          ? 'released'
          : 'pending'

  // Progresso ACIMA do degrau exibido: é o que deixa a tela pintar "6 de 10"
  // sem mentir sobre o degrau.
  const parcial =
    (estadoFisico === 'pending' && liberado > 0) ||
    (estadoFisico === 'released' && separado > 0) ||
    (estadoFisico === 'picked' && entregue > 0)

  return {
    lineNumber: item.lineNumber,
    description: item.description,
    environmentCode: item.environmentCode,
    environmentName: item.environmentName,
    quantity: item.quantity,
    quantityReleased: liberado,
    quantityPicked: separado,
    quantityDelivered: entregue,
    physicalState: estadoFisico,
    partial: parcial,
    pendingRelease: q3(Math.max(0, item.quantity - liberado)),
    pendingPick: q3(Math.max(0, liberado - separado)),
    pendingDelivery: q3(Math.max(0, separado - entregue)),
    percentDelivered: item.quantity > 0 ? Math.round((entregue / item.quantity) * 100) : 0,
    scheduledDeliveryAt: data,
    scheduledDateInherited: herdada,
  }
}

/**
 * A situação do pedido inteiro.
 *
 * O percentual é ponderado pela QUANTIDADE de cada linha: a linha de 100 peças
 * e a de 1 não pesam igual no que o cliente ainda espera.
 */
function situacaoDoPedido(pedido: PedidoEmSeparacao): OrderFulfillmentDto {
  const itens = pedido.itens.map((i) => progressoDaLinha(pedido, i))
  const vendido = itens.reduce((total, i) => total + i.quantity, 0)
  const entregue = itens.reduce((total, i) => total + i.quantityDelivered, 0)

  const ordem = ['pending', 'released', 'picked', 'delivered'] as const
  const menorDegrau = itens.reduce(
    (menor, i) => Math.min(menor, ordem.indexOf(i.physicalState)),
    ordem.length - 1,
  )

  return {
    orderId: pedido.id,
    orderNumber: pedido.number,
    status: pedido.status,
    // O degrau do PEDIDO é o do item menos avançado: o pedido só está separado
    // quando não sobrou nada na prateleira.
    physicalState: ordem[itens.length ? menorDegrau : 0] ?? 'pending',
    percentDelivered: vendido > 0 ? Math.round((entregue / vendido) * 100) : 0,
    items: itens,
  }
}

function romaneioDto(r: RomaneioGuardado): DeliveryDto {
  const pedido = pedidoDe(r.orderId)
  return {
    id: r.id,
    number: r.number,
    orderId: r.orderId,
    orderNumber: pedido?.number ?? null,
    customerName: pedido?.customerName ?? null,
    status: r.status,
    scheduledFor: r.scheduledFor,
    deliveredAt: r.deliveredAt,
    carrierId: r.carrierId,
    carrierName: r.carrierName,
    receivedBy: r.receivedBy,
    receivedDocument: r.receivedDocument,
    closedAt: r.closedAt,
    notes: r.notes,
  }
}

/**
 * Os itens do romaneio SÃO os fatos que apontam para ele.
 *
 * Não há coleção própria — é a divergência declarada no contrato em relação ao
 * `ShipmentItem` do OFBiz. Uma segunda lista teria de ser mantida igual à
 * primeira, e o dia em que divergisse, o romaneio assinado e o log de entregas
 * discordariam sobre o que saiu.
 */
function itensDoRomaneio(r: RomaneioGuardado): DeliveryItemDto[] {
  const pedido = pedidoDe(r.orderId)
  return estado.fatos
    .filter((f) => f.kind === 'deliver' && f.deliveryId === r.id)
    .map((f) => {
      const item = pedido?.itens.find((i) => i.lineNumber === f.lineNumber)
      return {
        lineNumber: f.lineNumber,
        description: item?.description ?? `Item ${f.lineNumber}`,
        environmentName: item?.environmentName ?? null,
        quantity: f.quantity,
        occurredAt: f.occurredAt,
        notes: f.notes,
      }
    })
}

/**
 * O detalhe é o resumo MAIS `signatureRef` e os itens.
 *
 * `signatureRef` não está no `DeliveryDto` de propósito — o contrato só o
 * publica no detalhe, e mandá-lo na listagem seria campo que o schema não tem.
 */
function detalheDoRomaneio(r: RomaneioGuardado): DeliveryDetailDto {
  return { ...romaneioDto(r), signatureRef: r.signatureRef, items: itensDoRomaneio(r) }
}

/** O ato gravado + o progresso RESULTANTE da linha, como o contrato devolve. */
function fatoDto(fato: FatoGuardado, pedido: PedidoEmSeparacao): FulfillmentFactDto {
  const item = pedido.itens.find((i) => i.lineNumber === fato.lineNumber)
  return {
    id: fato.id,
    kind: fato.kind,
    quantity: fato.quantity,
    locationId: fato.locationId,
    deliveryId: fato.deliveryId,
    stockMovementId: fato.stockMovementId,
    occurredAt: fato.occurredAt,
    // O item existe: quem chega aqui já passou pela busca da linha.
    item: item
      ? progressoDaLinha(pedido, item)
      : progressoDaLinha(pedido, {
          lineNumber: fato.lineNumber,
          description: `Item ${fato.lineNumber}`,
          environmentCode: null,
          environmentName: null,
          quantity: 0,
          unit: null,
          scheduledDeliveryAt: null,
        }),
  }
}

function gravarFato(fato: Omit<FatoGuardado, 'id' | 'occurredAt'>): FatoGuardado {
  const gravado: FatoGuardado = {
    ...fato,
    id: novoId('fato'),
    occurredAt: new Date().toISOString(),
  }
  estado.fatos.push(gravado)
  return gravado
}

/** Quantidade do corpo: número positivo com até 3 casas, ou `fields[]`. */
function quantidadeInvalida(quantity: unknown) {
  if (typeof quantity !== 'number' || Number.isNaN(quantity) || quantity <= 0) {
    return camposInvalidos([
      { path: 'quantity', message: 'Informe uma quantidade maior que zero.' },
    ])
  }
  return undefined
}

function paginar<T>(linhas: T[], url: URL) {
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return problemaJson(
      400,
      'Paginação inválida: page é 1-based e pageSize vai até 100.',
      {},
      TIPO.paginacaoInvalida,
    )
  }
  const inicio = (page - 1) * pageSize
  return HttpResponse.json({ rows: linhas.slice(inicio, inicio + pageSize), total: linhas.length })
}

/**
 * Ordena por uma chave da whitelist, com `NULLS LAST`.
 *
 * O nulo por último não é detalhe de apresentação: é a regra escrita do
 * contrato para a fila — item sem data combinada não fura a fila de quem tem
 * uma. Invertê-lo poria o que ninguém prometeu na frente do que está atrasado.
 */
function ordenarPor<T extends object>(linhas: T[], chave: string, desc: boolean) {
  linhas.sort((a, b) => {
    const va = (a as Record<string, unknown>)[chave]
    const vb = (b as Record<string, unknown>)[chave]
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    const comparacao =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
    return desc ? -comparacao : comparacao
  })
}

export const handlersDeEntrega = [
  /**
   * A SITUAÇÃO FÍSICA do pedido — a consulta nº 17 do volume 02 do legado.
   *
   * Leitura, e por isso NÃO é filtrada por papel: quem tem vínculo com a
   * empresa lê tudo o que ela tem, e é para isso que `viewer` existe. Sem
   * empresa ativa é 409, como todo detalhe por id.
   */
  http.get('*/api/orders/:id/fulfillment', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const pedido = pedidoDe(String(params.id))
    if (!pedido) return naoEncontrado('Pedido de venda não encontrado.')
    return HttpResponse.json(situacaoDoPedido(pedido))
  }),

  /**
   * LIBERAR — reserva o saldo e autoriza a peça a sair.
   *
   * **A única da escada que exige permissão** (`venda:liberar-entrega`): separar
   * e entregar são execução do que já foi autorizado. Aqui a recusa sai pela
   * matriz de PAPEL (`orders`) e não pela permissão nomeada, e a divergência é
   * declarada: `SessaoAtual` não publica as permissões do vínculo, então o mock
   * não tem como conferir a chave que o servidor confere. O papel é a
   * aproximação mais próxima que o front consegue medir — e a tela trata o 403
   * quando ele vem, em vez de esconder o botão por adivinhação.
   */
  http.post('*/api/orders/:id/items/:lineNumber/release', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao

    const pedido = pedidoDe(String(params.id))
    if (!pedido) return naoEncontrado('Pedido de venda não encontrado.')
    const item = pedido.itens.find((i) => i.lineNumber === Number(params.lineNumber))
    if (!item) return naoEncontrado('Linha do pedido não encontrada.')
    if (pedido.status === 'cancelled') {
      return conflito('Pedido cancelado não libera item.', TIPO.transicaoInvalida)
    }

    const corpo = (await request.json()) as ReleaseOrderItemRequest
    const invalida = quantidadeInvalida(corpo?.quantity)
    if (invalida) return invalida

    const progresso = progressoDaLinha(pedido, item)
    if (corpo.quantity > progresso.pendingRelease) {
      return conflito(
        `Falta liberar ${progresso.pendingRelease} de ${item.quantity}. Liberar ${corpo.quantity} passaria do vendido.`,
        TIPO.liberacaoAcimaDoVendido,
      )
    }

    const fato = gravarFato({
      orderId: pedido.id,
      lineNumber: item.lineNumber,
      kind: 'release',
      quantity: corpo.quantity,
      // O depósito se decide AQUI e a separação o herda: reservar num galpão e
      // baixar de outro deixaria a reserva presa no primeiro para sempre.
      locationId: corpo.locationId ?? null,
      deliveryId: null,
      stockMovementId: null,
      notes: corpo.notes ?? null,
    })
    return HttpResponse.json(fatoDto(fato, pedido))
  }),

  /**
   * SEPARAR — a peça sai da prateleira e o estoque baixa.
   *
   * Acima do LIBERADO é 409 `separacao-sem-liberacao`, e o gate não depende de
   * papel nenhum: quem pula a liberação não separa, seja qual for o cargo.
   *
   * Linha de SERVIÇO separa sem mover peça — ela não tem variante, e resolver
   * depósito para ela apontaria a instalação de uma cozinha para uma prateleira.
   * No mock isso aparece como `stockMovementId: null`.
   */
  http.post('*/api/orders/:id/items/:lineNumber/pick', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao

    const pedido = pedidoDe(String(params.id))
    if (!pedido) return naoEncontrado('Pedido de venda não encontrado.')
    const item = pedido.itens.find((i) => i.lineNumber === Number(params.lineNumber))
    if (!item) return naoEncontrado('Linha do pedido não encontrada.')
    if (pedido.status === 'cancelled') {
      return conflito('Pedido cancelado não separa item.', TIPO.transicaoInvalida)
    }

    const corpo = (await request.json()) as PickOrderItemRequest
    const invalida = quantidadeInvalida(corpo?.quantity)
    if (invalida) return invalida

    const progresso = progressoDaLinha(pedido, item)
    if (corpo.quantity > progresso.pendingPick) {
      return conflito(
        `Liberado para separação: ${progresso.pendingPick}. Libere antes de separar ${corpo.quantity}.`,
        TIPO.separacaoSemLiberacao,
      )
    }

    // O depósito da liberação é o que vale; o do corpo é a exceção declarada.
    const depositoDaLiberacao =
      estado.fatos.find(
        (f) => f.orderId === pedido.id && f.lineNumber === item.lineNumber && f.kind === 'release',
      )?.locationId ?? null

    const fato = gravarFato({
      orderId: pedido.id,
      lineNumber: item.lineNumber,
      kind: 'pick',
      quantity: corpo.quantity,
      locationId: corpo.locationId ?? depositoDaLiberacao,
      deliveryId: null,
      // Serviço não move peça, e por isso não tem movimento de kardex.
      stockMovementId: item.unit === 'SERV' ? null : novoId('mov'),
      notes: corpo.notes ?? null,
    })
    return HttpResponse.json(fatoDto(fato, pedido))
  }),

  /**
   * A FILA DE SEPARAÇÃO — o que já pode sair da prateleira e ainda não saiu.
   *
   * O recorte (`liberado > separado`, pedido ativo) mora AQUI, e não na tela: a
   * fila de uma loja com dois anos de pedidos é uma varredura de tudo que já se
   * vendeu se a conta subir para o cliente.
   *
   * **Sem empresa ativa devolve `{rows: [], total: 0}`** — o operador
   * recém-criado, ainda sem vínculo, não tem fila; não é erro dele.
   */
  http.get('*/api/picking-queue', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy && !ORDENAVEIS_DA_FILA.includes(sortBy as (typeof ORDENAVEIS_DA_FILA)[number])) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }
    const orderId = url.searchParams.get('orderId')

    let linhas: PickingQueueItemDto[] = []
    for (const pedido of estado.pedidos) {
      if (pedido.status !== 'active') continue
      if (orderId && pedido.id !== orderId) continue
      for (const item of pedido.itens) {
        const progresso = progressoDaLinha(pedido, item)
        if (progresso.pendingPick <= 0) continue
        linhas.push({
          orderId: pedido.id,
          orderNumber: pedido.number,
          customerName: pedido.customerName,
          lineNumber: item.lineNumber,
          description: item.description,
          environmentName: item.environmentName,
          pendingPick: progresso.pendingPick,
          scheduledDeliveryAt: progresso.scheduledDeliveryAt ?? null,
        })
      }
    }

    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((l) =>
        [l.orderNumber, l.customerName, l.description].some((t) => t?.toLowerCase().includes(alvo)),
      )
    }

    // Ordem padrão: data prometida (NULLS LAST) e o número do pedido como
    // desempate — o que atrasa aparece em cima.
    ordenarPor(linhas, sortBy ?? 'scheduledDeliveryAt', url.searchParams.get('sortDesc') === 'true')
    if (!sortBy) {
      linhas.sort((a, b) => {
        if (a.scheduledDeliveryAt === b.scheduledDeliveryAt) {
          return a.orderNumber.localeCompare(b.orderNumber) || a.lineNumber - b.lineNumber
        }
        return 0
      })
    }
    return paginar(linhas, url)
  }),

  /** Os ROMANEIOS da empresa ativa — o "Controle de Entrega" do legado. */
  http.get('*/api/deliveries', ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy')
    if (
      sortBy &&
      !ORDENAVEIS_DO_ROMANEIO.includes(sortBy as (typeof ORDENAVEIS_DO_ROMANEIO)[number])
    ) {
      return problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida)
    }

    let linhas = estado.romaneios.map(romaneioDto)
    const status = url.searchParams.get('status')
    if (status) linhas = linhas.filter((r) => r.status === status)
    const orderId = url.searchParams.get('orderId')
    if (orderId) linhas = linhas.filter((r) => r.orderId === orderId)
    const q = url.searchParams.get('q')
    if (q) {
      const alvo = q.toLowerCase()
      linhas = linhas.filter((r) =>
        [r.number, r.orderNumber, r.customerName, r.carrierName].some((t) =>
          t?.toLowerCase().includes(alvo),
        ),
      )
    }

    ordenarPor(linhas, sortBy ?? 'number', url.searchParams.get('sortDesc') === 'true')
    return paginar(linhas, url)
  }),

  /** Abre o romaneio. Nasce `open` e VAZIO — os itens entram um a um. */
  http.post('*/api/deliveries', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao

    const corpo = (await request.json()) as CreateDeliveryRequest
    if (!corpo?.orderId) {
      return camposInvalidos([{ path: 'orderId', message: 'Informe o pedido de venda.' }])
    }
    const pedido = pedidoDe(corpo.orderId)
    if (!pedido) return naoEncontrado('Pedido de venda não encontrado.')
    if (pedido.status === 'cancelled') {
      return conflito('Pedido cancelado não recebe entrega.', TIPO.transicaoInvalida)
    }

    const romaneio: RomaneioGuardado = {
      id: novoId('romaneio'),
      // Sequência do GRUPO, atribuída pelo servidor — string porque número de
      // documento se lê e se digita, não se soma.
      number: String(1000 + estado.proximoRomaneio),
      orderId: pedido.id,
      status: 'open',
      scheduledFor: corpo.scheduledFor ?? null,
      deliveredAt: null,
      carrierId: corpo.carrierId ?? null,
      carrierName: corpo.carrierName ?? null,
      receivedBy: null,
      receivedDocument: null,
      signatureRef: null,
      closedAt: null,
      notes: corpo.notes ?? null,
      criadoEm: new Date().toISOString(),
    }
    estado.proximoRomaneio += 1
    estado.romaneios.push(romaneio)
    return HttpResponse.json(detalheDoRomaneio(romaneio), { status: 201 })
  }),

  http.get('*/api/deliveries/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const romaneio = estado.romaneios.find((r) => r.id === String(params.id))
    if (!romaneio) return naoEncontrado('Romaneio não encontrado.')
    return HttpResponse.json(detalheDoRomaneio(romaneio))
  }),

  /**
   * Lança um item ENTREGUE dentro do romaneio. NÃO mexe em estoque — a peça já
   * saiu do galpão na separação, e baixar de novo é o defeito clássico da
   * expedição: o saldo cai duas vezes e a conferência do mês não fecha.
   */
  http.post('*/api/deliveries/:id/items', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao

    const romaneio = estado.romaneios.find((r) => r.id === String(params.id))
    if (!romaneio) return naoEncontrado('Romaneio não encontrado.')
    if (romaneio.status !== 'open') {
      return conflito(
        'Romaneio fechado ou cancelado não recebe item. Abra outro.',
        TIPO.entregaFechada,
      )
    }

    const corpo = (await request.json()) as AddDeliveryItemRequest
    const invalida = quantidadeInvalida(corpo?.quantity)
    if (invalida) return invalida

    const pedido = pedidoDe(romaneio.orderId)
    if (!pedido) return naoEncontrado('Pedido de venda não encontrado.')
    const item = pedido.itens.find((i) => i.lineNumber === corpo.lineNumber)
    if (!item) {
      return conflito(
        'A linha não é deste pedido — o romaneio pertence a outro documento.',
        TIPO.entregaDeOutroPedido,
      )
    }

    const progresso = progressoDaLinha(pedido, item)
    if (corpo.quantity > progresso.pendingDelivery) {
      return conflito(
        `Separado e ainda não entregue: ${progresso.pendingDelivery}. Não se entrega o que ninguém tirou da prateleira.`,
        TIPO.entregaSemSeparacao,
      )
    }

    const fato = gravarFato({
      orderId: pedido.id,
      lineNumber: item.lineNumber,
      kind: 'deliver',
      quantity: corpo.quantity,
      locationId: null,
      deliveryId: romaneio.id,
      stockMovementId: null,
      notes: corpo.notes ?? null,
    })
    return HttpResponse.json(fatoDto(fato, pedido))
  }),

  /**
   * FECHA o romaneio, exigindo QUANDO saiu e QUEM recebeu — seis meses depois,
   * quando o cliente diz que não recebeu, é essa linha que responde.
   *
   * Romaneio VAZIO não fecha: fechar entrega sem item é assinar papel em branco,
   * some da fila de abertos e ninguém percebe até alguém procurar a peça. Quem
   * não saiu se CANCELA.
   */
  http.post('*/api/deliveries/:id/close', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao

    const romaneio = estado.romaneios.find((r) => r.id === String(params.id))
    if (!romaneio) return naoEncontrado('Romaneio não encontrado.')
    if (romaneio.status !== 'open') {
      return conflito('Romaneio já fechado ou cancelado.', TIPO.entregaFechada)
    }
    if (itensDoRomaneio(romaneio).length === 0) {
      return conflito('Romaneio sem item não fecha. Cancele-o, se nada saiu.', TIPO.entregaVazia)
    }

    const corpo = (await request.json()) as CloseDeliveryRequest
    const faltando = [
      corpo?.deliveredAt
        ? null
        : { path: 'deliveredAt', message: 'Informe quando a entrega aconteceu.' },
      corpo?.receivedBy?.trim() ? null : { path: 'receivedBy', message: 'Informe quem recebeu.' },
    ].filter((f): f is { path: string; message: string } => f !== null)
    if (faltando.length) return camposInvalidos(faltando)

    romaneio.status = 'closed'
    romaneio.deliveredAt = corpo.deliveredAt
    romaneio.receivedBy = corpo.receivedBy
    romaneio.receivedDocument = corpo.receivedDocument ?? null
    romaneio.signatureRef = corpo.signatureRef ?? null
    romaneio.closedAt = new Date().toISOString()
    return HttpResponse.json(detalheDoRomaneio(romaneio))
  }),

  /**
   * Cancela o romaneio. **NÃO desfaz os fatos já lançados nele** — o log é
   * append-only por GRANT, e corrigir o passado é estornar, não editar. O ato de
   * estorno é a fase seguinte e ainda não tem caminho no contrato.
   */
  http.post('*/api/deliveries/:id/cancel', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const semPermissao = verificarEscrita('orders')
    if (semPermissao) return semPermissao

    const romaneio = estado.romaneios.find((r) => r.id === String(params.id))
    if (!romaneio) return naoEncontrado('Romaneio não encontrado.')
    if (romaneio.status !== 'open') {
      return conflito('Romaneio já fechado ou cancelado.', TIPO.entregaFechada)
    }
    romaneio.status = 'cancelled'
    return HttpResponse.json(detalheDoRomaneio(romaneio))
  }),
]
