import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  getAbcCurveReport,
  getBirthdaysReport,
  getProfessionalRankingReport,
  getQuoteVsStockReport,
  getSalesComparisonReport,
  getSalespersonReport,
  getStockAgingReport,
  getStockValuationReport,
} from '@/api/gerado'
import type {
  AbcCurveReportDto,
  BirthdaysReportDto,
  ProfessionalRankingReportDto,
  QuoteVsStockReportDto,
  SalesComparisonReportDto,
  SalespersonReportDto,
  StockAgingReportDto,
  StockValuationReportDto,
} from '@/api/gerado'
import { apiFetch } from '@/api/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { resetQuotes } from './quotes'
import { TENANT_MATRIZ, resetStore, store } from './store'

/**
 * OS DEZ RELATÓRIOS no modo mock.
 *
 * O que este arquivo guarda não é a aritmética de cada um — é a **fronteira**, que
 * é onde relatório mente: período invertido que vira zero linhas, `sortBy` aparado
 * em silêncio, `pageSize` de 500 devolvendo 100, e o campo sem fonte saindo zero
 * com cara de apuração.
 *
 * O caso mais importante do arquivo é o último: os dez caminhos RESPONDEM. Antes
 * deles, o mock não tinha handler nenhum ali e o fallback da SPA devolvia o
 * `index.html` com **200** — que o cliente lê como `resposta-nao-json`, um erro
 * que não fala de relatório e apareceria só na primeira tela da Fase C.
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

/** Os dez caminhos com um jogo de parâmetros que o contrato aceita. */
const CAMINHOS: readonly { nome: string; url: string }[] = [
  { nome: 'GetAbcCurveReport', url: '/api/reports/abc-curve?from=2025-08-01&to=2025-08-31' },
  {
    nome: 'GetProductsSoldReport',
    url: '/api/reports/products-sold?from=2025-08-01&to=2025-08-31',
  },
  {
    nome: 'GetSalesComparisonReport',
    url: '/api/reports/sales-comparison?from=2025-08-01&to=2025-08-31',
  },
  {
    nome: 'GetSalespersonReport',
    url: '/api/reports/salesperson-performance?from=2025-08-01&to=2025-08-31',
  },
  {
    nome: 'GetProfessionalRankingReport',
    url: '/api/reports/professional-ranking?from=2025-08-01&to=2025-08-31',
  },
  {
    nome: 'GetSupplierMovementReport',
    url: '/api/reports/supplier-movement?from=2025-08-01&to=2025-08-31',
  },
  { nome: 'GetStockValuationReport', url: '/api/reports/stock-valuation' },
  { nome: 'GetStockAgingReport', url: '/api/reports/stock-aging' },
  {
    nome: 'GetQuoteVsStockReport',
    url: '/api/reports/quote-vs-stock?from=2025-08-01&to=2025-08-31',
  },
  { nome: 'GetBirthdaysReport', url: '/api/reports/birthdays?month=8' },
]

/**
 * O pedido por URL CRUA, e não pela função gerada.
 *
 * A maioria dos casos aqui é de RECUSA, e recusa se prova mandando o que o
 * cliente tipado não deixa montar — `filters` num recurso que não o publica,
 * `pageSize=500`, `sortBy` inventado. O `data` vem como `unknown` tipado à mão
 * porque no 400 ele é o `ProblemDetails`, e no 200 é o envelope.
 */
async function pedir(url: string) {
  return apiFetch<{
    status: number
    data: {
      rows?: unknown
      summary?: unknown
      total?: unknown
      type?: string
      fields?: { path: string }[]
    }
  }>(url, {})
}

/**
 * Estreita o union do cliente gerado — no 200, `data` é o envelope.
 *
 * O gerado tipa `data` como `Envelope | ProblemDetails`, e é ele quem obriga o
 * `if (status === 200)` de `compras.test.ts`. Aqui a asserção fica DENTRO do
 * helper: o caso que recebesse 400 falha no status, com a mensagem certa, em vez
 * de estourar num `undefined.rows` três linhas abaixo.
 */
