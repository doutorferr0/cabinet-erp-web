import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  cancelPurchaseOrder,
  cancelPurchaseRequest,
  createPurchaseOrder,
  createPurchaseRequest,
  getPurchaseArrivalForecast,
  getPurchaseRequest,
  getPurchaseStockReplenishment,
  listPurchaseOrders,
  listPurchaseRequests,
  reschedulePurchaseOrder,
  sendPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseRequest,
} from '@/api/gerado'
import { idDeApoio } from '@/mocks/lookups'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetCompras } from './compras'
import { handlers } from './handlers'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore } from './store'

/**
 * O MOCK DE COMPRAS (G2) — pedido, ordem e as duas consultas.
 *
 * Trava as SEMÂNTICAS, não o dado do seed. As que este arquivo existe para
 * provar são as que somem em silêncio se ninguém as cobrar, e cada uma delas é
 * uma decisão do contrato ou de uma das duas migrações (`0037`/`0038`):
 *
 * 1. **A ordem RESERVA a linha de pedido e o cancelamento DEVOLVE.** É o estado
 *    que faltava ao mock inteiro, e é o que sustenta `status` derivado,
 *    `onlyOpenItems` e os dois 409 de conflito.
 * 2. **A ordem é de UM fornecedor; o pedido é de vários.** Fornecedor na LINHA
 *    é a decisão central do módulo, e sem ela a tela de montar ordem não teria
 *    o que agrupar.
 * 3. **O faturamento mínimo NÃO conta o acréscimo.** Frete não é mercadoria, e
 *    é o caso em que o servidor aprovaria o que o fornecedor recusa.
 * 4. **`reschedule` guarda as DUAS datas.** Sobrescrever a prometida faria o
 *    fornecedor que atrasou terminar com uma data cumprida.
 *
 * Exercita pelo CLIENTE GERADO, e não por `fetch` cru — é o caminho inteiro que
 * a tela vai usar quando houver tela.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  resetCompras()
  configurarApi('http://mock.teste')
})

async function entrar(tenantId = TENANT_MATRIZ) {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId })
}

const EVOLED = 'parc-0001'
const MISTER_LED = 'parc-0006'
/**
 * Os grupos de produto vêm do CATÁLOGO (`catalog-lookups`, kind
 * `GRUPO_PRODUTO`), como qualquer combo — e não de um id inventado no caso. A
 * MISTER LED impõe mínimo em `PENDENTES` e em nenhum outro, que é o par de que
 * as duas contas precisam: uma com mínimo próprio, outra sem.
 */
const PENDENTES = idDeApoio('GRUPO_PRODUTO', 'PENDENTES') as string
const FRETE = idDeApoio('GRUPO_PRODUTO', 'FRETE') as string

/** O pedido do seed com as DUAS linhas de fornecedores diferentes. */
async function pedidoMisturado() {
  const lista = await listPurchaseRequests({ page: 1, pageSize: 50 })
  if (lista.status !== 200) throw new Error('listagem falhou')
  const achado = lista.data.rows.find((p) => p.items.length === 2)
  if (!achado) throw new Error('o seed perdeu o pedido de dois fornecedores')
  return achado
}

/** A linha ABERTA (não levada por ordem) de um fornecedor, para montar ordem. */
async function linhaAberta(supplierId: string) {
  const lista = await listPurchaseRequests({ page: 1, pageSize: 50 })
  if (lista.status !== 200) throw new Error('listagem falhou')
  for (const pedido of lista.data.rows) {
    const linha = pedido.items.find((i) => i.status === 'open' && i.supplierId === supplierId)
    if (linha) return { pedido, linha }
  }
  throw new Error(`sem linha aberta de ${supplierId}`)
}

/**
 * Uma linha ABERTA da MISTER LED, criada pelo próprio caso.
 *
 * A única linha dela no seed já está numa ordem (`oc-0002`), e é assim de
 * propósito — é o que sustenta o caso do reagendamento. As contas de mínimo por
 * grupo precisam de linha livre, e criá-la aqui é o caminho que o comprador
 * percorre: pedido primeiro, ordem depois.
 */
