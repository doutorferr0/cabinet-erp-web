import type { PurchaseOrderDto, PurchaseRequestDto } from '@/api/gerado'
import {
  CHAVES_COMPRAS,
  type OrdemDeCompra,
  type PedidoDeCompra,
  URL_ORDENS_COMPRA,
  URL_PEDIDOS_COMPRA,
  faltaParaOMinimo,
  fornecedoresComLinhaAberta,
  linhasAbertasParaOrdem,
  ordemDeCompraVazia,
  ordensDeCompraApi,
  paraEscritaDaOrdem,
  paraEscritaDoPedido,
  paraOrdemDeCompra,
  paraPedidoDeCompra,
  pedidoDeCompraVazio,
  pedidosDeCompraApi,
  subtotalDaOrdem,
  useCancelarOrdemDeCompra,
  useCancelarPedidoDeCompra,
  useEnviarOrdemDeCompra,
  useGravarOrdemDeCompra,
  useGravarPedidoDeCompra,
  usePedidosComLinhaAberta,
  usePrevisaoDeChegada,
  useReagendarOrdemDeCompra,
  useReposicaoDeEstoque,
} from '@/data/compras-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * FRONTEIRA DE COMPRAS contra servidor falso — as 14 operações da família.
 *
 * As 14 estão no contrato desde a web#316 e em `ROTAS_DO_BACKEND` desde 26/08,
 * e `src/data/compras-api.ts` já as consome. O que faltava era ESTE arquivo: a
 * fronteira mais longa do repo não tinha guarda nenhuma sobre o verbo, o corpo
 * e a URL que ela monta.
 *
 * A regra do repo diz por que aqui e não na tela: o cliente gerado chama
 * `fetch(new Request(...))`, então **verbo e corpo vêm do `Request`**. Um teste
 * de tela que asserisse sobre o que aparece na grade passaria verde com o
 * `POST` caindo na resposta do `GET` — que é exatamente o defeito que a
 * gravação de um documento pode ter sem que nada na tela mude.
 *
 * O que se prova aqui, e nada disso é aritmética do servidor:
 *
 * 1. **A tradução não perde campo** — em particular o par `sourceRequestId` +
 *    `sourceLineNumber`, que é o que amarra ordem e pedido.
 * 2. **O derivado NÃO sobe** — situação, número, totais, `sentAt` e o
 *    faturamento mínimo são do servidor; mandá-los daqui seria a tela
 *    reescrever a régua contra a qual ela é medida.
 * 3. **O verbo e o caminho de cada gesto** — gravar escolhe `POST`/`PUT` pelo
 *    id, e enviar/reagendar/cancelar têm caminho próprio.
 * 4. **O que viaja na query** — recorte vazio não vira parâmetro vazio.
 */

const ITEM_PEDIDO = {
  lineNumber: 1,
  variantId: 'var-0001',
  description: 'PENDENTE REDONDO',
  finish: 'PRETO',
  size: 'ÚNICO',
  unit: 'UN',
  quantity: 2.5,
  destination: 'sale',
  supplierId: 'forn-0001',
  supplierName: 'STELLA',
  sourceOrderItemLine: 3,
  purchaseOrderId: null,
  purchaseOrderNumber: null,
  status: 'open',
  notes: 'urgente',
} as const

const PEDIDO: PurchaseRequestDto = {
  id: 'pc-0001',
  number: '1042',
  status: 'open',
  issuedAt: '2026-08-20',
  orderId: 'ped-0001',
  orderNumber: '21653',
  customerId: 'cli-0001',
  customerName: 'ANDRÉ BATALHA',
  itemCount: 2,
  notes: 'entregar no galpão',
  items: [
    { ...ITEM_PEDIDO },
    {
      ...ITEM_PEDIDO,
      lineNumber: 2,
      description: 'TRILHO 1M',
      quantity: 4,
      destination: 'stock',
      supplierId: 'forn-0002',
      supplierName: 'LUMINI',
      sourceOrderItemLine: null,
      purchaseOrderId: 'oc-0009',
      purchaseOrderNumber: '77',
      status: 'ordered',
    },
  ],
}