function envelope<T>(resposta: { status: number; data: unknown }): T {
  expect(resposta.status).toBe(200)
  return resposta.data as T
}

describe('1. os dez caminhos respondem JSON do contrato', () => {
  it.each(CAMINHOS)('$nome responde 200 com o envelope', async ({ url }) => {
    const resposta = await pedir(url)

    // 200 sozinho não prova nada: o fallback da SPA também responde 200. O que
    // separa os dois é o corpo ser o envelope, e não o `index.html`.
    expect(resposta.status).toBe(200)
    expect(resposta.data).toHaveProperty('rows')
    expect(resposta.data).toHaveProperty('summary')
    expect(resposta.data).toHaveProperty('total')
    expect(Array.isArray(resposta.data.rows)).toBe(true)
  })
})

describe('2. a fronteira recusa, e recusa nomeando', () => {
  it('período invertido é 400, e não zero linhas', async () => {
    // Zero linhas seria indistinguível de "não houve venda no período", e quem
    // digitou a data trocada concluiria a coisa errada sobre o próprio negócio.
    const resposta = await pedir('/api/reports/abc-curve?from=2025-09-01&to=2025-08-01')

    expect(resposta.status).toBe(400)
    expect(resposta.data.type).toBe('urn:cabinet:erro:campos-invalidos')
  })

  it('período ausente é 400 nomeando os dois campos', async () => {
    const resposta = await pedir('/api/reports/products-sold')

    expect(resposta.status).toBe(400)
    expect(resposta.data.fields?.map((campo) => campo.path).sort()).toEqual(['from', 'to'])
  })

  it.each(CAMINHOS)('$nome recusa `sortBy` fora da whitelist', async ({ url }) => {
    const resposta = await pedir(`${url}${url.includes('?') ? '&' : '?'}sortBy=inventado`)

    expect(resposta.status).toBe(400)
    expect(resposta.data.type).toBe('urn:cabinet:erro:ordenacao-invalida')
  })

  it.each(CAMINHOS)('$nome recusa `pageSize` acima de 100', async ({ url }) => {
    // Aparar em silêncio faz quem pediu 500 e recebeu 100 concluir que só
    // existem 100 linhas — o defeito aparece como relatório curto, nunca como erro.
    const resposta = await pedir(`${url}${url.includes('?') ? '&' : '?'}pageSize=500`)

    expect(resposta.status).toBe(400)
    expect(resposta.data.type).toBe('urn:cabinet:erro:paginacao-invalida')
  })

  it.each(CAMINHOS)('$nome recusa `filters`, que nenhum deles publica', async ({ url }) => {
    const separador = url.includes('?') ? '&' : '?'
    const resposta = await pedir(`${url}${separador}filters=%5B%5D`)

    expect(resposta.status).toBe(400)
    expect(resposta.data.type).toBe('urn:cabinet:erro:filtro-invalido')
  })

  it('mês fora de 1..12 é 400 nomeando o campo', async () => {
    const resposta = await pedir('/api/reports/birthdays?month=13')

    expect(resposta.status).toBe(400)
    expect(resposta.data.fields?.[0]?.path).toBe('month')
  })

  it('granularidade fora do enum é 400', async () => {
    const resposta = await pedir(
      '/api/reports/sales-comparison?from=2025-08-01&to=2025-08-31&granularity=decada',
    )

    expect(resposta.status).toBe(400)
    expect(resposta.data.fields?.[0]?.path).toBe('granularity')
  })

  it('o demonstrativo por atendente NÃO aceita `year`, que só o comparativo tem', async () => {
    // Os dois publicam `granularity` e os enums são DIFERENTES no contrato.
    // Uma whitelist só para os dois deixaria o atendente aceitar um agrupamento
    // que o servidor de verdade recusa.
    const resposta = await pedir(
      '/api/reports/salesperson-performance?from=2025-08-01&to=2025-08-31&granularity=year',
    )

    expect(resposta.status).toBe(400)
  })
})