async function pedidoAbertoDaMisterLed() {
  const criado = await createPurchaseRequest({
    issuedAt: '2026-08-20',
    items: [
      {
        lineNumber: 1,
        description: 'PENDENTE ALUMÍNIO 40CM',
        quantity: 1,
        destination: 'stock',
        supplierId: MISTER_LED,
      },
    ],
  })
  if (criado.status !== 201) throw new Error('o pedido da MISTER LED não foi criado')
  const linha = criado.data.items[0]
  if (!linha) throw new Error('o pedido nasceu sem linha')
  return { pedido: criado.data, linha }
}

const ORDEM_BASE = {
  buyingTenantId: TENANT_MATRIZ,
  orderedAt: '2026-08-20',
  discountPercent: 0,
  surchargeCents: 0,
}

describe('sessão e empresa', () => {
  it('sem sessão é 401 nas quatro listagens', async () => {
    for (const chamada of [
      listPurchaseRequests,
      listPurchaseOrders,
      getPurchaseArrivalForecast,
      getPurchaseStockReplenishment,
    ]) {
      expect((await chamada()).status).toBe(401)
    }
  })

  it('sem empresa a LEITURA DE LISTA é vazia, não erro', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })

    for (const chamada of [
      listPurchaseRequests,
      listPurchaseOrders,
      getPurchaseArrivalForecast,
      getPurchaseStockReplenishment,
    ]) {
      const resposta = await chamada()
      expect(resposta.status).toBe(200)
      if (resposta.status === 200) expect(resposta.data).toEqual({ rows: [], total: 0 })
    }
  })

  it('sem empresa o DETALHE e a ESCRITA são 409 — a assimetria do contrato', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })

    const detalhe = await getPurchaseRequest('pc-0001')
    expect(detalhe.status).toBe(409)
    if (detalhe.status === 409) {
      expect(detalhe.data.type).toBe('urn:cabinet:erro:sem-empresa-ativa')
    }

    const escrita = await createPurchaseRequest({ issuedAt: '2026-08-20', items: [] })
    expect(escrita.status).toBe(409)
  })

  it('o pedido de uma empresa não existe para a outra', async () => {
    await entrar(TENANT_FILIAL)
    const lista = await listPurchaseRequests({ page: 1, pageSize: 50 })
    expect(lista.status).toBe(200)
    if (lista.status === 200) expect(lista.data.total).toBe(0)
  })

  it('papel que não alcança a escrita é 403, e a LEITURA continua passando', async () => {
    // A FILIAL é `viewer` no seed. Ler é o que `viewer` existe para fazer.
    await entrar(TENANT_FILIAL)

    const leitura = await listPurchaseOrders()
    expect(leitura.status).toBe(200)

    const escrita = await createPurchaseRequest({ issuedAt: '2026-08-20', items: [] })
    expect(escrita.status).toBe(403)
    if (escrita.status === 403) {
      expect(escrita.data.type).toBe('urn:cabinet:erro:papel-insuficiente')
    }
  })
})