const ORDEM: PurchaseOrderDto = {
  id: 'oc-0001',
  number: '77',
  status: 'sent',
  supplierId: 'forn-0001',
  supplierName: 'STELLA',
  buyingTenantId: 'emp-0001',
  buyingTenantName: 'VERTZ MATRIZ',
  orderedAt: '2026-08-21',
  sentAt: '2026-08-22',
  expectedAt: '2026-09-10',
  rescheduledAt: '2026-09-25',
  rescheduleReason: 'fábrica em férias coletivas',
  minimumBillingCents: 500_000,
  carrierId: 'tra-0001',
  carrierName: 'BRASPRESS',
  paymentTermId: 'cond-0002',
  paymentTermName: '30/60/90',
  discountPercent: 10_000,
  surchargeCents: 4_500,
  subtotalCents: 117_500,
  totalCents: 122_000,
  notes: 'conferir embalagem',
  items: [
    {
      lineNumber: 1,
      sourceRequestId: 'pc-0001',
      sourceRequestNumber: '1042',
      sourceLineNumber: 1,
      variantId: 'var-0001',
      description: 'PENDENTE REDONDO',
      finish: 'PRETO',
      size: 'ÚNICO',
      unit: 'UN',
      quantity: 2.5,
      quantityReceived: 0,
      unitCostCents: 47_000,
      totalCents: 117_500,
      destination: 'sale',
      productGroupId: 'grp-0001',
      productGroupName: 'PENDENTES',
    },
  ],
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('tradução do PEDIDO — o que o formulário recebe', () => {
  it('nenhum campo do DTO se perde, e o elo com a venda vem junto', () => {
    const pedido = paraPedidoDeCompra(PEDIDO)

    expect(pedido).toMatchObject({
      id: 'pc-0001',
      numero: '1042',
      situacao: 'open',
      dataEmissao: '2026-08-20',
      pedidoVendaId: 'ped-0001',
      pedidoVendaNumero: '21653',
      clienteId: 'cli-0001',
      cliente: 'ANDRÉ BATALHA',
      observacao: 'entregar no galpão',
    })
    expect(pedido.itens).toHaveLength(2)
  })

  it('o FORNECEDOR é da linha, e a linha diz qual ordem já a levou', () => {
    // O fornecedor no cabeçalho seria o pedido de outro sistema: a mesma
    // necessidade se compra de vários, e é isso que faz a ordem ser um recorte.
    const [primeira, segunda] = paraPedidoDeCompra(PEDIDO).itens

    expect(primeira).toMatchObject({
      linha: 1,
      fornecedorId: 'forn-0001',
      fornecedor: 'STELLA',
      situacao: 'open',
      ordemId: null,
      linhaDoPedidoDeVenda: 3,
    })
    expect(segunda).toMatchObject({
      linha: 2,
      fornecedorId: 'forn-0002',
      situacao: 'ordered',
      ordemId: 'oc-0009',
      ordemNumero: '77',
      linhaDoPedidoDeVenda: null,
    })
  })

  it('a quantidade vira TEXTO — a grade é editável e `2,` não pode virar 2', () => {
    expect(paraPedidoDeCompra(PEDIDO).itens[0]?.quantidade).toBe('2,5')
  })
})

describe('escrita do PEDIDO — o que sobe, e o que é do servidor', () => {
  it('o derivado NÃO sobe: situação da linha, ordem que a levou, número e total', () => {
    const corpo = paraEscritaDoPedido(paraPedidoDeCompra(PEDIDO))
    const [linha] = corpo.items

    expect(corpo).not.toHaveProperty('number')
    expect(corpo).not.toHaveProperty('status')
    expect(corpo).not.toHaveProperty('itemCount')
    expect(linha).not.toHaveProperty('status')
    expect(linha).not.toHaveProperty('purchaseOrderId')
    expect(linha).not.toHaveProperty('purchaseOrderNumber')
    expect(linha).not.toHaveProperty('supplierName')
  })

  it('o que sobe sobe inteiro, com a quantidade de volta a número', () => {
    const corpo = paraEscritaDoPedido(paraPedidoDeCompra(PEDIDO))

    expect(corpo).toMatchObject({
      issuedAt: '2026-08-20',
      orderId: 'ped-0001',
      notes: 'entregar no galpão',
    })
    expect(corpo.items[0]).toMatchObject({
      lineNumber: 1,
      variantId: 'var-0001',
      description: 'PENDENTE REDONDO',
      quantity: 2.5,
      destination: 'sale',
      supplierId: 'forn-0001',
      sourceOrderItemLine: 3,
      notes: 'urgente',
    })
  })

  it('`lineNumber` sai da POSIÇÃO — excluir a linha do meio não deixa buraco', () => {
    // Buraco na sequência viraria linha órfã na ordem seguinte, que rastreia a
    // origem justamente por este número.
    const pedido = paraPedidoDeCompra({
      ...PEDIDO,
      items: [
        { ...ITEM_PEDIDO, lineNumber: 1 },
        { ...ITEM_PEDIDO, lineNumber: 7, description: 'ARANDELA' },
        { ...ITEM_PEDIDO, lineNumber: 9, description: 'SPOT' },
      ],
    })

    expect(paraEscritaDoPedido(pedido).items.map((i) => i.lineNumber)).toEqual([1, 2, 3])
  })

  it('documento novo grava com a emissão de hoje, e sem id', () => {
    const vazio = pedidoDeCompraVazio()

    expect(vazio.id).toBe('')
    expect(paraEscritaDoPedido(vazio).issuedAt).toBe(vazio.dataEmissao)
  })
})

describe('tradução da ORDEM — a promessa original e a reprometida convivem', () => {
  it('reagendar NÃO sobrescreve a promessa: as duas datas chegam à tela', () => {
    // É a comparação entre as duas que mede o fornecedor. Uma só apagaria o
    // atraso no ato de registrá-lo.
    const ordem = paraOrdemDeCompra(ORDEM)

    expect(ordem.dataPrevista).toBe('2026-09-10')
    expect(ordem.dataReagendada).toBe('2026-09-25')
    expect(ordem.motivoDoReagendamento).toBe('fábrica em férias coletivas')
  })

  it('a linha carrega a ORIGEM — pedido e número da linha de lá', () => {
    expect(paraOrdemDeCompra(ORDEM).itens[0]).toMatchObject({
      linha: 1,
      pedidoOrigemId: 'pc-0001',
      pedidoOrigemNumero: '1042',
      linhaDeOrigem: 1,
      custoUnitarioCentavos: 47_000,
      totalCentavos: 117_500,
      grupoProdutoId: 'grp-0001',
    })
  })

  it('o faturamento mínimo e os totais chegam como o servidor os congelou', () => {
    expect(paraOrdemDeCompra(ORDEM)).toMatchObject({
      faturamentoMinimoCentavos: 500_000,
      subtotalCentavos: 117_500,
      totalCentavos: 122_000,
      descontoPercentual: 10_000,
      acrescimoCentavos: 4_500,
    })
  })
})

describe('escrita da ORDEM — a amarração viaja, a descrição não', () => {
  it('`sourceRequestId` e `sourceLineNumber` sobem — perdê-los desataria tudo com 200', () => {
    const corpo = paraEscritaDaOrdem(paraOrdemDeCompra(ORDEM))

    expect(corpo.items[0]).toMatchObject({
      lineNumber: 1,
      sourceRequestId: 'pc-0001',
      sourceLineNumber: 1,
      quantity: 2.5,
      unitCostCents: 47_000,
      productGroupId: 'grp-0001',
    })
  })

  it('descrição, acabamento, tamanho e unidade NÃO sobem — vêm congelados do pedido', () => {
    // Mandá-los daqui deixaria a ordem descrever uma peça diferente da pedida.
    const [linha] = paraEscritaDaOrdem(paraOrdemDeCompra(ORDEM)).items

    expect(linha).not.toHaveProperty('description')
    expect(linha).not.toHaveProperty('finish')
    expect(linha).not.toHaveProperty('size')
    expect(linha).not.toHaveProperty('unit')
    expect(linha).not.toHaveProperty('totalCents')
  })

  it('o que é do SERVIDOR fica no servidor: número, situação, envio, mínimo e totais', () => {
    const corpo = paraEscritaDaOrdem(paraOrdemDeCompra(ORDEM))

    for (const campo of [
      'number',
      'status',
      'sentAt',
      'rescheduledAt',
      'minimumBillingCents',
      'subtotalCents',
      'totalCents',
      'supplierName',
    ]) {
      expect(corpo).not.toHaveProperty(campo)
    }
  })

  it('a data prometida SOBE — é a única das três que a tela escolhe', () => {
    expect(paraEscritaDaOrdem(paraOrdemDeCompra(ORDEM))).toMatchObject({
      supplierId: 'forn-0001',
      buyingTenantId: 'emp-0001',
      orderedAt: '2026-08-21',
      expectedAt: '2026-09-10',
      carrierId: 'tra-0001',
      paymentTermId: 'cond-0002',
    })
  })
})

describe('as contas de EXIBIÇÃO da tela', () => {
  it('o subtotal arredonda POR LINHA, e em centavos inteiros', () => {
    // Float em dinheiro é veto do repo: a soma de linhas arredondadas é o que o
    // servidor devolve, e arredondar só no fim daria outro número.
    expect(
      subtotalDaOrdem([
        { quantidade: '2,5', custoUnitarioCentavos: 4_700 },
        { quantidade: '1,333', custoUnitarioCentavos: 1_000 },
      ]),
    ).toBe(11_750 + 1_333)
  })

  it('linha sem custo não soma, e quantidade em branco vale zero', () => {
    expect(
      subtotalDaOrdem([
        { quantidade: '3', custoUnitarioCentavos: null },
        { quantidade: '', custoUnitarioCentavos: 9_900 },
      ]),
    ).toBe(0)
  })

  it('o ACRÉSCIMO não conta para o faturamento mínimo', () => {
    // O contrato diz que frete e taxa não contam. Somá-los faria a tela liberar
    // uma ordem que o servidor recusa com 409.
    const falta = faltaParaOMinimo({
      faturamentoMinimoCentavos: 500_000,
      itens: [{ quantidade: '1', custoUnitarioCentavos: 100_000 }],
    })

    expect(falta).toBe(400_000)
  })

  it('mínimo alcançado e fornecedor sem mínimo são os dois `null`', () => {
    const itens = [{ quantidade: '10', custoUnitarioCentavos: 100_000 }]

    expect(faltaParaOMinimo({ faturamentoMinimoCentavos: 500_000, itens })).toBeNull()
    expect(faltaParaOMinimo({ faturamentoMinimoCentavos: null, itens })).toBeNull()
  })
})

describe('a ponte pedido → ordem', () => {
  it('só a linha ABERTA do fornecedor escolhido vai, já com a origem amarrada', () => {
    // A linha `ordered` seria recusada com `item-ja-em-ordem`: oferecê-la seria
    // montar uma ordem que só falha ao gravar.
    const linhas = linhasAbertasParaOrdem(paraPedidoDeCompra(PEDIDO), 'forn-0001')

    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      linha: 1,
      pedidoOrigemId: 'pc-0001',
      pedidoOrigemNumero: '1042',
      linhaDeOrigem: 1,
      custoUnitarioCentavos: null,
    })
  })

  it('fornecedor sem linha aberta não gera ordem nenhuma', () => {
    // `forn-0002` só tem a linha já levada pela oc-0009.
    expect(linhasAbertasParaOrdem(paraPedidoDeCompra(PEDIDO), 'forn-0002')).toEqual([])
  })

  it('o combo de fornecedores lista só quem tem linha aberta, sem repetir', () => {
    const pedido = paraPedidoDeCompra({
      ...PEDIDO,
      items: [
        { ...ITEM_PEDIDO, lineNumber: 1 },
        { ...ITEM_PEDIDO, lineNumber: 2, description: 'ARANDELA' },
        { ...ITEM_PEDIDO, lineNumber: 3, supplierId: 'forn-0003', supplierName: 'DELUX' },
        { ...ITEM_PEDIDO, lineNumber: 4, supplierId: 'forn-0009', status: 'ordered' },
      ],
    })

    expect(fornecedoresComLinhaAberta(pedido)).toEqual([
      { id: 'forn-0001', nome: 'STELLA' },
      { id: 'forn-0003', nome: 'DELUX' },
    ])
  })
})

