import { configurarApi } from '@/api/cliente'
import { authLogin, authSetActiveTenant, getQuote, listQuotes } from '@/api/gerado'
import { apiFetch } from '@/api/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { resetObras } from './obras'
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
  resetObras()
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

/**
 * O ELO COM A OBRA, E O DESCONTO POR GRUPO — o que o contrato passou a pedir.
 *
 * Os dois vieram do §2 do comparativo Softlux. O elo porque `Venda.Obr_codigo`
 * existe no legado desde sempre e o contrato só publicava `projectName`, texto
 * livre — e no seed da §8.1 esse texto guarda o nome do PROFISSIONAL, não o da
 * obra: dois orçamentos da mesma obra nunca foram a mesma obra para ninguém.
 *
 * O desconto por grupo porque `VendaDesconto` tem **300.337 linhas** para 37.707
 * vendas — é o modo mais usado da operação, e o único dos três que o contrato
 * não publicava.
 */
describe('a obra e o desconto por grupo', () => {
  it('workId viaja na escrita e volta com workName resolvido', async () => {
    const criado = await criar(corpoMinimo({ customerId: 'parc-0002', workId: 'obra-0001' }))
    expect(criado.status).toBe(201)

    const detalhe = await getQuote(String(criado.data?.id))
    expect(detalhe.status).toBe(200)
    if (detalhe.status !== 200) return

    expect(detalhe.data.workId).toBe('obra-0001')
    // RESOLVIDO, nunca guardado: nome gravado ao lado do id diverge dele na
    // primeira alteração — a mesma regra de `customerName` e `parentName`.
    expect(detalhe.data.workName).toBe('APARTAMENTO IBIRAPUERA 142')
  })

  it('projectName e workName são dados DIFERENTES, e convivem', async () => {
    const criado = await criar(
      corpoMinimo({
        customerId: 'parc-0002',
        workId: 'obra-0001',
        projectName: 'MARIANA',
      }),
    )
    const detalhe = await getQuote(String(criado.data?.id))
    if (detalhe.status !== 200) throw new Error('detalhe falhou')

    // Um é o que foi digitado, o outro é como a obra se chama. Sobrescrever um
    // com o outro apagaria o que o operador escreveu.
    expect(detalhe.data.projectName).toBe('MARIANA')
    expect(detalhe.data.workName).toBe('APARTAMENTO IBIRAPUERA 142')
  })

  it('obra de OUTRO cliente é 400 apontando workId, não vínculo reescrito', async () => {
    // `obra-0001` é de `parc-0002`. A obra pertence ao cliente
    // (`Obras.Cli_codigo`) e o documento não reescreve esse vínculo — aceitar
    // calado penduraria o endereço de um cliente na venda de outro.
    const r = await criar(corpoMinimo({ customerId: 'parc-0003', workId: 'obra-0001' }))
    expect(r.status).toBe(400)
  })

  it('obra de OUTRA empresa não existe para quem pergunta', async () => {
    // `obra-0003` é do TENANT_FILIAL. Some da listagem da matriz, e aqui recusa
    // — o recorte por empresa vale para a ESCRITA também, senão o id de fora
    // vira elo válido e o nome da obra alheia sai na resposta.
    const r = await criar(corpoMinimo({ customerId: 'parc-0003', workId: 'obra-0003' }))
    expect(r.status).toBe(400)
  })

  it('ordenar por workName é aceito — a whitelist publicada é a que vale', async () => {
    const r = await listQuotes({ sortBy: 'workName', pageSize: 100 })
    expect(r.status).toBe(200)
  })

  it('filtrar por workId RECORTA, e não devolve a lista inteira', async () => {
    const criado = await criar(corpoMinimo({ customerId: 'parc-0002', workId: 'obra-0001' }))
    expect(criado.status).toBe(201)

    const inteira = await listQuotes({ page: 1, pageSize: 100 })
    if (inteira.status !== 200) throw new Error('listagem falhou')

    const busca = new URLSearchParams({
      pageSize: '100',
      filters: JSON.stringify([{ field: 'workId', operator: 'eq', value: 'obra-0001' }]),
    })
    const recortada = await fetch(`http://mock.teste/api/quotes?${busca}`)
    const corpo = (await recortada.json()) as { total: number }

    // O pior caso deste eixo não é recusar demais, é IGNORAR: filtro descartado
    // em silêncio devolve a lista inteira com a condição desenhada no painel.
    expect(corpo.total).toBe(1)
    expect(inteira.data.total).toBeGreaterThan(1)
  })

  it('discountMode `group` é 400 em voz alta, não desconto por produto calado', async () => {
    // O contrato publica os três modos; nem o backend nem o mock servem o
    // terceiro. Sem esta recusa, `daEscrita` mapeia todo modo que não é
    // `general` para PRODUTO — e o documento volta 200, com desconto que não é
    // o pedido, no site que não tem servidor atrás para corrigir a impressão.
    const r = await criar(corpoMinimo({ discountMode: 'group', discountPercent: 0 }))
    expect(r.status).toBe(400)
  })

  it('groupDiscounts vem VAZIA, nunca ausente', async () => {
    const criado = await criar(corpoMinimo())
    const detalhe = await getQuote(String(criado.data?.id))
    if (detalhe.status !== 200) throw new Error('detalhe falhou')

    // Ausente e vazia leem igual na tela e diferente na conta.
    expect(detalhe.data.groupDiscounts).toEqual([])
  })
})