describe('3. o que o mock TEM, ele agrega de verdade', () => {
  it('o estoque valorizado sai a preço de venda, e o DTO o declara', async () => {
    const dados = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )

    // O débito declarado da #310 viaja no CAMPO, e não num comentário: custo não
    // existe no schema enquanto a decisão D1 não é tomada.
    expect(dados.valuationBasis).toBe('sale_price')
    expect(dados.rows.length).toBeGreaterThan(0)
    expect(dados.summary.itemCount).toBe(dados.total)
  })

  it('o `summary` é do PERÍODO INTEIRO, e não da página', async () => {
    const pagina = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 1 }),
    )
    const inteiro = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )

    expect(pagina.rows).toHaveLength(1)
    // A regra 2 da #310. Somar as linhas visíveis faria a página 1 de 500
    // produtos declarar que o estoque vale o dos cinquenta primeiros.
    expect(pagina.summary.valueCents).toBe(inteiro.summary.valueCents)
    expect(pagina.total).toBe(inteiro.total)
  })

  it('a quantidade viaja como TEXTO decimal, e não como número', async () => {
    // `numeric(18,3)` do outro lado: 0,1 + 0,2 em ponto flutuante não dá 0,3, e
    // meia unidade perdida por arredondamento vira divergência de inventário.
    const dados = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )

    for (const linha of dados.rows) {
      expect(typeof linha.quantity).toBe('string')
      expect(linha.quantity).toMatch(/^-?\d+\.\d{3}$/)
      expect(typeof linha.minStock).toBe('string')
    }
  })

  it('item SEM preço não vale zero: fica sem `valueCents` e conta em `withoutPriceCount`', async () => {
    const dados = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100, includeZero: true }),
    )
    const semPreco = dados.rows.filter((linha) => linha.unitPriceCents === null)

    for (const linha of semPreco) {
      expect(linha.valueCents ?? null).toBeNull()
    }
    expect(dados.summary.withoutPriceCount).toBe(semPreco.length)
  })

  it('a ordenação decrescente por valor põe o SEM PREÇO no fim, não no topo', async () => {
    // "Não vale zero, vale desconhecido" — o contrato escreve isso na whitelist.
    // Tratar ausente como zero levaria o desconhecido para o topo do crescente e
    // enterraria as linhas que o relatório existe para mostrar.
    const dados = envelope<StockValuationReportDto>(
      await getStockValuationReport({
        page: 1,
        pageSize: 100,
        includeZero: true,
        sortBy: 'valueCents',
      }),
    )
    const semValor = dados.rows.findIndex((linha) => (linha.valueCents ?? null) === null)

    if (semValor !== -1) {
      expect(dados.rows.slice(semValor).every((linha) => (linha.valueCents ?? null) === null)).toBe(
        true,
      )
    }
  })

  it('`includeZero` é o que decide se a variante sem saldo aparece', async () => {
    // O CENÁRIO É MONTADO, e não herdado: no seed TODA variante da matriz tem
    // saldo, e um caso que só comparasse os dois totais ali passaria comparando
    // 3 com 3 — verde medindo a semente, não a regra. Tirar um saldo é o que
    // cria a variante sem estoque que o parâmetro existe para revelar.
    const sacrificado = store.saldos.find((saldo) => saldo.tenantId === TENANT_MATRIZ)
    expect(sacrificado, 'o seed precisa ter ao menos um saldo na matriz').toBeDefined()
    store.saldos = store.saldos.filter((saldo) => saldo !== sacrificado)

    const comZero = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100, includeZero: true }),
    )
    const semZero = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )

    expect(comZero.total).toBe(semZero.total + 1)
    expect(semZero.rows.every((linha) => Number(linha.quantity) !== 0)).toBe(true)
    expect(comZero.rows.some((linha) => linha.variantId === sacrificado?.variantId)).toBe(true)
    expect(semZero.rows.some((linha) => linha.variantId === sacrificado?.variantId)).toBe(false)
  })

  it('dias sem venda: todo item sai como NUNCA vendido, e os campos ficam AUSENTES', async () => {
    const dados = envelope<StockAgingReportDto>(
      await getStockAgingReport({ page: 1, pageSize: 100 }),
    )

    expect(dados.summary.neverSoldCount).toBe(dados.summary.itemCount)
    for (const linha of dados.rows) {
      // `null` seria uma data desconhecida com cara de resposta, e `0` em
      // `daysWithoutSale` diria "vendeu hoje". Ausente é o que o mock sabe.
      expect(linha.lastSaleAt ?? undefined).toBeUndefined()
      expect(linha.daysWithoutSale ?? undefined).toBeUndefined()
    }
  })

  it('quem nunca vendeu satisfaz qualquer `minDaysWithoutSale`', async () => {
    // Está parado há mais tempo que qualquer corte. Excluí-lo faria o filtro
    // esconder exatamente o pior caso que ele existe para encontrar.
    const dados = envelope<StockAgingReportDto>(
      await getStockAgingReport({ page: 1, pageSize: 100, minDaysWithoutSale: 999 }),
    )

    expect(dados.total).toBeGreaterThan(0)
  })

  it('aniversariantes: o dia da linha é o dia da data de nascimento', async () => {
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const achados = await Promise.all(
      meses.map(async (month) =>
        envelope<BirthdaysReportDto>(await getBirthdaysReport({ month, page: 1, pageSize: 100 })),
      ),
    )

    expect(achados.reduce((soma, dados) => soma + dados.total, 0)).toBeGreaterThan(0)
    for (const dados of achados) {
      for (const linha of dados.rows) {
        expect(linha.day).toBe(Number(linha.birthDate.slice(8, 10)))
      }
    }
  })

  it('o mês pedido é o mês que volta — e ecoado no envelope', async () => {
    const dados = envelope<BirthdaysReportDto>(
      await getBirthdaysReport({ month: 3, page: 1, pageSize: 100 }),
    )

    expect(dados.month).toBe(3)
    for (const linha of dados.rows) {
      expect(Number(linha.birthDate.slice(5, 7))).toBe(3)
    }
  })

  it('o demonstrativo conta ORÇAMENTO, que existe, e cala o que não existe', async () => {
    const dados = envelope<SalespersonReportDto>(
      await getSalespersonReport({
        from: '2025-08-01',
        to: '2025-08-31',
        page: 1,
        pageSize: 100,
      }),
    )

    expect(dados.summary.quoteCount).toBeGreaterThan(0)
    for (const linha of dados.rows) {
      expect(linha.quoteCount).toBeGreaterThan(0)
      // `0%` leria como "o atendente não fecha nada". A ausência lê como "não há
      // como saber", que é a verdade enquanto o mock não guarda pedido.
      expect(linha.conversionPercent ?? undefined).toBeUndefined()
      expect(linha.averageTicketCents ?? undefined).toBeUndefined()
    }
  })

  it('a série do comparativo tem TODOS os buckets do período, com zero', async () => {
    const dados = envelope<SalesComparisonReportDto>(
      await getSalesComparisonReport({
        from: '2025-01-01',
        to: '2025-06-30',
        granularity: 'month',
        page: 1,
        pageSize: 100,
      }),
    )

    // Buraco na série é informação: omitir o mês vazio faz o gráfico ligar
    // janeiro em junho como se o meio do ano não existisse.
    expect(dados.total).toBe(6)
    expect(dados.rows.map((linha) => linha.bucket)).toEqual([
      '2025-01',
      '2025-02',
      '2025-03',
      '2025-04',
      '2025-05',
      '2025-06',
    ])
    // O PRIMEIRO bucket não tem anterior DENTRO do recorte — e zero ali diria
    // "no mês passado não se vendeu nada", afirmação que o relatório não faz.
    expect(dados.rows[0]?.previousRevenueCents ?? undefined).toBeUndefined()
    expect(dados.rows[1]?.previousRevenueCents).toBe(0)
    // Variação percentual sobre base zero não existe: publicar "0.00" seria
    // dizer "não variou" onde a resposta certa é "não há de que variar".
    expect(dados.rows[1]?.deltaPercent ?? undefined).toBeUndefined()
  })

  it('a granularidade muda os buckets, e volta ecoada', async () => {
    const dados = envelope<SalesComparisonReportDto>(
      await getSalesComparisonReport({
        from: '2025-01-01',
        to: '2025-12-31',
        granularity: 'quarter',
        page: 1,
        pageSize: 100,
      }),
    )

    expect(dados.granularity).toBe('quarter')
    expect(dados.rows.map((linha) => linha.bucket)).toEqual([
      '2025-T1',
      '2025-T2',
      '2025-T3',
      '2025-T4',
    ])
  })
})