describe('pedido de compra', () => {
  it('o NÚMERO é do servidor, e o status nasce derivado das linhas', async () => {
    await entrar()
    const criado = await createPurchaseRequest({
      issuedAt: '2026-08-20',
      items: [
        {
          lineNumber: 1,
          description: 'FITA LED 2700K 5M',
          quantity: 5,
          destination: 'stock',
          supplierId: EVOLED,
        },
      ],
    })

    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    expect(criado.data.number).toMatch(/^PC-\d+$/)
    expect(criado.data.status).toBe('open')
    expect(criado.data.itemCount).toBe(1)
    expect(criado.data.items[0]?.status).toBe('open')
    // O nome do fornecedor é DERIVADO do id, nunca recebido.
    expect(criado.data.items[0]?.supplierName).toBe('EVOLED ILUMINACAO LTDA')
  })

  it('o mesmo pedido carrega linhas de fornecedores DIFERENTES', async () => {
    await entrar()
    const pedido = await pedidoMisturado()
    const fornecedores = new Set(pedido.items.map((i) => i.supplierId))

    expect(
      fornecedores.size,
      'fornecedor na LINHA é a decisão central do módulo — sem dois, não há o que agrupar',
    ).toBe(2)
  })

  it('encomenda sem o pedido de venda é 400, e reposição COM linha de venda também', async () => {
    await entrar()

    const semVenda = await createPurchaseRequest({
      issuedAt: '2026-08-20',
      items: [
        {
          lineNumber: 1,
          description: 'ARANDELA',
          quantity: 1,
          destination: 'sale',
          supplierId: EVOLED,
          sourceOrderItemLine: 1,
        },
      ],
    })
    expect(semVenda.status, 'sale sem orderId no cabeçalho').toBe(400)

    const reposicaoComOrigem = await createPurchaseRequest({
      issuedAt: '2026-08-20',
      orderId: 'ped-0001',
      items: [
        {
          lineNumber: 1,
          description: 'ARANDELA',
          quantity: 1,
          destination: 'stock',
          supplierId: EVOLED,
          sourceOrderItemLine: 1,
        },
      ],
    })
    expect(reposicaoComOrigem.status, 'stock com linha de venda é a mesma incoerência').toBe(400)
  })

  it('parceiro que não é fornecedor é 400 — o papel importa', async () => {
    await entrar()
    const resposta = await createPurchaseRequest({
      issuedAt: '2026-08-20',
      items: [
        {
          lineNumber: 1,
          description: 'ARANDELA',
          quantity: 1,
          destination: 'stock',
          // `parc-0003` é CLIENTE no seed.
          supplierId: 'parc-0003',
        },
      ],
    })
    expect(resposta.status).toBe(400)
  })

  it('PUT substitui o pedido INTEIRO, itens junto', async () => {
    await entrar()
    const criado = await createPurchaseRequest({
      issuedAt: '2026-08-20',
      notes: 'ORIGINAL',
      items: [
        {
          lineNumber: 1,
          description: 'UM',
          quantity: 1,
          destination: 'stock',
          supplierId: EVOLED,
        },
        {
          lineNumber: 2,
          description: 'DOIS',
          quantity: 2,
          destination: 'stock',
          supplierId: EVOLED,
        },
      ],
    })
    if (criado.status !== 201) throw new Error('criação falhou')

    const trocado = await updatePurchaseRequest(criado.data.id, {
      issuedAt: '2026-08-21',
      items: [
        {
          lineNumber: 1,
          description: 'SÓ ESTA',
          quantity: 9,
          destination: 'stock',
          supplierId: EVOLED,
        },
      ],
    })

    expect(trocado.status).toBe(200)
    if (trocado.status !== 200) return
    expect(trocado.data.items).toHaveLength(1)
    expect(trocado.data.items[0]?.description).toBe('SÓ ESTA')
    // O que o corpo não trouxe foi APAGADO, não preservado.
    expect(trocado.data.notes).toBeNull()
  })

  it('pedido com linha já em ordem não se reescreve nem se cancela', async () => {
    await entrar()
    const lista = await listPurchaseRequests({ page: 1, pageSize: 50 })
    if (lista.status !== 200) throw new Error('listagem falhou')
    const emOrdem = lista.data.rows.find((p) => p.items.some((i) => i.status === 'ordered'))
    if (!emOrdem) throw new Error('o seed perdeu o pedido já levado por ordem')

    const put = await updatePurchaseRequest(emOrdem.id, {
      issuedAt: '2026-08-21',
      items: [],
    })
    expect(put.status).toBe(409)
    if (put.status === 409) expect(put.data.type).toBe('urn:cabinet:erro:item-ja-em-ordem')

    const cancelamento = await cancelPurchaseRequest(emOrdem.id)
    expect(cancelamento.status).toBe(409)
  })

  it('cancelar duas vezes é 409, não um segundo cancelamento silencioso', async () => {
    await entrar()
    const criado = await createPurchaseRequest({ issuedAt: '2026-08-20', items: [] })
    if (criado.status !== 201) throw new Error('criação falhou')

    const primeiro = await cancelPurchaseRequest(criado.data.id)
    expect(primeiro.status).toBe(200)
    if (primeiro.status === 200) expect(primeiro.data.status).toBe('cancelled')

    const segundo = await cancelPurchaseRequest(criado.data.id)
    expect(segundo.status).toBe(409)
  })

  it('`supplierId` recorta por LINHA, e `onlyOpenItems` esconde o já atendido', async () => {
    await entrar()

    const doMisterLed = await listPurchaseRequests({ supplierId: MISTER_LED, pageSize: 50 })
    expect(doMisterLed.status).toBe(200)
    if (doMisterLed.status === 200) {
      // O pedido volta INTEIRO — o recorte é sobre quem tem a linha, não sobre
      // quais linhas mostrar.
      expect(
        doMisterLed.data.rows.every((p) => p.items.some((i) => i.supplierId === MISTER_LED)),
      ).toBe(true)
    }

    const abertos = await listPurchaseRequests({ onlyOpenItems: true, pageSize: 50 })
    if (abertos.status === 200) {
      expect(abertos.data.rows.every((p) => p.items.some((i) => i.status === 'open'))).toBe(true)
    }
  })
})

