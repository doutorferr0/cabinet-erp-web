import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  checkGoodsReceipt,
  createGoodsReceipt,
  getPurchaseArrivalForecast,
  getPurchaseStockReplenishment,
  listGoodsReceipts,
  listPurchaseOrders,
  listStockMovements,
  postGoodsReceipt,
  updateGoodsReceipt,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetCompras } from './compras'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * O MOCK DO RECEBIMENTO (G3) — as seis operações e o que elas fazem ao resto.
 *
 * Trava as SEMÂNTICAS, não o dado do seed. As quatro que somem em silêncio se
 * ninguém as cobrar:
 *
 * 1. **O vínculo é por LINHA, e o par viaja junto.** Meio vínculo é 400: ele
 *    parece ligação e não fecha linha nenhuma. Ordem de outro fornecedor, ordem
 *    em rascunho e duas linhas fechando a MESMA linha de ordem também.
 * 2. **`quantityOrdered` vem da ORDEM quando há vínculo.** Aceitar o número do
 *    cliente faria a divergência medir o que o operador lembrou.
 * 3. **A divergência é cobrada na TRANSIÇÃO, não na digitação** — e a recusa
 *    aponta a LINHA, para a tela pôr o cursor. Lançar, ela não bloqueia.
 * 4. **O lançamento é o que baixa a chegada futura.** Depois dele
 *    `quantityReceived` da linha da ordem sobe, `qtyOnOrder` cai e a previsão
 *    mostra só o que falta — e some quando não falta mais nada.
 *
 * Exercita pelo CLIENTE GERADO, como o mock de compras: é o caminho inteiro que
 * a Fase C vai usar.
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
/** A OC-5102 do seed: MISTER LED, `sent`, linha 1 pedindo 10 da `var-0003`. */
const OC_ARANDELA = 'oc-0002'
/** A OC-5101 do seed: EVOLED, `sent`, linha 1 pedindo 4 da `var-0001`. */
const OC_PENDENTE = 'oc-0001'

/** O recebimento em RASCUNHO do seed — 8 das 10 arandelas, com motivo. */
const RASCUNHO = 'rec-0001'
/** O recebimento CONFERIDO do seed — avulso, 2 peças, esperando lançamento. */
const CONFERIDO = 'rec-0002'

async function linhaDaOrdem(ordemId: string) {
  const lista = await listPurchaseOrders({ page: 1, pageSize: 50 })
  if (lista.status !== 200) throw new Error('listagem de ordens falhou')
  const ordem = lista.data.rows.find((o) => o.id === ordemId)
  if (!ordem) throw new Error(`o seed perdeu a ordem ${ordemId}`)
  return { ordem, linha: ordem.items[0] }
}

async function reposicaoDa(variantId: string) {
  const consulta = await getPurchaseStockReplenishment({ page: 1, pageSize: 50 })
  if (consulta.status !== 200) throw new Error('reposição falhou')
  return consulta.data.rows.find((r) => r.variantId === variantId)
}

describe('1. a listagem é a fila de trabalho de quem responde pelo galpão', () => {
  it('abre pelo que chegou por último e recorta por estado', async () => {
    await entrar()

    const tudo = await listGoodsReceipts({ page: 1, pageSize: 10 })
    expect(tudo.status).toBe(200)
    if (tudo.status !== 200) return
    expect(tudo.data.total).toBe(2)
    // Padrão `receivedAt` decrescente: o rascunho chegou ontem, o conferido há
    // três dias.
    expect(tudo.data.rows[0]?.id).toBe(RASCUNHO)

    const so = await listGoodsReceipts({ status: 'checked', page: 1, pageSize: 10 })
    if (so.status !== 200) throw new Error('listagem por estado falhou')
    expect(so.data.rows.map((r) => r.id)).toEqual([CONFERIDO])
  })

  it('sortBy fora da whitelist é 400, e sem empresa a lista é VAZIA, não erro', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })

    const semEmpresa = await listGoodsReceipts({ page: 1, pageSize: 10 })
    expect(semEmpresa.status).toBe(200)
    if (semEmpresa.status === 200) expect(semEmpresa.data.total).toBe(0)

    await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
    const fora = await listGoodsReceipts({ sortBy: 'supplierName', page: 1, pageSize: 10 })
    expect(fora.status).toBe(400)
  })
})