describe('4. o que o mock NÃO tem sai vazio, e não somado', () => {
  it('a curva ABC devolve envelope válido com zero linhas', async () => {
    const dados = envelope<AbcCurveReportDto>(
      await getAbcCurveReport({ from: '2025-08-01', to: '2025-08-31' }),
    )

    // Zero linhas é a leitura correta de "não há pedido de venda no mock". O
    // erro que este caso previne é o oposto: alguém somar ORÇAMENTO aqui e a
    // demo pública passar a exibir um faturamento que nunca aconteceu.
    expect(dados.rows).toEqual([])
    expect(dados.total).toBe(0)
    expect(dados.summary.revenueCents).toBe(0)
  })

  it('o ranking de profissional devolve envelope válido com zero linhas', async () => {
    const dados = envelope<ProfessionalRankingReportDto>(
      await getProfessionalRankingReport({ from: '2025-08-01', to: '2025-08-31' }),
    )

    expect(dados.rows).toEqual([])
    expect(dados.summary.orderCount).toBe(0)
  })

  it('orçamento × estoque sai vazio porque as linhas do seed não têm variante', async () => {
    // "Só linhas com variante do catálogo", diz o contrato — e as 17 linhas da
    // §8.1 são transcrição, com `variantId: null`. Vazio aqui é a regra do
    // contrato aplicada ao dado que existe, não uma conta que faltou escrever.
    const dados = envelope<QuoteVsStockReportDto>(
      await getQuoteVsStockReport({
        from: '2025-08-01',
        to: '2025-08-31',
        page: 1,
        pageSize: 100,
      }),
    )

    expect(dados.rows).toEqual([])
    expect(dados.summary.variantCount).toBe(0)
  })
})