describe('as duas raízes de cache', () => {
  it('a folha NÃO é prefixo da listagem — invalidar uma deixaria a outra parada', () => {
    // A comparação do TanStack é elemento a elemento: `['pedido-compra']` nunca
    // casaria `['pedidos-compra']`, e é por isso que são duas raízes.
    expect(CHAVES_COMPRAS.pedidos).not.toEqual(CHAVES_COMPRAS.pedido)
    expect(CHAVES_COMPRAS.umPedido('pc-0001')).toEqual(['pedido-compra', 'pc-0001'])
    expect(CHAVES_COMPRAS.umaOrdem('oc-0001')).toEqual(['ordem-compra', 'oc-0001'])
  })
})

describe('listagem e ficha contra o servidor', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      [URL_PEDIDOS_COMPRA]: () => json({ rows: [PEDIDO], total: 1 }),
      [`${URL_PEDIDOS_COMPRA}/pc-0001`]: () => json(PEDIDO),
      [`${URL_PEDIDOS_COMPRA}/pc-9999`]: () => problema(404, 'Pedido de compra não encontrado'),
      [URL_ORDENS_COMPRA]: () => json({ rows: [ORDEM], total: 1 }),
      [`${URL_ORDENS_COMPRA}/oc-0001`]: () => json(ORDEM),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('a listagem do pedido é GET, e a grade recebe o DTO CRU', async () => {
    // Cru porque o `sortBy` da coluna tem de casar com a whitelist do servidor:
    // traduzir o nome quebraria a ordenação com 400 só ao clicar no cabeçalho.
    const pagina = await pedidosDeCompraApi.list(tableState({ q: '1042' }))

    const chamada = servidor.em(URL_PEDIDOS_COMPRA).at(-1)
    expect(chamada?.metodo).toBe('GET')
    expect(new URL(chamada?.url ?? '').searchParams.get('q')).toBe('1042')
    expect(pagina).toEqual({ rows: [PEDIDO], total: 1 })
  })

  it('a ordenação viaja como `sortBy`/`sortDesc`, os nomes do servidor', async () => {
    await ordensDeCompraApi.list(tableState({ sort: { id: 'expectedAt', desc: true } }))

    const parametros = new URL(servidor.em(URL_ORDENS_COMPRA).at(-1)?.url ?? '').searchParams
    expect(parametros.get('sortBy')).toBe('expectedAt')
    expect(parametros.get('sortDesc')).toBe('true')
  })

  it('a ficha do pedido é GET por id, e chega TRADUZIDA', async () => {
    const pedido = await pedidosDeCompraApi.get('pc-0001')

    expect(servidor.em(`${URL_PEDIDOS_COMPRA}/pc-0001`).at(-1)?.metodo).toBe('GET')
    expect(pedido?.numero).toBe('1042')
    expect(pedido?.itens[0]?.fornecedor).toBe('STELLA')
  })

  it('a ficha da ordem chega traduzida, com a origem de cada linha', async () => {
    const ordem = await ordensDeCompraApi.get('oc-0001')

    expect(ordem?.numero).toBe('77')
    expect(ordem?.itens[0]?.pedidoOrigemNumero).toBe('1042')
  })

  it('404 na ficha é `null`, não erro — "não existe" não é falha de rede', async () => {
    await expect(pedidosDeCompraApi.get('pc-9999')).resolves.toBeNull()
  })

  it('documento em branco não fala com o servidor', () => {
    expect(pedidosDeCompraApi.empty().id).toBe('')
    expect(ordensDeCompraApi.empty()).toEqual(ordemDeCompraVazia())
    expect(servidor.chamadas).toHaveLength(0)
  })
})

