import type { NavCountersDto, PurchaseOrdersSummaryDto } from '@/api/gerado'
import { getNavCounters, getPurchaseOrdersSummary } from '@/api/gerado'
import { CHAVES, variacao } from '@/data/agregados-api'
import { ErroDaApi, dadosOuErro } from '@/data/api-provider'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A fronteira dos agregados de KPI contra SERVIDOR FALSO, nunca contra mock do
 * módulo: o cliente gerado chama `fetch(new Request(...))`, e é o `Request` que
 * carrega verbo e caminho. Stub que casa só por caminho deixaria uma operação
 * cair na resposta de outra e o teste passaria sem asserir nada.
 */

const RESUMO_DE_COMPRAS: PurchaseOrdersSummaryDto = {
  openOrders: 9,
  openOrdersValueCents: 3_841_000,
  lateOrders: 2,
  arrivingThisWeek: 3,
  monthValueCents: 11_298_000,
  previousMonthValueCents: 10_000_000,
  monthlyValueSeries: [1, 2, 3],
}

const CONTADORES: NavCountersDto = {
  quotesOpen: 14,
  ordersOpen: 6,
  purchaseOrdersOpen: 9,
  goodsReceiptsPending: 1,
  opportunitiesOpen: 7,
  tasksDue: 3,
  todosOpen: 5,
  stockCritical: 2,
}

let servidor: ReturnType<typeof instalarServidor>

beforeEach(() => {
  servidor = instalarServidor({
    '/api/purchases/orders-summary': () => json(RESUMO_DE_COMPRAS),
    '/api/nav/counters': () => json(CONTADORES),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('agregados — a fronteira fala com os caminhos que o contrato publica', () => {
  it('o resumo de compras sai no caminho do contrato, por GET', async () => {
    // Caminho ERRADO aqui responderia 404 (o servidor falso não tem rota
    // coringa), e é isso que faz a asserção valer: o teste quebra se alguém
    // renomear a operação no contrato sem rodar o codegen.
    const dados = dadosOuErro<PurchaseOrdersSummaryDto>(await getPurchaseOrdersSummary(), 'x')
    expect(dados.openOrdersValueCents).toBe(3_841_000)

    const chamadas = servidor.em('/api/purchases/orders-summary')
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]?.metodo).toBe('GET')
  })

  it('os contadores da navegação são UMA leitura, não oito', async () => {
    // Oito consultas dariam oito instantes no mesmo quadro: o item some de um
    // contador e aparece noutro sem nunca ter existido nos dois.
    const dados = dadosOuErro<NavCountersDto>(await getNavCounters(), 'x')
    expect(dados.quotesOpen).toBe(14)
    expect(servidor.chamadas).toHaveLength(1)
  })

  it('erro do servidor vira ErroDaApi, não dado pela metade', async () => {
    vi.unstubAllGlobals()
    instalarServidor({
      '/api/purchases/orders-summary': () => problema(500, 'Falhou'),
    })
    await expect(async () =>
      dadosOuErro<PurchaseOrdersSummaryDto>(
        await getPurchaseOrdersSummary(),
        'Falha ao carregar o resumo.',
      ),
    ).rejects.toBeInstanceOf(ErroDaApi)
  })

  it('as chaves de cache não colidem entre famílias', () => {
    // Faixa de compras invalidando a de vendas mostraria número de outro
    // módulo enquanto a consulta certa não volta — e ninguém veria o erro,
    // porque os dois são plausíveis.
    const todas = Object.values(CHAVES).map((c) => JSON.stringify(c))
    expect(new Set(todas).size).toBe(todas.length)
  })
})

describe('variacao — a derivação que o DTO não manda pronta', () => {
  it('deriva pontos percentuais inteiros dos dois campos visíveis', () => {
    // O operador confere: `112.980` contra `100.000` é +13%. Percentual vindo
    // pronto do servidor ele não teria como conferir contra nada na tela.
    expect(variacao(11_298_000, 10_000_000)).toBe(13)
    expect(variacao(9_000_000, 10_000_000)).toBe(-10)
    expect(variacao(10_000_000, 10_000_000)).toBe(0)
  })

  it('base ZERO devolve null — e null é o que o KPI não desenha', () => {
    // Crescer de zero é infinito. `+100%` ali seria mentira aritmética que o
    // operador não tem como desconfiar, e empresa no primeiro mês cai
    // exatamente nesse caso — o mês em que ela mais olha o número.
    expect(variacao(500, 0)).toBeNull()
    expect(variacao(0, 0)).toBeNull()
  })

  it('base NEGATIVA não inverte o sinal da variação', () => {
    // Sem o `Math.abs` na base, sair de -100 para -50 (melhora) daria -50%,
    // e a faixa pintaria de vermelho uma dívida que diminuiu.
    expect(variacao(-50, -100)).toBe(50)
  })
})