describe('ordem de compra', () => {
  it('agrupa a linha do pedido e CONGELA a descrição da origem', async () => {
    await entrar()
    const { pedido, linha } = await linhaAberta(EVOLED)

    const criada = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: linha.quantity,
          unitCostCents: 100_000,
        },
      ],
    })

    expect(criada.status).toBe(201)
    if (criada.status !== 201) return
    expect(criada.data.status).toBe('draft')
    expect(criada.data.number).toMatch(/^OC-\d+$/)
    // COPIADA da linha do pedido: o cliente não manda descrição.
    expect(criada.data.items[0]?.description).toBe(linha.description)
    expect(criada.data.items[0]?.sourceRequestNumber).toBe(pedido.number)
    expect(criada.data.items[0]?.totalCents).toBe(Math.round(linha.quantity * 100_000))
    expect(criada.data.subtotalCents).toBe(criada.data.items[0]?.totalCents)

    // A linha de origem passou a RESERVADA, e o pedido reflete isso.
    const relido = await getPurchaseRequest(pedido.id)
    if (relido.status === 200) {
      const origem = relido.data.items.find((i) => i.lineNumber === linha.lineNumber)
      expect(origem?.status).toBe('ordered')
      expect(origem?.purchaseOrderNumber).toBe(criada.data.number)
    }
  })

  it('linha de OUTRO fornecedor é 409 fornecedor-divergente', async () => {
    await entrar()
    const { pedido, linha } = await linhaAberta(EVOLED)

    const resposta = await createPurchaseOrder({
      ...ORDEM_BASE,
      // A ordem diz MISTER LED; a linha é da EVOLED.
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 100,
        },
      ],
    })

    expect(resposta.status).toBe(409)
    if (resposta.status === 409) {
      expect(resposta.data.type).toBe('urn:cabinet:erro:fornecedor-divergente')
    }
  })

  it('linha já levada por outra ordem é 409 item-ja-em-ordem', async () => {
    await entrar()
    const lista = await listPurchaseRequests({ pageSize: 50 })
    if (lista.status !== 200) throw new Error('listagem falhou')
    const comLinhaTomada = lista.data.rows
      .flatMap((p) => p.items.map((i) => ({ p, i })))
      .find(({ i }) => i.status === 'ordered' && i.supplierId === EVOLED)
    if (!comLinhaTomada) throw new Error('o seed perdeu a linha já em ordem')

    const resposta = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: comLinhaTomada.p.id,
          sourceLineNumber: comLinhaTomada.i.lineNumber,
          quantity: 1,
          unitCostCents: 100,
        },
      ],
    })

    expect(resposta.status).toBe(409)
    if (resposta.status === 409) {
      expect(resposta.data.type).toBe('urn:cabinet:erro:item-ja-em-ordem')
    }
  })

  it('o faturamento mínimo recusa, e o ACRÉSCIMO não pode salvá-la', async () => {
    await entrar()
    const { pedido, linha } = await linhaAberta(EVOLED)
    // EVOLED exige R$ 2.500 no seed. A linha vale bem menos.
    const abaixo = {
      ...ORDEM_BASE,
      supplierId: EVOLED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 10_000,
        },
      ],
    }

    const recusada = await createPurchaseOrder(abaixo)
    expect(recusada.status).toBe(409)
    if (recusada.status === 409) {
      expect(recusada.data.type).toBe('urn:cabinet:erro:faturamento-minimo-nao-atingido')
    }

    // R$ 2.400 de frete NÃO completam o mínimo: frete não é mercadoria.
    const comFrete = await createPurchaseOrder({ ...abaixo, surchargeCents: 240_000 })
    expect(
      comFrete.status,
      'acréscimo que completa o mínimo faria o fornecedor recusar o que o servidor aprovou',
    ).toBe(409)
  })

  it('o mínimo POR GRUPO é conta própria, e não some na soma geral', async () => {
    await entrar()
    // A MISTER LED é quem o seed configura sem mínimo geral e COM mínimo por
    // grupo — o único arranjo em que a recusa só pode ter vindo da conta do
    // grupo. O par (fornecedor, grupo) era escrito direto no store aqui,
    // enquanto o kind `GRUPO_PRODUTO` não existia em `catalog-lookups` e não
    // havia id legítimo para ele; agora sai do catálogo, como qualquer combo.
    const { pedido, linha } = await pedidoAbertoDaMisterLed()
    const resposta = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 10_000,
          productGroupId: PENDENTES,
        },
      ],
    })

    expect(resposta.status, 'sem mínimo geral, a recusa só pode vir da conta do grupo').toBe(409)
    if (resposta.status === 409) {
      expect(resposta.data.type).toBe('urn:cabinet:erro:faturamento-minimo-nao-atingido')
      // O NOME do grupo na frase, e não o id: era o id que saía enquanto o
      // catálogo não tinha a linha, e frase com uuid no meio não diz ao
      // comprador o que fazer.
      expect(resposta.data.detail).toContain('PENDENTES')
    }
  })

  it('linha de grupo SEM mínimo próprio cai na conta geral, não na do grupo', async () => {
    await entrar()
    // O outro lado da mesma decisão, e o que "substitui" quer dizer: a MISTER
    // LED singularizou PENDENTES e mais nada, então a linha de FRETE não tem
    // conta própria — ela soma contra o mínimo geral, que aqui é NULO. Sem
    // mínimo geral e sem mínimo do grupo, a ordem passa.
    const { pedido, linha } = await pedidoAbertoDaMisterLed()
    const resposta = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 10_000,
          productGroupId: FRETE,
        },
      ],
    })

    expect(resposta.status, 'grupo sem mínimo próprio não inventa conta').toBe(201)
  })

  it('o desconto está na escala da casa: 10000 = 1%', async () => {
    await entrar()
    const { pedido, linha } = await linhaAberta(EVOLED)
    const criada = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      // 10% na escala de 4 casas.
      discountPercent: 100_000,
      surchargeCents: 5_000,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 1_000_000,
        },
      ],
    })

    expect(criada.status).toBe(201)
    if (criada.status !== 201) return
    expect(criada.data.subtotalCents).toBe(1_000_000)
    // 1.000.000 − 10% + 5.000 = 905.000
    expect(criada.data.totalCents).toBe(905_000)
  })

  it('desconto fora da escala é 400 — 100 não é "cem por cento" aqui', async () => {
    await entrar()
    const { pedido, linha } = await linhaAberta(EVOLED)
    const resposta = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      discountPercent: 1_000_001,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 100,
        },
      ],
    })
    expect(resposta.status).toBe(400)
  })

  it('enviar carimba a data; reenviar e reescrever são 409', async () => {
    await entrar()
    const { pedido, linha } = await linhaAberta(EVOLED)
    const criada = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 300_000,
        },
      ],
    })
    if (criada.status !== 201) throw new Error('criação falhou')

    const enviada = await sendPurchaseOrder(criada.data.id, { sentAt: '2026-08-21' })
    expect(enviada.status).toBe(200)
    if (enviada.status === 200) {
      expect(enviada.data.status).toBe('sent')
      expect(enviada.data.sentAt).toBe('2026-08-21')
    }

    const dedoBobo = await sendPurchaseOrder(criada.data.id, {})
    expect(dedoBobo.status).toBe(409)
    if (dedoBobo.status === 409) {
      expect(dedoBobo.data.type).toBe('urn:cabinet:erro:ordem-ja-enviada')
    }

    const reescrita = await updatePurchaseOrder(criada.data.id, {
      ...ORDEM_BASE,
      supplierId: EVOLED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 2,
          unitCostCents: 300_000,
        },
      ],
    })
    expect(reescrita.status).toBe(409)
  })

  it('reagendar guarda as DUAS datas, e só vale para ordem enviada', async () => {
    await entrar()
    const { pedido, linha } = await linhaAberta(EVOLED)
    const criada = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      expectedAt: '2026-09-10',
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 300_000,
        },
      ],
    })
    if (criada.status !== 201) throw new Error('criação falhou')

    const cedoDemais = await reschedulePurchaseOrder(criada.data.id, {
      expectedAt: '2026-09-20',
      reason: 'ATRASO',
    })
    expect(cedoDemais.status, 'antes do envio não há promessa a quebrar').toBe(409)

    await sendPurchaseOrder(criada.data.id, {})
    const reagendada = await reschedulePurchaseOrder(criada.data.id, {
      expectedAt: '2026-09-20',
      reason: 'FORNECEDOR ATRASOU',
    })

    expect(reagendada.status).toBe(200)
    if (reagendada.status !== 200) return
    expect(reagendada.data.rescheduledAt).toBe('2026-09-20')
    expect(
      reagendada.data.expectedAt,
      'a promessa ORIGINAL fica — é a diferença entre as duas que mede o atraso',
    ).toBe('2026-09-10')
  })

  it('reagendar sem motivo é 400', async () => {
    await entrar()
    const ordens = await listPurchaseOrders({ status: 'sent', pageSize: 10 })
    if (ordens.status !== 200 || !ordens.data.rows[0]) throw new Error('o seed perdeu a ordem')

    const resposta = await reschedulePurchaseOrder(ordens.data.rows[0].id, {
      expectedAt: '2026-10-01',
      reason: '',
    })
    expect(resposta.status).toBe(400)
  })

  it('CANCELAR A ORDEM DEVOLVE a linha de pedido ao aberto', async () => {
    await entrar()
    const ordens = await listPurchaseOrders({ status: 'sent', pageSize: 10 })
    if (ordens.status !== 200 || !ordens.data.rows[0]) throw new Error('o seed perdeu a ordem')
    const ordem = ordens.data.rows[0]
    const origem = ordem.items[0]
    if (!origem) throw new Error('ordem sem linha')

    const antes = await getPurchaseRequest(origem.sourceRequestId)
    if (antes.status === 200) {
      expect(antes.data.items.find((i) => i.lineNumber === origem.sourceLineNumber)?.status).toBe(
        'ordered',
      )
    }

    // Cancelar ordem ENVIADA é permitido: o fornecedor cancela pedido.
    const cancelada = await cancelPurchaseOrder(ordem.id)
    expect(cancelada.status).toBe(200)
    if (cancelada.status === 200) expect(cancelada.data.status).toBe('cancelled')

    const depois = await getPurchaseRequest(origem.sourceRequestId)
    expect(depois.status).toBe(200)
    if (depois.status !== 200) return
    const linha = depois.data.items.find((i) => i.lineNumber === origem.sourceLineNumber)
    expect(
      linha?.status,
      'ordem cancelada que deixasse a linha marcada criaria necessidade órfã',
    ).toBe('open')
    expect(linha?.purchaseOrderId).toBeNull()

    // E a linha volta a poder ser pedida — a `0057` existe por causa disto.
    const denovo = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: ordem.supplierId,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: origem.sourceRequestId,
          sourceLineNumber: origem.sourceLineNumber,
          quantity: origem.quantity,
          unitCostCents: 300_000,
        },
      ],
    })
    expect(denovo.status).toBe(201)
  })
})