describe('5. sem empresa ativa é envelope VAZIO, não erro', () => {
  beforeEach(() => {
    // O operador recém-criado, ainda sem vínculo: "sem empresa" não é erro do
    // cliente, é o estado inicial. É a semântica que o resto do contrato já usa
    // na leitura de LISTA, e relatório é leitura de lista.
    //
    // Direto no store, como os outros testes de mock fazem: `PUT
    // /auth/active-tenant` RECUSA `null` com 403 (empresa fora dos vínculos), e
    // não existe caminho no contrato para "desescolher" — o estado sem empresa é
    // de onde a sessão parte, não um lugar aonde ela volta.
    store.activeTenantId = null
  })

  it('o estoque valorizado volta vazio, com a foto ecoada', async () => {
    const dados = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )

    expect(dados.rows).toEqual([])
    expect(dados.total).toBe(0)
    expect(dados.asOf).toBeTruthy()
  })

  it('o período pedido volta ecoado mesmo sem empresa', async () => {
    const dados = envelope<SalespersonReportDto>(
      await getSalespersonReport({
        from: '2025-08-01',
        to: '2025-08-31',
        page: 1,
        pageSize: 100,
      }),
    )

    expect(dados.from).toBe('2025-08-01')
    expect(dados.to).toBe('2025-08-31')
    expect(dados.rows).toEqual([])
  })

  it('a fronteira continua valendo sem empresa — 400 vence o envelope vazio', async () => {
    // Ordem importa: recusar o `sortBy` inválido DEPOIS de decidir o envelope
    // vazio faria o mesmo pedido responder 200 para quem não tem empresa e 400
    // para quem tem, com a tela mudando de comportamento por causa do vínculo.
    const resposta = await pedir('/api/reports/stock-valuation?sortBy=inventado')

    expect(resposta.status).toBe(400)
  })
})

describe('6. sem sessão é 401 nos dez', () => {
  it.each(CAMINHOS)('$nome recusa o anônimo', async ({ url }) => {
    resetStore()
    const resposta = await pedir(url)

    expect(resposta.status).toBe(401)
    expect(resposta.data.type).toBe('urn:cabinet:erro:sem-sessao')
  })
})

