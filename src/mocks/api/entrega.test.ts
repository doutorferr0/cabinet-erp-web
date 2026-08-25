import { configurarApi } from '@/api/cliente'
import {
  addDeliveryItem,
  authLogin,
  authSetActiveTenant,
  cancelDelivery,
  closeDelivery,
  createDelivery,
  getOrderFulfillment,
  listDeliveries,
  listPickingQueue,
  pickOrderItem,
  releaseOrderItem,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetEntregas } from './entrega'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * O servidor falso do BLOCO FÍSICO DA VENDA — a escada e suas recusas.
 *
 * O que este arquivo prova é o que a tela nunca vê: que a escada é MONÓTONA e
 * que cada degrau recusa com URN própria. Um mock que aceitasse separar sem
 * liberar deixaria a tela verde contra um servidor que responde 409 — e o
 * defeito só apareceria no par local, com o operador na frente.
 *
 * O pedido `ped-2001` nasce liberado inteiro (a fila de verdade), o `ped-2002`
 * tem uma linha 10/6 (o parcial) e o `ped-2003` nasce sem nada liberado — é o
 * único jeito de exercitar o degrau `pending` sem desfazer fato, coisa que o log
 * append-only não permite.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetEntregas()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

describe('a fila de separação', () => {
  it('traz só o que está liberado e ainda não saiu da prateleira', async () => {
    const resposta = await listPickingQueue({ pageSize: 100 })
    const linhas = (resposta.data as { rows: { orderNumber: string; pendingPick: number }[] }).rows

    // `ped-2003` não tem nada liberado: fila que o mostrasse mandaria alguém
    // procurar peça que ninguém autorizou a sair.
    expect(linhas.some((l) => l.orderNumber === '21660')).toBe(false)
    // A linha 10/6 do `ped-2002` entra com o que sobra, não com os 10.
    const parcial = linhas.find((l) => l.orderNumber === '21653' && l.pendingPick === 4)
    expect(parcial).toBeDefined()
  })

  it('ordena por data prometida com o atrasado em cima', async () => {
    const resposta = await listPickingQueue({ pageSize: 100 })
    const linhas = (resposta.data as { rows: { orderNumber: string }[] }).rows
    expect(linhas[0]?.orderNumber).toBe('21646')
  })

  it('recusa sortBy fora da whitelist — inclusive `description`', async () => {
    const resposta = await listPickingQueue({ sortBy: 'description' })
    expect(resposta.status).toBe(400)
    expect((resposta.data as { type: string }).type).toBe('urn:cabinet:erro:ordenacao-invalida')
  })

  it('sem empresa ativa é lista vazia, não erro', async () => {
    resetStore()
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    const resposta = await listPickingQueue({})
    expect(resposta.status).toBe(200)
    expect(resposta.data).toEqual({ rows: [], total: 0 })
  })
})

describe('a escada é monótona', () => {
  it('separar acima do liberado é 409 separacao-sem-liberacao', async () => {
    // `ped-2003` não tem liberação nenhuma: qualquer separação passa do
    // liberado, e o gate não depende de papel.
    const resposta = await pickOrderItem('ped-2003', 1, { quantity: 1 })
    expect(resposta.status).toBe(409)
    expect((resposta.data as { type: string }).type).toBe(
      'urn:cabinet:erro:separacao-sem-liberacao',
    )
  })

  it('liberar acima do vendido é 409 liberacao-acima-do-vendido', async () => {
    const resposta = await releaseOrderItem('ped-2003', 1, { quantity: 2 })
    expect(resposta.status).toBe(409)
    expect((resposta.data as { type: string }).type).toBe(
      'urn:cabinet:erro:liberacao-acima-do-vendido',
    )
  })

  it('liberar e separar movem as quantidades da MESMA linha', async () => {
    const liberado = await releaseOrderItem('ped-2003', 1, { quantity: 1 })
    expect(liberado.status).toBe(200)
    expect((liberado.data as { item: { pendingPick: number } }).item.pendingPick).toBe(1)

    const separado = await pickOrderItem('ped-2003', 1, { quantity: 1 })
    expect(separado.status).toBe(200)
    const item = (separado.data as { item: { physicalState: string; pendingDelivery: number } })
      .item
    expect(item.physicalState).toBe('picked')
    expect(item.pendingDelivery).toBe(1)
  })

  it('a separação HERDA o depósito da liberação', async () => {
    await releaseOrderItem('ped-2003', 1, { quantity: 1, locationId: 'dep-galpao' })
    const separado = await pickOrderItem('ped-2003', 1, { quantity: 1 })
    expect((separado.data as { locationId: string }).locationId).toBe('dep-galpao')
  })

  it('linha de serviço separa sem movimento de kardex', async () => {
    // A linha 2 do `ped-2002` é serviço (`SERV`) e já nasce liberada.
    const separado = await pickOrderItem('ped-2002', 2, { quantity: 1 })
    expect(separado.status).toBe(200)
    expect((separado.data as { stockMovementId: string | null }).stockMovementId).toBeNull()
  })
})