describe('previsão de chegada', () => {
  it('só ordem ENVIADA entra, e a linha é de ITEM', async () => {
    await entrar()
    const previsao = await getPurchaseArrivalForecast({ pageSize: 100 })
    expect(previsao.status).toBe(200)
    if (previsao.status !== 200) return

    const ordens = await listPurchaseOrders({ pageSize: 100 })
    if (ordens.status !== 200) return
    const enviadas = ordens.data.rows.filter((o) => o.status === 'sent')
    const itensEnviados = enviadas.reduce((soma, o) => soma + o.items.length, 0)

    expect(previsao.data.total).toBe(itensEnviados)
  })

  it('rascunho NÃO aparece — intenção do comprador não é peça a caminho', async () => {
    await entrar()
    const antes = await getPurchaseArrivalForecast({ pageSize: 100 })
    const { pedido, linha } = await linhaAberta(EVOLED)
    await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: 1,
          unitCostCents: 300_000,
        },
      ],
    })
    const depois = await getPurchaseArrivalForecast({ pageSize: 100 })

    if (antes.status === 200 && depois.status === 200) {
      expect(depois.data.total).toBe(antes.data.total)
    }
  })

  it('`sale` traz cliente e `stock` não — e a tela mostra isso, não vazio', async () => {
    await entrar()
    const previsao = await getPurchaseArrivalForecast({ pageSize: 100 })
    if (previsao.status !== 200) throw new Error('previsão falhou')

    const encomenda = previsao.data.rows.find((l) => l.destination === 'sale')
    const reposicao = previsao.data.rows.find((l) => l.destination === 'stock')

    expect(encomenda?.customerName).toBeTruthy()
    expect(encomenda?.orderNumber).toBeTruthy()
    expect(reposicao?.customerId, 'reposição não tem cliente').toBeNull()
  })

  it('a data VÁLIDA é a reagendada, e a original só sai quando houve reagendamento', async () => {
    await entrar()
    const previsao = await getPurchaseArrivalForecast({ pageSize: 100 })
    if (previsao.status !== 200) throw new Error('previsão falhou')

    const reagendada = previsao.data.rows.find((l) => l.originalExpectedAt !== null)
    if (!reagendada) throw new Error('o seed perdeu a ordem reagendada')

    const ordem = await listPurchaseOrders({ pageSize: 100 })
    if (ordem.status !== 200) return
    const doc = ordem.data.rows.find((o) => o.id === reagendada.purchaseOrderId)

    expect(reagendada.expectedAt).toBe(doc?.rescheduledAt)
    expect(reagendada.originalExpectedAt).toBe(doc?.expectedAt)
    // As demais não destacam nada.
    expect(previsao.data.rows.filter((l) => l.originalExpectedAt !== null)).toHaveLength(1)
  })

  it('`lateOnly` recorta pelo atraso contra HOJE, e `daysLate` o mede', async () => {
    await entrar()
    const atrasadas = await getPurchaseArrivalForecast({ lateOnly: true, pageSize: 100 })
    expect(atrasadas.status).toBe(200)
    if (atrasadas.status !== 200) return

    expect(atrasadas.data.total).toBeGreaterThan(0)
    expect(atrasadas.data.rows.every((l) => (l.daysLate ?? 0) > 0)).toBe(true)

    const tudo = await getPurchaseArrivalForecast({ pageSize: 100 })
    if (tudo.status === 200) {
      expect(tudo.data.total).toBeGreaterThan(atrasadas.data.total)
      // A linha que ainda não venceu tem `daysLate` NULO, não zero.
      expect(tudo.data.rows.some((l) => l.daysLate === null)).toBe(true)
    }
  })

  it('recorta por fornecedor e por destino', async () => {
    await entrar()
    const doMisterLed = await getPurchaseArrivalForecast({
      supplierId: MISTER_LED,
      pageSize: 100,
    })
    if (doMisterLed.status === 200) {
      expect(doMisterLed.data.rows.every((l) => l.supplierId === MISTER_LED)).toBe(true)
    }

    const soEncomenda = await getPurchaseArrivalForecast({ destination: 'sale', pageSize: 100 })
    if (soEncomenda.status === 200) {
      expect(soEncomenda.data.rows.every((l) => l.destination === 'sale')).toBe(true)
    }
  })
})

