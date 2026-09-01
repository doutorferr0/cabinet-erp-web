import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createStockMovement,
  getProduct,
  listProducts,
  listStockLocations,
  listStockMovements,
} from '@/api/gerado'
import { lancarMovimento } from '@/data/estoque-api'
import { saldoNoDeposito } from '@/data/inventario-api'
import { handlers } from '@/mocks/api/handlers'
import { TENANT_MATRIZ, resetStore } from '@/mocks/api/store'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * O AJUSTE DO INVENTÁRIO CHEGA AO KARDEX — contra o MOCK, que é quem responde
 * no site público e em `pnpm dev` sem proxy.
 *
 * ## Por que este arquivo existe ao lado de `inventario.test.tsx`
 *
 * Aquele prova a TELA contra servidor falso: que o corpo do POST leva o `delta`
 * da diferença e o depósito da contagem. Servidor falso responde o que o teste
 * mandar — ele não tem estado, e por isso não pode provar a outra metade: que
 * depois do ajuste o saldo e o histórico MUDARAM.
 *
 * Aqui quem responde é `src/mocks/api/handlers.ts`, que tem estado de verdade
 * (ADR-009: o saldo é derivado do kardex, e `balanceAfter` é o saldo do
 * DEPÓSITO). É o único lugar onde "o ajuste aparece no kardex" é uma afirmação
 * verificável em vez de uma frase de PR.
 *
 * ## O ciclo é o da tela, sem a tela
 *
 * Ler o saldo do depósito (`saldoNoDeposito`) → contar → lançar a diferença
 * (`lancarMovimento`) → conferir kardex e saldo. As duas funções são as MESMAS
 * que a tela usa; o que não entra aqui é a folha, que é estado de navegador.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  configurarApi('http://mock.teste')
})

/** A peça e o depósito vêm do SEED pela API, e não de ids escritos aqui. */
async function umaVarianteComDeposito() {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })

  const depositos = await listStockLocations({ page: 1, pageSize: 50 })
  if (depositos.status !== 200) throw new Error('sem depósitos no mock')
  const deposito = depositos.data.rows.find((linha) => linha.isDefault) ?? depositos.data.rows[0]

  const produtos = await listProducts({ page: 1, pageSize: 5 })
  if (produtos.status !== 200) throw new Error('sem produtos no mock')
  const detalhe = await getProduct(produtos.data.rows[0].id)
  if (detalhe.status !== 200) throw new Error('produto sem detalhe')

  return { variantId: detalhe.data.variants[0].id as string, locationId: deposito.id }
}

describe('o ajuste do inventário no mock', () => {
  it('a contagem menor tira do saldo do depósito e entra no kardex', async () => {
    const { variantId, locationId } = await umaVarianteComDeposito()
    const antes = await saldoNoDeposito(variantId, locationId)

    // A contagem achou três a menos do que o sistema dizia.
    const contado = antes - 3
    await lancarMovimento(variantId, {
      locationId,
      delta: contado - antes,
      reason: 'Inventário — contagem de agosto',
    })

    // 1. O SALDO do depósito ficou com o que se contou. É o trabalho inteiro do
    //    ajuste, e é o que a tela de Movimentação passa a mostrar.
    expect(await saldoNoDeposito(variantId, locationId)).toBe(contado)

    // 2. O KARDEX ganhou a linha, com o motivo digitado e o saldo depois dela —
    //    que é do DEPÓSITO, não o total da variante na empresa.
    const kardex = await listStockMovements(variantId, { page: 1, pageSize: 10 })
    expect(kardex.status).toBe(200)
    if (kardex.status !== 200) return
    const ultimo = kardex.data.rows[0]
    expect(ultimo.reason).toBe('Inventário — contagem de agosto')
    expect(ultimo.delta).toBe(-3)
    expect(ultimo.balanceAfter).toBe(contado)
    expect(ultimo.locationId).toBe(locationId)
  })

  it('a contagem maior acrescenta, e o saldo acompanha', async () => {
    const { variantId, locationId } = await umaVarianteComDeposito()
    const antes = await saldoNoDeposito(variantId, locationId)

    await lancarMovimento(variantId, {
      locationId,
      delta: 5,
      reason: 'Inventário — peça achada na prateleira',
    })

    expect(await saldoNoDeposito(variantId, locationId)).toBe(antes + 5)
  })

  it('a contagem que bate não teria como ser lançada: delta zero é 400', async () => {
    const { variantId, locationId } = await umaVarianteComDeposito()

    // A tela pula a linha que bateu com o sistema, e este caso mostra que a
    // decisão não é só estética: o servidor RECUSA o movimento de zero. Se a
    // tela mandasse a folha inteira, uma contagem em que tudo bate viraria uma
    // sequência de 400 — e o operador veria erro no lugar de "está tudo certo".
    const resposta = await createStockMovement(variantId, {
      locationId,
      delta: 0,
      reason: 'Inventário — bateu',
    })
    expect(resposta.status).toBe(400)
  })
})