describe('o VERBO e o CAMINHO de cada gesto', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      [URL_PEDIDOS_COMPRA]: () => json(PEDIDO, 201),
      [`${URL_PEDIDOS_COMPRA}/pc-0001`]: () => json(PEDIDO),
      [`${URL_PEDIDOS_COMPRA}/pc-0001/cancel`]: () => json({ ...PEDIDO, status: 'cancelled' }),
      [URL_ORDENS_COMPRA]: () => json(ORDEM, 201),
      [`${URL_ORDENS_COMPRA}/oc-0001`]: () => json(ORDEM),
      [`${URL_ORDENS_COMPRA}/oc-0001/send`]: () => json(ORDEM),
      [`${URL_ORDENS_COMPRA}/oc-0001/reschedule`]: () => json(ORDEM),
      [`${URL_ORDENS_COMPRA}/oc-0001/cancel`]: () => json({ ...ORDEM, status: 'cancelled' }),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  async function gravarPedido(pedido: PedidoDeCompra) {
    const { result } = renderHook(() => useGravarPedidoDeCompra(), { wrapper })
    result.current.mutate(pedido)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  }

  async function gravarOrdem(ordem: OrdemDeCompra) {
    const { result } = renderHook(() => useGravarOrdemDeCompra(), { wrapper })
    result.current.mutate(ordem)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  }

  it('pedido SEM id é POST na coleção', async () => {
    await gravarPedido({ ...pedidoDeCompraVazio(), observacao: 'nova necessidade' })

    const chamada = servidor.em(URL_PEDIDOS_COMPRA).at(-1)
    expect(chamada?.metodo).toBe('POST')
    expect(chamada?.corpo).toMatchObject({ notes: 'nova necessidade' })
  })

  it('pedido COM id é PUT no recurso, com o corpo integral', async () => {
    // O `PUT` do contrato é integral: linha que não sobe é linha excluída, e é
    // por isso que o corpo tem de trazer a grade inteira.
    await gravarPedido(paraPedidoDeCompra(PEDIDO))

    const chamada = servidor.em(`${URL_PEDIDOS_COMPRA}/pc-0001`).at(-1)
    expect(chamada?.metodo).toBe('PUT')
    expect((chamada?.corpo as { items: unknown[] }).items).toHaveLength(2)
    expect(servidor.em(URL_PEDIDOS_COMPRA)).toHaveLength(0)
  })

  it('ordem SEM id é POST, e COM id é PUT — a mesma decisão, num lugar só', async () => {
    await gravarOrdem({ ...ordemDeCompraVazia(), fornecedorId: 'forn-0001' })
    expect(servidor.em(URL_ORDENS_COMPRA).at(-1)?.metodo).toBe('POST')

    await gravarOrdem(paraOrdemDeCompra(ORDEM))
    expect(servidor.em(`${URL_ORDENS_COMPRA}/oc-0001`).at(-1)?.metodo).toBe('PUT')
  })

  it('ENVIAR é POST em `/send`, e a data omitida vira `null` — o servidor carimba', async () => {
    const { result } = renderHook(() => useEnviarOrdemDeCompra(), { wrapper })
    result.current.mutate({ id: 'oc-0001' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const chamada = servidor.em(`${URL_ORDENS_COMPRA}/oc-0001/send`).at(-1)
    expect(chamada?.metodo).toBe('POST')
    expect(chamada?.corpo).toEqual({ sentAt: null })
    // Enviar não é gravar: o `PUT` depois disto é 409 `ordem-ja-enviada`.
    expect(servidor.em(`${URL_ORDENS_COMPRA}/oc-0001`)).toHaveLength(0)
  })

  it('REAGENDAR é POST em `/reschedule`, com a data nova e o motivo', async () => {
    const { result } = renderHook(() => useReagendarOrdemDeCompra(), { wrapper })
    result.current.mutate({ id: 'oc-0001', dataPrevista: '2026-10-01', motivo: 'greve' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const chamada = servidor.em(`${URL_ORDENS_COMPRA}/oc-0001/reschedule`).at(-1)
    expect(chamada?.metodo).toBe('POST')
    expect(chamada?.corpo).toEqual({ expectedAt: '2026-10-01', reason: 'greve' })
  })

  it('CANCELAR é POST em `/cancel` nos dois documentos — nunca DELETE', async () => {
    // Desativação lógica é padrão da casa: o documento continua na listagem,
    // marcado. `DELETE` apagaria o histórico de compra.
    const pedido = renderHook(() => useCancelarPedidoDeCompra(), { wrapper })
    pedido.result.current.mutate('pc-0001')
    await waitFor(() => expect(pedido.result.current.isSuccess).toBe(true))

    const ordem = renderHook(() => useCancelarOrdemDeCompra(), { wrapper })
    ordem.result.current.mutate('oc-0001')
    await waitFor(() => expect(ordem.result.current.isSuccess).toBe(true))

    expect(servidor.em(`${URL_PEDIDOS_COMPRA}/pc-0001/cancel`).at(-1)?.metodo).toBe('POST')
    expect(servidor.em(`${URL_ORDENS_COMPRA}/oc-0001/cancel`).at(-1)?.metodo).toBe('POST')
    expect(servidor.chamadas.every((c) => c.metodo !== 'DELETE')).toBe(true)
  })

  it('falha de gravação NÃO vira sucesso mudo — o `detail` do servidor chega ao chamador', async () => {
    instalarServidor({
      [URL_ORDENS_COMPRA]: () => problema(409, 'A ordem não alcança o faturamento mínimo.'),
    })
    const { result } = renderHook(() => useGravarOrdemDeCompra(), { wrapper })
    result.current.mutate({ ...ordemDeCompraVazia(), fornecedorId: 'forn-0001' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { detail?: string })?.detail).toBe(
      'A ordem não alcança o faturamento mínimo.',
    )
  })
})

describe('as duas consultas — o que viaja na query', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      '/api/purchases/arrival-forecast': () => json({ rows: [], total: 0 }),
      '/api/purchases/stock-replenishment': () => json({ rows: [], total: 0 }),
      [URL_PEDIDOS_COMPRA]: () => json({ rows: [PEDIDO], total: 1 }),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  async function parametros(caminho: string, render: () => { isSuccess: boolean }) {
    const { result } = renderHook(render, { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const chamada = servidor.em(caminho).at(-1)
    // Explodir em vez de asserir sobre `undefined`: hook que não chamou o
    // servidor faria toda asserção de query passar por vacuidade.
    if (!chamada) throw new Error(`o hook não chamou ${caminho}`)
    return new URL(chamada.url).searchParams
  }

  it('a previsão ordena por `expectedAt` crescente por padrão', async () => {
    const query = await parametros('/api/purchases/arrival-forecast', () => usePrevisaoDeChegada())

    expect(query.get('sortBy')).toBe('expectedAt')
    expect(query.get('sortDesc')).toBe('false')
  })

  it('recorte vazio da previsão NÃO vira parâmetro vazio', async () => {
    // "sem recorte" e "recorte vazio" são perguntas diferentes para o servidor,
    // e a primeira é o padrão.
    const query = await parametros('/api/purchases/arrival-forecast', () => usePrevisaoDeChegada())

    for (const campo of [
      'q',
      'supplierId',
      'customerId',
      'destination',
      'lateOnly',
      'from',
      'to',
    ]) {
      expect(query.has(campo)).toBe(false)
    }
  })

  it('o recorte pedido viaja com os nomes do contrato', async () => {
    const query = await parametros('/api/purchases/arrival-forecast', () =>
      usePrevisaoDeChegada({
        fornecedorId: 'forn-0001',
        clienteId: 'cli-0001',
        destino: 'sale',
        soAtrasadas: true,
        de: '2026-08-01',
        ate: '2026-08-31',
      }),
    )

    expect(Object.fromEntries(query)).toMatchObject({
      supplierId: 'forn-0001',
      customerId: 'cli-0001',
      destination: 'sale',
      lateOnly: 'true',
      from: '2026-08-01',
      to: '2026-08-31',
    })
  })

  it('a reposição ordena pela sugestão, decrescente — o que falta mais primeiro', async () => {
    const query = await parametros('/api/purchases/stock-replenishment', () =>
      useReposicaoDeEstoque(),
    )

    expect(query.get('sortBy')).toBe('qtySuggested')
    expect(query.get('sortDesc')).toBe('true')
  })

  it('`soAbaixoDoMinimo` falso não viaja — o padrão é o quadro inteiro', async () => {
    const query = await parametros('/api/purchases/stock-replenishment', () =>
      useReposicaoDeEstoque({ soAbaixoDoMinimo: false, depositoId: 'dep-0001' }),
    )

    expect(query.has('belowMinimumOnly')).toBe(false)
    expect(query.get('locationId')).toBe('dep-0001')
  })

  it('os pedidos com linha aberta pedem o conjunto INTEIRO, recortado por fornecedor', async () => {
    // É a matéria-prima da ordem: uma página cortada montaria a ordem faltando
    // linhas que existem.
    const query = await parametros(URL_PEDIDOS_COMPRA, () => usePedidosComLinhaAberta('forn-0001'))

    expect(query.get('supplierId')).toBe('forn-0001')
    expect(query.get('onlyOpenItems')).toBe('true')
    expect(query.get('pageSize')).toBe('100')
  })

  it('sem fornecedor a consulta NÃO sai — traria todos os pedidos da empresa', async () => {
    const { result } = renderHook(() => usePedidosComLinhaAberta(''), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(servidor.em(URL_PEDIDOS_COMPRA)).toHaveLength(0)
  })
})
