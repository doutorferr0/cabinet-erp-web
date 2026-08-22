import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createStockLocation,
  createStockMovement,
  createVariant,
  getProduct,
  listStockBalances,
  listStockLocations,
  updateStockLocation,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore, store } from './store'

/**
 * O MOCK DOS DEPÓSITOS — a dimensão que faltava no estoque (contrato #291).
 *
 * Trava as SEMÂNTICAS, não o dado do seed. As três que este arquivo existe para
 * provar são as que se perdem em silêncio se ninguém as cobrar:
 *
 * 1. **`balanceAfter` é o saldo do DEPÓSITO**, não o total do produto. Enquanto
 *    houver um depósito só os dois números coincidem — é por isso que o caso do
 *    SEGUNDO depósito está aqui: sem ele, a troca de sentido passa despercebida.
 * 2. **O padrão nasce sob demanda**, no primeiro movimento de uma empresa que
 *    não tem depósito nenhum. É comportamento do SERVIDOR e não operação do
 *    contrato, então este teste é o único lugar onde ele se vê.
 * 3. **A reconciliação de dois níveis do ADR-009**: a soma dos depósitos de uma
 *    variante bate com o `stockQty` dela.
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
  configurarApi('http://mock.teste')
})

async function entrar(tenantId = TENANT_MATRIZ) {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId })
}

const CORPO_BASE = { parentId: null, code: 'RUA-B', name: 'RUA B', active: true }

describe('a árvore de depósitos é da EMPRESA, e vem plana', () => {
  it('a listagem mostra só os depósitos da empresa ativa', async () => {
    await entrar()
    const lista = await listStockLocations({ page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status !== 200) return
    expect(lista.data.rows.map((d) => d.code)).toEqual(['PRINCIPAL', 'PRINC-RUA-A', 'SHOWROOM'])
    // Plana: quem monta a árvore é quem desenha, com o `parentId` de cada linha.
    expect(lista.data.rows.find((d) => d.code === 'PRINC-RUA-A')?.parentId).toBe('dep-0001')
  })

  it('empresa sem depósito responde lista vazia, e não erro', async () => {
    await entrar(TENANT_FILIAL)
    const lista = await listStockLocations({ page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status === 200) expect(lista.data.total).toBe(0)
  })

  it('sortBy fora da whitelist é 400', async () => {
    await entrar()
    const lista = await listStockLocations({ sortBy: 'parentId', page: 1, pageSize: 10 })

    expect(lista.status).toBe(400)
  })
})

describe('cadastro de depósito', () => {
  it('cria o filho e ele NÃO nasce padrão', async () => {
    await entrar()
    const criado = await createStockLocation({ ...CORPO_BASE, parentId: 'dep-0001' })

    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    expect(criado.data.parentId).toBe('dep-0001')
    // O padrão é o da criação sob demanda; cadastro comum não disputa o posto.
    expect(criado.data.isDefault).toBe(false)
  })

  it('código repetido na empresa é 409', async () => {
    await entrar()
    const repetido = await createStockLocation({ ...CORPO_BASE, code: 'PRINCIPAL' })

    expect(repetido.status).toBe(409)
  })

  it('pai que a empresa ativa não tem é 404, e não 400', async () => {
    await entrar()
    const orfao = await createStockLocation({ ...CORPO_BASE, parentId: 'dep-9999' })

    // Do ponto de vista de quem pergunta, o pai não está lá.
    expect(orfao.status).toBe(404)
  })

  it('papel abaixo de admin não cadastra depósito', async () => {
    // O vínculo da filial é `viewer` — e o piso desta família é `admin`,
    // interino até `depositos:gerenciar` (api#84).
    await entrar(TENANT_FILIAL)
    const negado = await createStockLocation(CORPO_BASE)

    expect(negado.status).toBe(403)
  })
})

describe('alteração de depósito', () => {
  it('pendurar o nó em descendente próprio é 409', async () => {
    await entrar()
    const laco = await updateStockLocation('dep-0001', {
      parentId: 'dep-0002',
      code: 'PRINCIPAL',
      name: 'DEPÓSITO PRINCIPAL',
      active: true,
    })

    expect(laco.status).toBe(409)
  })

  it('desativar o depósito padrão é 409', async () => {
    await entrar()
    const desativa = await updateStockLocation('dep-0001', {
      parentId: null,
      code: 'PRINCIPAL',
      name: 'DEPÓSITO PRINCIPAL',
      active: false,
    })

    expect(desativa.status).toBe(409)
  })

  it('PUT substitui o registro inteiro — o pai ausente é APAGADO', async () => {
    await entrar()
    const alterado = await updateStockLocation('dep-0002', {
      parentId: null,
      code: 'PRINC-RUA-A',
      name: 'RUA A',
      active: true,
    })

    expect(alterado.status).toBe(200)
    if (alterado.status === 200) expect(alterado.data.parentId).toBeNull()
  })
})

describe('o movimento acontece num DEPÓSITO', () => {
  it('sem locationId o movimento vai para o padrão da empresa', async () => {
    await entrar()
    const movimento = await createStockMovement('var-0001', { delta: -2, reason: 'venda' })

    expect(movimento.status).toBe(201)
    if (movimento.status !== 201) return
    expect(movimento.data.locationId).toBe('dep-0001')
    expect(movimento.data.balanceAfter).toBe(10)
  })

  it('balanceAfter é o saldo do DEPÓSITO, não o total do produto', async () => {
    await entrar()
    // `dep-0002` nunca viu esta variante: o saldo dele nasce em 0 e vai a 5,
    // enquanto o total do produto vai de 12 para 17. Se `balanceAfter` ainda
    // fosse o total, este número seria 17.
    const entrada = await createStockMovement('var-0001', {
      locationId: 'dep-0002',
      delta: 5,
      reason: 'transferência',
    })

    expect(entrada.status).toBe(201)
    if (entrada.status === 201) expect(entrada.data.balanceAfter).toBe(5)

    const produto = await getProduct('prod-0001')
    if (produto.status === 200) {
      expect(produto.data.variants.find((v) => v.id === 'var-0001')?.stockQty).toBe(17)
    }
  })

  it('depósito inativo recusa movimento com 409, e inexistente é 404', async () => {
    await entrar()
    const inativo = await createStockMovement('var-0001', {
      locationId: 'dep-0003',
      delta: 1,
      reason: 'ajuste',
    })
    expect(inativo.status).toBe(409)

    const inexistente = await createStockMovement('var-0001', {
      locationId: 'dep-9999',
      delta: 1,
      reason: 'ajuste',
    })
    expect(inexistente.status).toBe(404)
  })

  it('a conta que recusa é a do LOCAL: negativo no depósito é 409', async () => {
    await entrar()
    // O produto tem 12 na empresa, mas `dep-0002` tem 0 — a saída de 1 daqui
    // deixaria o DEPÓSITO negativo, e é ele quem manda agora.
    const saida = await createStockMovement('var-0001', {
      locationId: 'dep-0002',
      delta: -1,
      reason: 'venda',
    })

    expect(saida.status).toBe(409)
  })

  it('empresa sem depósito nenhum ganha o PRINCIPAL no primeiro movimento', async () => {
    await entrar()
    // O estado de uma empresa nova: o contrato não publica operação que crie o
    // padrão, então quem o cria é o servidor, aqui.
    store.depositos = []

    const movimento = await createStockMovement('var-0003', { delta: 1, reason: 'compra' })

    expect(movimento.status).toBe(201)
    const lista = await listStockLocations({ page: 1, pageSize: 100 })
    if (lista.status !== 200) return
    expect(lista.data.rows.map((d) => d.code)).toEqual(['PRINCIPAL'])
    expect(lista.data.rows[0]?.isDefault).toBe(true)
    if (movimento.status === 201) {
      expect(movimento.data.locationId).toBe(lista.data.rows[0]?.id)
    }
  })
})

describe('saldo por depósito — o cache derivado do kardex', () => {
  it('a soma dos depósitos bate com o stockQty da variante (ADR-009)', async () => {
    await entrar()
    await createStockMovement('var-0001', { locationId: 'dep-0002', delta: 5, reason: 'entrada' })

    const saldos = await listStockBalances('var-0001', { page: 1, pageSize: 100 })
    expect(saldos.status).toBe(200)
    if (saldos.status !== 200) return

    const soma = saldos.data.rows.reduce((total, linha) => total + linha.qty, 0)
    const produto = await getProduct('prod-0001')
    if (produto.status === 200) {
      expect(soma).toBe(produto.data.variants.find((v) => v.id === 'var-0001')?.stockQty)
    }
  })

  it('depósito sem linha de saldo não aparece com zero — ele não aparece', async () => {
    await entrar()
    const saldos = await listStockBalances('var-0001', { page: 1, pageSize: 100 })

    expect(saldos.status).toBe(200)
    if (saldos.status !== 200) return
    // Três depósitos cadastrados, UMA linha de saldo: completar com zero
    // afirmaria contagem que ninguém fez.
    expect(saldos.data.rows.map((linha) => linha.locationId)).toEqual(['dep-0001'])
  })

  it('variante que nunca esteve em depósito nenhum responde lista vazia', async () => {
    await entrar()
    // Variante RECÉM-CRIADA, e não uma achada no seed: as três do seed nascem
    // com `stockQty`, e um teste que as varresse à procura de uma zerada
    // passaria sem asserir nada no dia em que não houvesse.
    const nova = await createVariant('prod-0001', {
      finish: 'COBRE',
      size: '30CM',
      active: true,
      priceCents: 209900,
      minStock: null,
    })
    expect(nova.status).toBe(201)
    if (nova.status !== 201) return

    const saldos = await listStockBalances(nova.data.id, { page: 1, pageSize: 100 })
    expect(saldos.status).toBe(200)
    if (saldos.status === 200) expect(saldos.data.total).toBe(0)
  })

  it('variante que não existe é 404', async () => {
    await entrar()
    const saldos = await listStockBalances('var-9999', { page: 1, pageSize: 10 })

    expect(saldos.status).toBe(404)
  })
})