describe('o romaneio', () => {
  async function romaneioAberto() {
    const criado = await createDelivery({ orderId: 'ped-2002' })
    return (criado.data as { id: string; number: string }).id
  }

  it('nasce aberto e vazio', async () => {
    const criado = await createDelivery({ orderId: 'ped-2002' })
    expect(criado.status).toBe(201)
    const dto = criado.data as { status: string; items: unknown[] }
    expect(dto.status).toBe('open')
    expect(dto.items).toEqual([])
  })

  it('não recebe item acima do separado', async () => {
    const id = await romaneioAberto()
    // A linha 1 tem 6 separados; 7 passa do que saiu da prateleira.
    const resposta = await addDeliveryItem(id, { lineNumber: 1, quantity: 7 })
    expect(resposta.status).toBe(409)
    expect((resposta.data as { type: string }).type).toBe('urn:cabinet:erro:entrega-sem-separacao')
  })

  it('recusa linha que não é do pedido do romaneio', async () => {
    const id = await romaneioAberto()
    const resposta = await addDeliveryItem(id, { lineNumber: 9, quantity: 1 })
    expect(resposta.status).toBe(409)
    expect((resposta.data as { type: string }).type).toBe(
      'urn:cabinet:erro:entrega-de-outro-pedido',
    )
  })

  it('vazio não fecha — quem não saiu se cancela', async () => {
    const id = await romaneioAberto()
    const resposta = await closeDelivery(id, {
      deliveredAt: new Date().toISOString(),
      receivedBy: 'Quem recebeu',
    })
    expect(resposta.status).toBe(409)
    expect((resposta.data as { type: string }).type).toBe('urn:cabinet:erro:entrega-vazia')
  })

  it('fechado não recebe mais item, e fechar de novo é 409', async () => {
    const id = await romaneioAberto()
    await addDeliveryItem(id, { lineNumber: 1, quantity: 2 })
    const fechado = await closeDelivery(id, {
      deliveredAt: new Date().toISOString(),
      receivedBy: 'Dona Maria',
    })
    expect(fechado.status).toBe(200)
    expect((fechado.data as { status: string }).status).toBe('closed')

    const denovo = await addDeliveryItem(id, { lineNumber: 1, quantity: 1 })
    expect(denovo.status).toBe(409)
    expect((denovo.data as { type: string }).type).toBe('urn:cabinet:erro:entrega-fechada')

    const refechar = await closeDelivery(id, {
      deliveredAt: new Date().toISOString(),
      receivedBy: 'Dona Maria',
    })
    expect(refechar.status).toBe(409)
  })

  it('cancelar NÃO desfaz o que já foi lançado nele', async () => {
    const id = await romaneioAberto()
    await addDeliveryItem(id, { lineNumber: 1, quantity: 2 })
    const cancelado = await cancelDelivery(id)
    expect((cancelado.data as { status: string }).status).toBe('cancelled')

    // O log é append-only: o fato de entrega continua contando na linha.
    const situacao = await getOrderFulfillment('ped-2002')
    const linha = (
      situacao.data as { items: { lineNumber: number; quantityDelivered: number }[] }
    ).items.find((i) => i.lineNumber === 1)
    expect(linha?.quantityDelivered).toBe(2)
  })

  it('a listagem recorta por pedido e por situação', async () => {
    const id = await romaneioAberto()
    await cancelDelivery(id)
    await createDelivery({ orderId: 'ped-2002' })

    const abertos = await listDeliveries({ orderId: 'ped-2002', status: 'open' })
    expect((abertos.data as { total: number }).total).toBe(1)

    const doOutro = await listDeliveries({ orderId: 'ped-2001' })
    expect((doOutro.data as { total: number }).total).toBe(0)
  })
})

describe('a situação do pedido', () => {
  it('deriva o degrau da linha e o percentual do pedido', async () => {
    const resposta = await getOrderFulfillment('ped-2002')
    const dto = resposta.data as {
      physicalState: string
      percentDelivered: number
      items: { lineNumber: number; physicalState: string; partial: boolean }[]
    }
    // A linha 1 está liberada inteira com 6 de 10 separados: o degrau que cobre
    // a linha INTEIRA é `released`, e o progresso acima dele vira `partial`.
    const linha = dto.items.find((i) => i.lineNumber === 1)
    expect(linha?.physicalState).toBe('released')
    expect(linha?.partial).toBe(true)
    expect(dto.percentDelivered).toBe(0)
  })

  it('a data do item HERDA a do ambiente, e diz que herdou', async () => {
    const resposta = await getOrderFulfillment('ped-2001')
    const itens = (
      resposta.data as {
        items: {
          lineNumber: number
          scheduledDeliveryAt: string | null
          scheduledDateInherited: boolean
        }[]
      }
    ).items
    expect(itens.find((i) => i.lineNumber === 1)?.scheduledDateInherited).toBe(true)
    // A linha 3 tem data PRÓPRIA — herança nenhuma.
    expect(itens.find((i) => i.lineNumber === 3)?.scheduledDateInherited).toBe(false)
  })

  it('sem empresa ativa é 409, como todo detalhe por id', async () => {
    resetStore()
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    const resposta = await getOrderFulfillment('ped-2001')
    expect(resposta.status).toBe(409)
    expect((resposta.data as { type: string }).type).toBe('urn:cabinet:erro:sem-empresa-ativa')
  })
})
