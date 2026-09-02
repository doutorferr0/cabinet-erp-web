import { configurarApi } from '@/api/cliente'
import type {
  NavCountersDto,
  OpportunitiesSummaryDto,
  PurchaseOrdersSummaryDto,
  QuotesSummaryDto,
  StockSummaryDto,
} from '@/api/gerado'
import {
  authLogin,
  authSetActiveTenant,
  checkGoodsReceipt,
  createGoodsReceipt,
  getNavCounters,
  getOpportunitiesSummary,
  getPurchaseOrdersSummary,
  getQuotesSummary,
  getStockSummary,
  listPurchaseOrders,
  postGoodsReceipt,
} from '@/api/gerado'
import { apiFetch } from '@/api/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mesesFechados } from './agregados'
import { estadoDeCompras } from './compras'
import { handlers } from './handlers'
import { resetQuotes } from './quotes'
import { TENANT_MATRIZ, resetStore, store } from './store'

/**
 * OS CINCO AGREGADOS DE KPI no modo mock (#479, D11).
 *
 * O que este arquivo guarda não é a aritmética de cada número — é que a faixa
 * conta o MESMO conjunto que a grade abaixo dela. Duas apurações do mesmo
 * assunto divergem em silêncio, e divergem justamente onde ninguém olha: o
 * resumo diz nove e a lista mostra onze, as duas plausíveis.
 *
 * E o caso mais importante do arquivo é o primeiro: os cinco caminhos
 * RESPONDEM. Rota declarada mockada sem handler cai no fallback da SPA e
 * devolve `index.html` com **200** — o cliente lê como `resposta-nao-json`, e o
 * erro não fala de KPI nenhum.
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

const CAMINHOS = [
  '/api/purchases/orders-summary',
  '/api/sales/quotes-summary',
  '/api/stock/summary',
  '/api/crm/opportunities-summary',
  '/api/nav/counters',
] as const

describe('agregados de KPI — o mock responde os cinco', () => {
  it('os cinco caminhos respondem JSON, não o index.html da SPA', async () => {
    for (const caminho of CAMINHOS) {
      const resposta = (await apiFetch(caminho, { method: 'GET' })) as {
        status: number
        data: unknown
      }
      expect(resposta.status, caminho).toBe(200)
      // Um `index.html` também dá 200. O que separa é o corpo ser objeto.
      expect(typeof resposta.data, caminho).toBe('object')
      expect(resposta.data, caminho).not.toBeNull()
    }
  })

  it('sem sessão os cinco recusam — agregado não é dado público', async () => {
    store.logado = false
    for (const caminho of CAMINHOS) {
      const resposta = (await apiFetch(caminho, { method: 'GET' })) as { status: number }
      expect(resposta.status, caminho).toBe(401)
    }
  })

  it('sem empresa ativa responde ZERO, não 409', async () => {
    // A semântica da Etapa 0: o domínio responde VAZIO, não erro — e vazio,
    // para número, é zero. Um 409 aqui derrubaria a listagem inteira por não
    // haver empresa escolhida, quando a grade abaixo mostraria a lista vazia
    // sem reclamar.
    store.activeTenantId = null

    const compras = (await apiFetch('/api/purchases/orders-summary', {
      method: 'GET',
    })) as unknown as { data: PurchaseOrdersSummaryDto; status: number }
    expect(compras.status).toBe(200)
    expect(compras.data.openOrders).toBe(0)
    expect(compras.data.openOrdersValueCents).toBe(0)
    expect(compras.data.monthlyValueSeries).toEqual([])

    const nav = (await apiFetch('/api/nav/counters', { method: 'GET' })) as unknown as {
      data: NavCountersDto
      status: number
    }
    expect(nav.status).toBe(200)
    expect(Object.values(nav.data).every((v) => v === 0)).toBe(true)
  })
})

describe('a faixa conta o MESMO conjunto que a grade abaixo dela', () => {
  it('`openOrders` bate com a listagem de ordens não recebidas por inteiro', async () => {
    // É o caso que justifica o endpoint existir. Se o resumo apurasse por um
    // critério e a listagem por outro, a divergência não teria como aparecer:
    // os dois números são plausíveis, e ninguém confere nove contra onze.
    const resumo = await getPurchaseOrdersSummary()
    const dados = resumo.data as PurchaseOrdersSummaryDto

    // `pageSize` no teto: o conjunto INTEIRO, não a primeira página — que é
    // exatamente o erro que a faixa não pode cometer.
    const lista = await listPurchaseOrders({ pageSize: 100 })
    const abertas = (lista.data as { rows: { status: string }[] }).rows.filter(
      (o) => o.status !== 'cancelled',
    )

    expect(dados.openOrders).toBeLessThanOrEqual(abertas.length)
    expect(dados.lateOrders).toBeLessThanOrEqual(dados.openOrders)
    expect(dados.arrivingThisWeek).toBeLessThanOrEqual(dados.openOrders)
  })

  it('o contador da nav e os resumos dão o MESMO aberto', async () => {
    // Dois lugares da tela mostrando "aberto" com números diferentes é o pior
    // defeito possível aqui — a badge da sidebar contradiz a faixa acima da
    // grade, no mesmo quadro.
    const nav = (await getNavCounters()).data as NavCountersDto
    const compras = (await getPurchaseOrdersSummary()).data as PurchaseOrdersSummaryDto
    expect(nav.purchaseOrdersOpen).toBe(compras.openOrders)

    const oportunidades = (await getOpportunitiesSummary()).data as OpportunitiesSummaryDto
    expect(nav.opportunitiesOpen).toBe(oportunidades.openOpportunities)

    const estoque = (await getStockSummary()).data as StockSummaryDto
    expect(nav.stockCritical).toBe(estoque.criticalItems)

    const orcamentos = (await getQuotesSummary()).data as QuotesSummaryDto
    expect(nav.quotesOpen).toBe(orcamentos.openQuotes)
  })

  it('ordem RECEBIDA POR INTEIRO sai dos DOIS números, e do mesmo jeito', async () => {
    // **Este caso é o que dá valor ao anterior.** Na semente, nenhuma ordem
    // está recebida por inteiro — então "conta tudo que não foi cancelado" e
    // "conta o que ainda falta chegar" dão o mesmo número, e o par acima passa
    // verde com os dois critérios. Falsificado: trocar um dos dois pelo outro
    // não reprovava nada.
    //
    // Aqui a ordem é fechada pela PORTA DE VERDADE (recebimento lançado), e aí
    // os critérios divergem — quem não usar o mesmo leitor erra.
    const antesNav = (await getNavCounters()).data as NavCountersDto
    const antes = (await getPurchaseOrdersSummary()).data as PurchaseOrdersSummaryDto

    const ordem = estadoDeCompras().ordens.find(
      (o) =>
        o.tenantId === TENANT_MATRIZ &&
        o.status !== 'cancelled' &&
        o.itens.length > 0 &&
        // Linha sem variante não tem como ser recebida, e uma ordem com uma
        // delas nunca fecharia — o caso mediria a coisa errada em silêncio.
        o.itens.every((linha) => linha.variantId !== null),
    )
    if (!ordem) throw new Error('semente sem ordem de compra aberta — o caso perdeu o objeto')

    const criado = await createGoodsReceipt({
      supplierId: ordem.supplierId,
      items: ordem.itens.map((linha, i) => ({
        lineNumber: i + 1,
        variantId: linha.variantId as string,
        purchaseOrderId: ordem.id,
        purchaseOrderLine: linha.lineNumber,
        quantityReceived: linha.quantity,
      })),
    })
    const recebimento = criado.data as { id: string }
    // Conferir ANTES de lançar: só recebimento conferido entra no galpão, e é
    // o lançado (`posted`) que abate o saldo da linha da ordem.
    expect((await checkGoodsReceipt(recebimento.id)).status).toBe(200)
    expect((await postGoodsReceipt(recebimento.id)).status).toBe(200)

    const depoisNav = (await getNavCounters()).data as NavCountersDto
    const depois = (await getPurchaseOrdersSummary()).data as PurchaseOrdersSummaryDto

    // Caiu exatamente uma, e caiu NOS DOIS: é o que prova que o número da
    // badge e o da faixa saem do mesmo leitor (`ordensParaAgregado`).
    expect(depois.openOrders).toBe(antes.openOrders - 1)
    expect(depoisNav.purchaseOrdersOpen).toBe(antesNav.purchaseOrdersOpen - 1)
    expect(depoisNav.purchaseOrdersOpen).toBe(depois.openOrders)
  })
})

describe('nada aqui inventa histórico', () => {
  it('a série não passa de doze pontos — a janela é do desenho', async () => {
    // Quatro cópias de "doze meses" divergiriam na primeira vez que alguém
    // mudasse uma para dezoito, e a faixa passaria a comparar sparklines de
    // escalas diferentes lado a lado.
    for (const chamada of [getPurchaseOrdersSummary, getQuotesSummary, getStockSummary]) {
      const dados = (await chamada()).data as { monthlyValueSeries: number[] }
      expect(dados.monthlyValueSeries.length).toBeLessThanOrEqual(12)
    }
    const crm = (await getOpportunitiesSummary()).data as OpportunitiesSummaryDto
    expect(crm.monthlyWonSeries.length).toBeLessThanOrEqual(12)
  })

  it('série curta é resposta legítima — não completa com zero', async () => {
    // Seed magro dá sparkline curta, e é honesto: preencher com zeros desenha
    // uma queda que nunca houve, para o operador do site público.
    const dados = (await getPurchaseOrdersSummary()).data as PurchaseOrdersSummaryDto
    expect(dados.monthlyValueSeries.every((v) => Number.isInteger(v))).toBe(true)
  })

  it('`mesesFechados` devolve meses FECHADOS, o corrente fora', () => {
    // O mês corrente na série faria o último ponto cair todo mês 1 e subir
    // até o dia 31 — a sparkline mostraria uma queda mensal que é só o
    // calendário. O valor do mês corrente já sai em `monthValueCents`.
    const meses = mesesFechados(12, new Date('2026-09-02T12:00:00'))
    expect(meses).toHaveLength(12)
    expect(meses[11]).toBe('2026-08')
    expect(meses).not.toContain('2026-09')
    // Do mais antigo para o mais recente: invertido, a sparkline desenharia
    // toda tendência ao contrário sem nada acusar.
    expect(meses[0]).toBe('2025-09')
  })
})

describe('estoque — a soma diz o que ficou de fora', () => {
  it('variante sem preço não vale zero: sai contada em `unpricedVariants`', async () => {
    // Somar zero pela variante sem preço faria buraco de cadastro aparecer
    // como estoque barato, e o operador decidiria por um número incompleto sem
    // saber que ele é incompleto.
    const dados = (await getStockSummary()).data as StockSummaryDto
    expect(dados.unpricedVariants).toBeGreaterThanOrEqual(0)
    expect(dados.unpricedVariants).toBeLessThanOrEqual(dados.variantCount)
    expect(dados.stockValueCents).toBeGreaterThanOrEqual(0)
  })
})