describe('compras para estoque / reserva', () => {
  it('as parcelas vêm ABERTAS, e disponível desconta a RESERVA', async () => {
    await entrar()
    const resposta = await getPurchaseStockReplenishment({ pageSize: 100 })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    for (const linha of resposta.data.rows) {
      expect(linha.qtyAvailable).toBe(linha.qtyOnHand - linha.qtyAllocated)
      expect(linha.qtyAllocated, 'reserva nunca é negativa').toBeGreaterThanOrEqual(0)
    }

    const comReserva = resposta.data.rows.find((l) => l.qtyAllocated > 0)
    expect(
      comReserva,
      'sem reserva no seed a consulta seria saldo bruto com outro nome',
    ).toBeDefined()
  })

  it('`qtyOnOrder` conta só ordem ENVIADA', async () => {
    await entrar()
    const antes = await getPurchaseStockReplenishment({ pageSize: 100 })
    const { pedido, linha } = await linhaAberta(EVOLED)
    const criada = await createPurchaseOrder({
      ...ORDEM_BASE,
      supplierId: EVOLED,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: pedido.id,
          sourceLineNumber: linha.lineNumber,
          quantity: linha.quantity,
          unitCostCents: 300_000,
        },
      ],
    })
    if (criada.status !== 201) throw new Error('criação falhou')

    const comRascunho = await getPurchaseStockReplenishment({ pageSize: 100 })
    if (antes.status === 200 && comRascunho.status === 200) {
      const soma = (r: typeof antes.data.rows) => r.reduce((s, l) => s + l.qtyOnOrder, 0)
      expect(soma(comRascunho.data.rows), 'rascunho não é peça a caminho').toBe(
        soma(antes.data.rows),
      )
    }

    await sendPurchaseOrder(criada.data.id, {})
    const enviada = await getPurchaseStockReplenishment({ pageSize: 100 })
    if (antes.status === 200 && enviada.status === 200) {
      const soma = (r: typeof antes.data.rows) => r.reduce((s, l) => s + l.qtyOnOrder, 0)
      expect(soma(enviada.data.rows)).toBe(soma(antes.data.rows) + linha.quantity)
    }
  })

  it('a sugestão é o que falta para o mínimo, e some quando não há mínimo', async () => {
    await entrar()
    const resposta = await getPurchaseStockReplenishment({ pageSize: 100 })
    if (resposta.status !== 200) throw new Error('consulta falhou')

    for (const linha of resposta.data.rows) {
      const esperado =
        linha.minimumQty == null
          ? 0
          : Math.max(0, linha.minimumQty - (linha.qtyAvailable + linha.qtyOnOrder))
      expect(linha.qtySuggested).toBe(esperado)
    }

    const abaixo = await getPurchaseStockReplenishment({ belowMinimumOnly: true, pageSize: 100 })
    if (abaixo.status === 200) {
      expect(abaixo.data.rows.every((l) => l.qtySuggested > 0)).toBe(true)
      expect(abaixo.data.total, 'o seed precisa de um caso com falta').toBeGreaterThan(0)
    }
  })

  it('o padrão abre no que mais falta', async () => {
    await entrar()
    const resposta = await getPurchaseStockReplenishment({ pageSize: 100 })
    if (resposta.status !== 200) throw new Error('consulta falhou')

    const sugestoes = resposta.data.rows.map((l) => l.qtySuggested)
    expect([...sugestoes].sort((a, b) => b - a)).toEqual(sugestoes)
  })
})