describe('2. o vínculo com a ordem é por linha, e o par viaja junto', () => {
  it('meio vínculo é 400 apontando a linha da ordem', async () => {
    await entrar()
    const criado = await createGoodsReceipt({
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          variantId: 'var-0003',
          purchaseOrderId: OC_ARANDELA,
          // sem `purchaseOrderLine`: parece ligação e não fecha linha nenhuma
          quantityReceived: 3,
        },
      ],
    })
    expect(criado.status).toBe(400)
    if (criado.status !== 400) return
    expect(criado.data.fields?.[0]?.path).toBe('items[0].purchaseOrderLine')
  })

  it('ordem de OUTRO fornecedor não se fecha por esta nota', async () => {
    await entrar()
    const criado = await createGoodsReceipt({
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          variantId: 'var-0001',
          // a OC-5101 é da EVOLED, e quem entregou é quem está na nota
          purchaseOrderId: OC_PENDENTE,
          purchaseOrderLine: 1,
          quantityReceived: 4,
        },
      ],
    })
    expect(criado.status).toBe(400)
    if (criado.status !== 400) return
    expect(criado.data.fields?.[0]?.path).toBe('items[0].purchaseOrderId')
  })

  it('duas linhas não fecham a MESMA linha de ordem', async () => {
    await entrar()
    const criado = await createGoodsReceipt({
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          variantId: 'var-0003',
          purchaseOrderId: OC_ARANDELA,
          purchaseOrderLine: 1,
          quantityReceived: 4,
        },
        {
          lineNumber: 2,
          variantId: 'var-0003',
          purchaseOrderId: OC_ARANDELA,
          purchaseOrderLine: 1,
          quantityReceived: 6,
        },
      ],
    })
    expect(criado.status).toBe(400)
    if (criado.status !== 400) return
    expect(criado.data.fields?.[0]?.path).toBe('items[1].purchaseOrderLine')
  })

  it('com vínculo, o PEDIDO vem da ordem — e o número do cliente é ignorado', async () => {
    await entrar()
    const criado = await createGoodsReceipt({
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          variantId: 'var-0003',
          purchaseOrderId: OC_ARANDELA,
          purchaseOrderLine: 1,
          // a ordem pede 10; o que o operador digitou aqui não é a fonte
          quantityOrdered: 999,
          quantityReceived: 8,
        },
      ],
    })
    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    const linha = criado.data.items[0]
    expect(linha?.quantityOrdered).toBe(10)
    expect(linha?.divergence).toBe(-2)
    expect(linha?.purchaseOrderNumber).toBe('OC-5102')
    // A descrição também não vem do cliente: sai do cadastro da variante.
    expect(linha?.description).toBe('ARANDELA ALUMÍNIO IP65')
    // Nasce em RASCUNHO, e o depósito omitido resolve para o padrão da empresa.
    expect(criado.data.status).toBe('draft')
    expect(criado.data.locationId).toBe('dep-0001')
  })

  it('AVULSO não tem divergência: há mercadoria e ninguém com quem comparar', async () => {
    await entrar()
    const criado = await createGoodsReceipt({
      supplierId: EVOLED,
      items: [{ lineNumber: 1, variantId: 'var-0001', quantityReceived: 5 }],
    })
    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    expect(criado.data.items[0]?.quantityOrdered).toBeNull()
    // `null`, e não zero: zero diria "bateu certinho" sobre ordem que não existe.
    expect(criado.data.items[0]?.divergence).toBeNull()
  })
})

describe('3. a conferência cobra o motivo, e o lançamento não', () => {
  it('divergir sem motivo reprova a conferência, e o erro aponta a LINHA', async () => {
    await entrar()
    const criado = await createGoodsReceipt({
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 7,
          variantId: 'var-0003',
          purchaseOrderId: OC_ARANDELA,
          purchaseOrderLine: 1,
          quantityReceived: 8,
        },
      ],
    })
    if (criado.status !== 201) throw new Error('criação falhou')

    const conferido = await checkGoodsReceipt(criado.data.id)
    expect(conferido.status).toBe(400)
    if (conferido.status !== 400) return
    // O índice é o `lineNumber` do documento, e não a posição num array: na
    // transição não há corpo nenhum de onde tirar posição.
    expect(conferido.data.fields?.[0]?.path).toBe('items[7].divergenceReason')
  })

  it('recebimento sem itens não fecha, e conferido não se reescreve', async () => {
    await entrar()
    const vazio = await createGoodsReceipt({ supplierId: EVOLED, items: [] })
    if (vazio.status !== 201) throw new Error('criação falhou')
    expect((await checkGoodsReceipt(vazio.data.id)).status).toBe(409)

    // O do seed já está conferido: o PUT é 409, e conferir de novo também.
    expect((await checkGoodsReceipt(CONFERIDO)).status).toBe(409)
    const reescrito = await updateGoodsReceipt(CONFERIDO, {
      supplierId: EVOLED,
      items: [{ lineNumber: 1, variantId: 'var-0002', quantityReceived: 99 }],
    })
    expect(reescrito.status).toBe(409)
  })

  it('com motivo, o rascunho do seed confere e LANÇA parcial: 8 das 10', async () => {
    await entrar()
    const conferido = await checkGoodsReceipt(RASCUNHO)
    expect(conferido.status).toBe(200)
    if (conferido.status === 200) expect(conferido.data.status).toBe('checked')

    const lancado = await postGoodsReceipt(RASCUNHO)
    expect(lancado.status).toBe(200)
    if (lancado.status !== 200) return
    expect(lancado.data.status).toBe('posted')
    expect(lancado.data.postedAt).not.toBeNull()

    // Uma entrada no kardex da variante, com o que de fato chegou.
    const kardex = await listStockMovements('var-0003', { page: 1, pageSize: 10 })
    if (kardex.status !== 200) throw new Error('kardex falhou')
    expect(kardex.data.rows).toHaveLength(1)
    expect(kardex.data.rows[0]?.delta).toBe(8)
    expect(kardex.data.rows[0]?.reason).toContain('divergência')

    // Lançar de novo é 409, nunca repetição em silêncio.
    expect((await postGoodsReceipt(RASCUNHO)).status).toBe(409)
  })

  it('rascunho não lança: o estado do meio não é decoração', async () => {
    await entrar()
    expect((await postGoodsReceipt(RASCUNHO)).status).toBe(409)
  })

  it('linha com recebido ZERO não vira movimento de delta zero', async () => {
    await entrar()
    const criado = await createGoodsReceipt({
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          variantId: 'var-0003',
          purchaseOrderId: OC_ARANDELA,
          purchaseOrderLine: 1,
          quantityReceived: 0,
          divergenceReason: 'NÃO EMBARCOU',
        },
      ],
    })
    if (criado.status !== 201) throw new Error('criação falhou')
    await checkGoodsReceipt(criado.data.id)
    expect((await postGoodsReceipt(criado.data.id)).status).toBe(200)

    const kardex = await listStockMovements('var-0003', { page: 1, pageSize: 10 })
    if (kardex.status !== 200) throw new Error('kardex falhou')
    expect(kardex.data.rows).toHaveLength(0)
  })
})

