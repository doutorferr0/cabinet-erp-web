import { configurarApi } from '@/api/cliente'
import { authLogin, authSetActiveTenant, getQuote, listQuotes } from '@/api/gerado'
import { apiFetch } from '@/api/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { resetQuotes } from './quotes'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * O servidor falso de `/api/quotes` — o que o site demo realmente executa.
 *
 * Os testes de TELA usam o stub de `src/test/orcamentos.ts`; este arquivo prova
 * as semânticas que só o handler tem, e que a tela nunca veria: número atribuído
 * pelo servidor, total calculado e cancelamento por verbo próprio.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetQuotes()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/** O corpo mínimo que o contrato aceita. */
function corpoMinimo(over: Record<string, unknown> = {}) {
  return {
    customerId: 'cli-0001',
    discountMode: 'product',
    discountPercent: 0,
    environments: [],
    items: [],
    ...over,
  }
}

async function criar(corpo: unknown) {
  return apiFetch<{ data?: { id: string; number: string; totalCents: number }; status: number }>(
    '/api/quotes',
    {
      method: 'POST',
      body: JSON.stringify(corpo),
      headers: { 'content-type': 'application/json' },
    },
  )
}

describe('orçamento no modo mock', () => {
  it('a listagem serve o seed da transcrição, paginado', async () => {
    const resposta = await listQuotes({ page: 1, pageSize: 100 })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    expect(resposta.data.total).toBeGreaterThan(10)
    expect(resposta.data.rows.some((o) => o.customerName === 'ANDRÉ BATALHA')).toBe(true)
  })

  it('sortBy fora da whitelist é 400 — ordem errada não passa calada', async () => {
    const resposta = await listQuotes({ sortBy: 'series' })
    expect(resposta.status).toBe(400)
  })

  /**
   * O NÚMERO é do servidor: `QuoteWriteRequest` não tem o campo, e a sequência
   * é global do grupo. Cliente que escolhe número colide entre empresas.
   */
  it('criar atribui o próximo número da sequência', async () => {
    const antes = await listQuotes({ page: 1, pageSize: 100 })
    if (antes.status !== 200) throw new Error('listagem falhou')
    const maior = Math.max(...antes.data.rows.map((o) => Number(o.number)))

    const criado = await criar(corpoMinimo())
    expect(criado.status).toBe(201)
    expect(Number(criado.data?.number)).toBe(maior + 1)
  })

  it('cliente é obrigatório — sem ele é 400, não documento órfão', async () => {
    const resposta = await criar(corpoMinimo({ customerId: '' }))
    expect(resposta.status).toBe(400)
  })

  /**
   * `totalCents` é CALCULADO, nunca recebido: total que o cliente manda é total
   * que diverge do item na primeira arredondada.
   */
  it('o total sai dos itens, e o desconto do item entra na conta', async () => {
    const criado = await criar(
      corpoMinimo({
        items: [
          {
            lineNumber: 1,
            description: 'X',
            quantity: 2,
            unitPriceCents: 50_000,
            // 4 casas implícitas: 100000 = 10%.
            discountPercent: 100_000,
          },
        ],
      }),
    )

    // 2 × R$ 500,00 = R$ 1.000,00, menos 10% = R$ 900,00.
    expect(criado.data?.totalCents).toBe(90_000)
  })

  it('cancelar é verbo próprio, e o `status` não muda por PUT', async () => {
    const criado = await criar(corpoMinimo())
    const id = criado.data?.id as string

    const cancelado = await apiFetch<{ data?: { status: string }; status: number }>(
      `/api/quotes/${id}/cancel`,
      { method: 'POST' },
    )
    expect(cancelado.data?.status).toBe('cancelled')

    const depois = await getQuote(id)
    if (depois.status !== 200) throw new Error('detalhe falhou')
    expect(depois.data.status).toBe('cancelled')
  })

  it('id que não existe é 404, não documento em branco', async () => {
    const resposta = await getQuote('orc-que-nao-existe')
    expect(resposta.status).toBe(404)
  })

  it('`filters` RECORTA — antes o handler ignorava o parâmetro', async () => {
    // Ignorar filtro é pior que recusá-lo: a tela desenha a condição no painel,
    // o mock devolve a lista inteira, e quem lê conclui que ela não estreita
    // nada. Contra o `:3000` o mesmo pedido recorta, então o sintoma só existia
    // onde não há servidor — o site público, que é 100% mock.
    //
    // A prova não depende da semente ter dois clientes: um nome que ninguém tem
    // devolve ZERO enquanto a lista sem filtro tem linhas. Filtro ignorado
    // devolveria as duas iguais.
    const inteira = await listQuotes({ page: 1, pageSize: 100 })
    expect(inteira.status).toBe(200)
    if (inteira.status !== 200) return
    expect(inteira.data.total).toBeGreaterThan(0)

    const busca = new URLSearchParams({
      pageSize: '100',
      filters: JSON.stringify([
        { field: 'customerName', operator: 'iLike', value: 'ZZZ CLIENTE QUE NAO EXISTE' },
      ]),
    })
    const vazia = await fetch(`http://mock.teste/api/quotes?${busca}`)

    expect(vazia.status).toBe(200)
    expect(((await vazia.json()) as { total: number }).total).toBe(0)
  })

  it('campo fora da whitelist do `filters` é 400, não filtro descartado', async () => {
    const busca = new URLSearchParams({
      filters: JSON.stringify([{ field: 'totalCents', operator: 'eq', value: '1000' }]),
    })
    const r = await fetch(`http://mock.teste/api/quotes?${busca}`)

    // `totalCents` é dinheiro em centavos, e a subtração é a mesma da
    // oportunidade: quem digita mil reais procuraria R$ 10,00.
    expect(r.status).toBe(400)
    expect(((await r.json()) as { type: string }).type).toBe('urn:cabinet:erro:filtro-invalido')
  })
})