describe('contrato de listagem', () => {
  const listagens = [
    ['pedidos', listPurchaseRequests],
    ['ordens', listPurchaseOrders],
    ['previsão', getPurchaseArrivalForecast],
    ['reposição', getPurchaseStockReplenishment],
  ] as const

  it.each(listagens)('%s: sortBy fora da whitelist é 400', async (_nome, chamada) => {
    await entrar()
    const resposta = await chamada({ sortBy: 'inventado' } as never)
    expect(resposta.status).toBe(400)
    if (resposta.status === 400) {
      expect(resposta.data.type).toBe('urn:cabinet:erro:ordenacao-invalida')
    }
  })

  it.each(listagens)('%s: pageSize acima de 100 é 400, não truncagem', async (_nome, chamada) => {
    await entrar()
    expect((await chamada({ page: 1, pageSize: 101 } as never)).status).toBe(400)
  })

  it.each(listagens)('%s: `filters` é 400 — o recurso não o publica', async (_nome, chamada) => {
    await entrar()
    const resposta = await chamada({ filters: '[]' } as never)
    expect(
      resposta.status,
      'aparar em silêncio devolveria a lista inteira com a condição no painel',
    ).toBe(400)
  })

  it('a paginação é 1-based e o total conta o recorte', async () => {
    await entrar()
    const primeira = await listPurchaseRequests({ page: 1, pageSize: 1 })
    expect(primeira.status).toBe(200)
    if (primeira.status !== 200) return
    expect(primeira.data.rows).toHaveLength(1)
    expect(primeira.data.total).toBeGreaterThan(1)

    const recortada = await listPurchaseRequests({ status: 'cancelled', pageSize: 50 })
    if (recortada.status === 200) expect(recortada.data.total).toBe(0)
  })
})