/**
 * O RECORTE POR DEPÓSITO — `warehouseId` (web#352).
 *
 * O seed põe TODO o saldo da matriz no `dep-0001` (PRINCIPAL) e deixa o
 * `dep-0003` (SHOWROOM) sem linha nenhuma. Não é pobreza do fixture: é o par que
 * prova que o recorte recorta. Um seed com saldo espalhado por igual deixaria o
 * filtro passar por implementado mesmo se fosse ignorado.
 *
 * O caso que dá nome à issue é o ÚLTIMO: sem o eco, "recortou" e "ignorou o
 * parâmetro" chegam idênticos ao cliente.
 */
describe('7. o recorte por depósito recorta, e o envelope ecoa', () => {
  it('o depósito com todo o saldo devolve o mesmo que a empresa inteira', async () => {
    const empresa = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )
    const principal = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100, warehouseId: 'dep-0001' }),
    )

    expect(principal.total).toBe(empresa.total)
    expect(principal.summary.valueCents).toBe(empresa.summary.valueCents)
  })

  it('o depósito que nunca viu peça devolve VAZIO, e não a empresa inteira', async () => {
    const empresa = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )
    const showroom = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100, warehouseId: 'dep-0003' }),
    )

    expect(empresa.total).toBeGreaterThan(0)
    // O modo de falhar que a #352 nomeia: servidor que aceita o parâmetro e
    // continua somando o agregado da empresa responde 200 com o total inteiro
    // sob o rótulo de um depósito.
    expect(showroom.total).toBe(0)
    expect(showroom.rows).toEqual([])
    expect(showroom.summary.valueCents).toBe(0)
  })

  it('os três ecoam o depósito que USARAM', async () => {
    const valorizado = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100, warehouseId: 'dep-0001' }),
    )
    const parado = envelope<StockAgingReportDto>(
      await getStockAgingReport({ page: 1, pageSize: 100, warehouseId: 'dep-0001' }),
    )
    const orcado = envelope<QuoteVsStockReportDto>(
      await getQuoteVsStockReport({
        from: '2025-08-01',
        to: '2025-08-31',
        page: 1,
        pageSize: 100,
        warehouseId: 'dep-0001',
      }),
    )

    expect(valorizado.warehouseId).toBe('dep-0001')
    expect(parado.warehouseId).toBe('dep-0001')
    expect(orcado.warehouseId).toBe('dep-0001')
  })

  it('sem recorte o eco fica AUSENTE — não é nulo nem string vazia', async () => {
    const dados = envelope<StockValuationReportDto>(
      await getStockValuationReport({ page: 1, pageSize: 100 }),
    )

    // Ausente é o que a tela lê como "resposta da empresa inteira". Nulo diria a
    // mesma coisa, mas o contrato declara o campo opcional e o mock não inventa
    // membro que o servidor não precisa mandar.
    expect(dados.warehouseId).toBeUndefined()
  })

  it('o estoque parado recorta a quantidade e mantém os dias', async () => {
    const empresa = envelope<StockAgingReportDto>(
      await getStockAgingReport({ page: 1, pageSize: 100 }),
    )
    const showroom = envelope<StockAgingReportDto>(
      await getStockAgingReport({ page: 1, pageSize: 100, warehouseId: 'dep-0003' }),
    )

    expect(empresa.summary.itemCount).toBeGreaterThan(0)
    expect(showroom.summary.itemCount).toBe(0)
    // Dias sem venda é da VENDA, e venda não acontece em depósito: o que o
    // recorte muda é quanto está parado ali, e quais itens aparecem.
    expect(empresa.rows.every((linha) => linha.daysWithoutSale === undefined)).toBe(true)
  })

  it('`warehouseId` com cara de uuid e forma inválida é 400, não recorte vazio', async () => {
    // Zero linhas seria indistinguível de "este depósito está vazio" — o mesmo
    // precedente do período invertido, que também é 400 e não lista vazia.
    const resposta = await pedir(
      '/api/reports/stock-valuation?warehouseId=zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',
    )

    expect(resposta.status).toBe(400)
  })
})
