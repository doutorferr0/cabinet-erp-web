import type {
  QuoteVsStockReportDto,
  StockAgingReportDto,
  StockLocationDto,
  StockValuationReportDto,
} from '@/api/gerado'
import { instalarServidor, json } from '@/test/servidor'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * AS TRÊS TELAS DE RELATÓRIO DE ESTOQUE (web#352), contra servidor falso.
 *
 * O que estes testes travam, e por que cada um existe:
 *
 * 1. **O resumo é do recorte INTEIRO e as linhas são da página.** Os dois vêm do
 *    mesmo envelope, e a tela não soma nada — somar as linhas visíveis faria a
 *    página 1 de 500 itens declarar que o estoque vale o dos cinquenta
 *    primeiros.
 * 2. **O recorte por depósito viaja na query** — e só quando escolhido. O
 *    contrato trata ausência como "a empresa inteira"; mandar vazio faria o
 *    servidor separar ausência de vazio sem motivo.
 * 3. **O ECO decide o que a tela pode afirmar.** Servidor que aceita
 *    `warehouseId` e responde pelo saldo agregado da empresa devolve 200 com o
 *    número errado sob o rótulo certo. Sem o eco, nada na resposta distingue os
 *    dois casos — e é por isso que a ausência dele levanta aviso em vez de
 *    passar batido.
 * 4. **Item sem preço não vale zero.** `unitPriceCents` nulo sai "sem preço", e
 *    o `withoutPriceCount` do resumo diz quanto do total não dá para confiar.
 */

const PRINCIPAL: StockLocationDto = {
  id: 'dep-1',
  parentId: null,
  code: 'PRINCIPAL',
  name: 'DEPÓSITO PRINCIPAL',
  isDefault: true,
  active: true,
}

const SHOWROOM: StockLocationDto = {
  id: 'dep-2',
  parentId: null,
  code: 'SHOWROOM',
  name: 'SHOWROOM CENTRO',
  isDefault: false,
  active: true,
}

const VALORIZADO: StockValuationReportDto = {
  asOf: '2026-08-25T15:00:00.000Z',
  valuationBasis: 'sale_price',
  page: 1,
  pageSize: 50,
  total: 2,
  summary: {
    // MAIOR que a soma das linhas desta página, e de propósito: o resumo é do
    // recorte inteiro (`total: 2` é só o que cabe aqui). Fixture em que os dois
    // batem não distingue "leu o summary" de "somou o que estava à vista".
    valueCents: 9_150_000,
    itemCount: 2,
    belowMinimumCount: 1,
    withoutPriceCount: 1,
  },
  rows: [
    {
      variantId: 'var-1',
      description: 'PENDENTE VIDRO FUMÊ 30CM · PRETO FOSCO',
      productGroup: 'PENDENTE',
      quantity: '12.000',
      unitPriceCents: 189_900,
      valueCents: 2_278_800,
      minStock: '2.000',
      belowMinimum: false,
    },
    {
      variantId: 'var-2',
      description: 'ARANDELA TUBULAR · DOURADO',
      productGroup: null,
      quantity: '1.000',
      unitPriceCents: null,
      valueCents: null,
      minStock: '4.000',
      belowMinimum: true,
    },
  ],
}

const PARADO: StockAgingReportDto = {
  asOf: '2026-08-25T15:00:00.000Z',
  page: 1,
  pageSize: 50,
  total: 1,
  summary: { itemCount: 1, neverSoldCount: 1, valueCents: 2_278_800 },
  rows: [
    {
      variantId: 'var-1',
      description: 'PENDENTE VIDRO FUMÊ 30CM · PRETO FOSCO',
      productGroup: 'PENDENTE',
      quantity: '12.000',
      valueCents: 2_278_800,
      daysInStock: 24,
    },
  ],
}

const ORCADO: QuoteVsStockReportDto = {
  from: '2026-08-01',
  to: '2026-08-31',
  page: 1,
  pageSize: 50,
  total: 1,
  summary: { variantCount: 1, shortageCount: 1 },
  rows: [
    {
      variantId: 'var-1',
      description: 'PENDENTE VIDRO FUMÊ 30CM · PRETO FOSCO',
      quotedQuantity: '20.000',
      stockQuantity: '12.000',
      shortageQuantity: '8.000',
      quoteCount: 3,
      sufficient: false,
    },
  ],
}

/**
 * O servidor falso. `respostaDoRelatorio` recebe a chamada para que o teste
 * possa responder EM FUNÇÃO da query — é assim que se prova o eco: um servidor
 * que sempre devolve o mesmo corpo não distingue recorte feito de ignorado.
 */
function servidor(
  caminho: string,
  respostaDoRelatorio: (url: URL) => unknown,
  depositos: StockLocationDto[] = [PRINCIPAL, SHOWROOM],
) {
  return instalarServidor({
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/catalog-lookups': () => json({ rows: [], total: 0 }),
    '/api/stock-locations': () => json({ rows: depositos, total: depositos.length }),
    [caminho]: (chamada) => respostaDoRelatorio(new URL(chamada.url)),
  })
}

/** O eco honesto: o servidor devolve o `warehouseId` que de fato usou. */
function comEco<T extends { warehouseId?: string | null }>(corpo: T) {
  return (url: URL) => {
    const pedido = url.searchParams.get('warehouseId')
    return json(pedido ? { ...corpo, warehouseId: pedido } : corpo)
  }
}

/** A tabela de itens — a única da tela, mas o escopo evita casar com o resumo. */
async function tabela(): Promise<HTMLElement> {
  return (await screen.findAllByRole('table'))[0] as HTMLElement
}

/**
 * A query da ÚLTIMA chamada do relatório.
 *
 * Explode quando não houve chamada nenhuma, em vez de asserir sobre
 * `undefined`: tela que não pediu nada faria toda asserção sobre parâmetro
 * passar por vacuidade.
 */
function ultimaQuery(falso: ReturnType<typeof instalarServidor>, caminho: string): URLSearchParams {
  const chamada = falso.em(caminho).at(-1)
  if (!chamada) throw new Error(`a tela não chamou ${caminho}`)
  return new URL(chamada.url).searchParams
}

/** A query da PRIMEIRA chamada — o que a tela pede assim que abre. */
function primeiraQuery(
  falso: ReturnType<typeof instalarServidor>,
  caminho: string,
): URLSearchParams {
  const chamada = falso.em(caminho).at(0)
  if (!chamada) throw new Error(`a tela não chamou ${caminho}`)
  return new URL(chamada.url).searchParams
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('estoque valorizado', () => {
  it('mostra o resumo do recorte inteiro e as linhas da página', async () => {
    const falso = servidor('/api/reports/stock-valuation', comEco(VALORIZADO))
    renderRoute('/estoque/relatorios/valorizado', falso.fetch)

    // O valor vem do `summary`, que é do recorte INTEIRO — não da soma das
    // linhas visíveis.
    await screen.findByText('R$ 91.500,00')
    expect(screen.getByText('Valor do estoque')).toBeInTheDocument()
    const itens = await tabela()
    expect(within(itens).getByText(/PENDENTE VIDRO FUMÊ/)).toBeInTheDocument()
  })

  it('item SEM preço sai "sem preço", e o resumo diz quantos são', async () => {
    const falso = servidor('/api/reports/stock-valuation', comEco(VALORIZADO))
    renderRoute('/estoque/relatorios/valorizado', falso.fetch)

    const itens = await tabela()
    // Zero aqui somaria à conta de cabeça de quem lê a coluna: o item não vale
    // zero, vale desconhecido.
    expect(within(itens).getByText('sem preço')).toBeInTheDocument()
    expect(screen.getByText('Sem preço')).toBeInTheDocument()
  })

  it('carimba o instante da foto — o das 9h não é o das 18h', async () => {
    const falso = servidor('/api/reports/stock-valuation', comEco(VALORIZADO))
    renderRoute('/estoque/relatorios/valorizado', falso.fetch)

    await screen.findByText(/Foto de/)
    expect(screen.getByText(/a preço de venda/)).toBeInTheDocument()
  })

  it('sem depósito escolhido, `warehouseId` não viaja na query', async () => {
    const falso = servidor('/api/reports/stock-valuation', comEco(VALORIZADO))
    renderRoute('/estoque/relatorios/valorizado', falso.fetch)
    await screen.findByText('R$ 91.500,00')

    expect(ultimaQuery(falso, '/api/reports/stock-valuation').has('warehouseId')).toBe(false)
  })

  it('escolher o depósito manda o recorte e rotula a grade com o nome', async () => {
    const falso = servidor('/api/reports/stock-valuation', comEco(VALORIZADO))
    const { user } = renderRoute('/estoque/relatorios/valorizado', falso.fetch)
    await screen.findByText('R$ 91.500,00')

    await user.selectOptions(await screen.findByRole('combobox', { name: /depósito/i }), 'dep-2')

    expect(ultimaQuery(falso, '/api/reports/stock-valuation').get('warehouseId')).toBe('dep-2')
    // O eco confirmou: só aí a tela escreve o nome do depósito no cabeçalho da
    // grade.
    await screen.findByText('Itens — SHOWROOM CENTRO')
  })

  it('servidor que IGNORA o recorte levanta aviso, e a grade não leva o nome', async () => {
    // O modo de falhar da #352: o servidor soma `product_tenant.stock_qty`,
    // responde 200 com o total da empresa e não ecoa nada.
    const falso = servidor('/api/reports/stock-valuation', () => json(VALORIZADO))
    const { user } = renderRoute('/estoque/relatorios/valorizado', falso.fetch)
    await screen.findByText('R$ 91.500,00')

    await user.selectOptions(await screen.findByRole('combobox', { name: /depósito/i }), 'dep-2')

    await screen.findByText(/sem confirmar o recorte por depósito/i)
    expect(screen.queryByText('Itens — SHOWROOM CENTRO')).toBeNull()
  })

  it('ordenar pelo cabeçalho manda o campo da whitelist do contrato', async () => {
    const falso = servidor('/api/reports/stock-valuation', comEco(VALORIZADO))
    const { user } = renderRoute('/estoque/relatorios/valorizado', falso.fetch)
    await screen.findByText('R$ 91.500,00')

    await user.click(screen.getByRole('button', { name: 'Ordenar por Saldo' }))

    // `quantity`, e não "Saldo": o `sortBy` é o nome que a whitelist do servidor
    // aceita, e traduzir quebraria a ordenação com 400 só ao clicar.
    expect(ultimaQuery(falso, '/api/reports/stock-valuation').get('sortBy')).toBe('quantity')
  })

  it('coluna fora da whitelist não vira botão de ordenar', async () => {
    const falso = servidor('/api/reports/stock-valuation', comEco(VALORIZADO))
    renderRoute('/estoque/relatorios/valorizado', falso.fetch)
    await screen.findByText('R$ 91.500,00')

    // `productGroup` e `unitPriceCents` estão fora da whitelist do contrato:
    // cabeçalho clicável ali seria um botão que responde 400.
    expect(screen.queryByRole('button', { name: 'Ordenar por Tipo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ordenar por Preço' })).toBeNull()
  })
})

describe('estoque parado', () => {
  it('quem nunca vendeu aparece assim, e não com um número gigante', async () => {
    const falso = servidor('/api/reports/stock-aging', comEco(PARADO))
    renderRoute('/estoque/relatorios/parado', falso.fetch)

    const itens = await tabela()
    // "Nunca" e "há quatro anos" são perguntas diferentes: `daysWithoutSale`
    // nulo não vira zero nem 9999.
    expect(within(itens).getByText('nunca vendeu')).toBeInTheDocument()
    expect(screen.getByText('Nunca venderam')).toBeInTheDocument()
  })

  it('o corte de dias viaja na query', async () => {
    const falso = servidor('/api/reports/stock-aging', comEco(PARADO))
    const { user } = renderRoute('/estoque/relatorios/parado', falso.fetch)
    await screen.findByText('nunca vendeu')

    await user.clear(screen.getByLabelText('Dias sem venda, no mínimo'))
    await user.type(screen.getByLabelText('Dias sem venda, no mínimo'), '90')

    expect(ultimaQuery(falso, '/api/reports/stock-aging').get('minDaysWithoutSale')).toBe('90')
  })
})

describe('orçado × estoque', () => {
  it('nasce com o período preenchido — campo obrigatório em branco daria 400', async () => {
    const falso = servidor('/api/reports/quote-vs-stock', comEco(ORCADO))
    renderRoute('/estoque/relatorios/orcado-x-estoque', falso.fetch)
    await screen.findByText(/PENDENTE VIDRO FUMÊ/)

    const primeira = primeiraQuery(falso, '/api/reports/quote-vs-stock')
    expect(primeira.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(primeira.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('mostra a falta e diz de onde ela é', async () => {
    const falso = servidor('/api/reports/quote-vs-stock', comEco(ORCADO))
    renderRoute('/estoque/relatorios/orcado-x-estoque', falso.fetch)

    const itens = await tabela()
    await within(itens).findByText(/PENDENTE VIDRO FUMÊ/)
    expect(within(itens).getByText('8')).toBeInTheDocument()
    // Sem recorte, a falta é da empresa — e aí é compra, não transferência.
    expect(screen.getByText(/é a lista de compras/)).toBeInTheDocument()
  })

  it('com o recorte confirmado, a falta passa a ser LOCAL', async () => {
    const falso = servidor('/api/reports/quote-vs-stock', comEco(ORCADO))
    const { user } = renderRoute('/estoque/relatorios/orcado-x-estoque', falso.fetch)
    await screen.findByText(/PENDENTE VIDRO FUMÊ/)

    await user.selectOptions(await screen.findByRole('combobox', { name: /depósito/i }), 'dep-2')

    // A mesma coluna responde outra pergunta, e a tela diz qual: o orçamento
    // promete a peça, não o depósito de onde ela sai.
    await screen.findByText(/pode ser transferência, não compra/)
  })
})