describe('4. lançar é o que baixa a CHEGADA FUTURA — e nunca a reserva de venda', () => {
  it('a linha da ordem passa a dizer o que já chegou, e a reposição desconta', async () => {
    await entrar()

    const antes = await linhaDaOrdem(OC_ARANDELA)
    expect(antes.linha?.quantityReceived).toBe(0)
    const reposicaoAntes = await reposicaoDa('var-0003')
    expect(reposicaoAntes?.qtyOnOrder).toBe(10)

    await checkGoodsReceipt(RASCUNHO)
    await postGoodsReceipt(RASCUNHO)

    const depois = await linhaDaOrdem(OC_ARANDELA)
    expect(depois.linha?.quantityReceived).toBe(8)
    const reposicaoDepois = await reposicaoDa('var-0003')
    // 10 pedidas − 8 recebidas: o que ainda vem são 2, e o saldo em mãos subiu.
    expect(reposicaoDepois?.qtyOnOrder).toBe(2)
    expect(reposicaoDepois?.qtyOnHand).toBe((reposicaoAntes?.qtyOnHand ?? 0) + 8)
    // **A reserva de VENDA não se mexe.** Entrada de compra não desfaz promessa
    // de venda: ela é o que a torna cumprível.
    expect(reposicaoDepois?.qtyAllocated).toBe(reposicaoAntes?.qtyAllocated ?? 0)
  })

  it('a previsão de chegada mostra o que FALTA, e a linha some quando completa', async () => {
    await entrar()

    await checkGoodsReceipt(RASCUNHO)
    await postGoodsReceipt(RASCUNHO)

    const parcial = await getPurchaseArrivalForecast({ page: 1, pageSize: 50 })
    if (parcial.status !== 200) throw new Error('previsão falhou')
    const arandela = parcial.data.rows.find((l) => l.variantId === 'var-0003')
    expect(arandela?.quantity).toBe(2)

    // Fecha as 2 que faltavam, num segundo recebimento — parcela em caminhão
    // separado é documento separado, que é o que o vínculo por linha permite.
    const resto = await createGoodsReceipt({
      supplierId: MISTER_LED,
      items: [
        {
          lineNumber: 1,
          variantId: 'var-0003',
          purchaseOrderId: OC_ARANDELA,
          purchaseOrderLine: 1,
          quantityReceived: 2,
        },
      ],
    })
    if (resto.status !== 201) throw new Error('segundo recebimento falhou')
    // **A segunda carga confere contra o que FALTAVA, não contra as 10.** Por
    // isso ela não diverge e não pede motivo: a diferença já tem explicação, que
    // é o caminhão anterior.
    expect(resto.data.items[0]?.quantityOrdered).toBe(2)
    expect(resto.data.items[0]?.divergence).toBe(0)
    await checkGoodsReceipt(resto.data.id)
    await postGoodsReceipt(resto.data.id)

    const completa = await getPurchaseArrivalForecast({ page: 1, pageSize: 50 })
    if (completa.status !== 200) throw new Error('previsão falhou')
    expect(completa.data.rows.some((l) => l.variantId === 'var-0003')).toBe(false)
    expect((await reposicaoDa('var-0003'))?.qtyOnOrder).toBe(0)
  })
})
