import type { StockValuationReportDto } from '@/api/gerado'
import {
  type ConsultaDeEstoqueValorizado,
  recorteDoEnvelope,
  useEstoqueValorizado,
} from '@/data/relatorios-api'
import { instalarServidor, json } from '@/test/servidor'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A FRONTEIRA dos relatórios de estoque, contra servidor falso.
 *
 * Duas coisas se provam aqui, e nenhuma delas é aritmética (essa é do servidor):
 *
 * 1. **O que sai na query** — `warehouseId` vazio não viaja, e `sortBy` ausente
 *    é a ordem padrão do relatório. Parâmetro vazio faria o servidor separar
 *    "sem recorte" de "recorte vazio", e o primeiro é o comportamento padrão.
 * 2. **O que o eco significa** — `recorteDoEnvelope` é a regra que impede a tela
 *    de rotular o total da empresa com o nome de um depósito.
 */

const ENVELOPE: StockValuationReportDto = {
  asOf: '2026-08-25T12:00:00.000Z',
  valuationBasis: 'sale_price',
  page: 1,
  pageSize: 50,
  total: 2,
  summary: { valueCents: 100_000, itemCount: 2, belowMinimumCount: 1, withoutPriceCount: 0 },
  rows: [],
}

describe('recorteDoEnvelope — o que o servidor fez com o pedido', () => {
  it('sem pedido é a empresa inteira, e não há o que confirmar', () => {
    expect(recorteDoEnvelope(null, undefined)).toEqual({ estado: 'empresa' })
    // Eco de um depósito que ninguém pediu não muda a leitura: quem não pediu
    // recorte não tem como estar lendo número de depósito.
    expect(recorteDoEnvelope(null, 'dep-0001')).toEqual({ estado: 'empresa' })
  })

  it('eco igual ao pedido é recorte CONFIRMADO', () => {
    expect(recorteDoEnvelope('dep-0001', 'dep-0001')).toEqual({
      estado: 'confirmado',
      warehouseId: 'dep-0001',
    })
  })

  it('pedido sem eco é recorte IGNORADO — o caso que a #352 existe para pegar', () => {
    // O servidor que soma `product_tenant.stock_qty` responde 200 com o total da
    // empresa. Sem esta distinção, a tela escreveria o nome do depósito em cima
    // do número de todos eles.
    expect(recorteDoEnvelope('dep-0003', undefined)).toEqual({
      estado: 'ignorado',
      warehouseId: 'dep-0003',
    })
    expect(recorteDoEnvelope('dep-0003', null)).toEqual({
      estado: 'ignorado',
      warehouseId: 'dep-0003',
    })
  })

  it('eco de OUTRO depósito também é ignorado', () => {
    // Não é o recorte que se pediu, e a tela não tem como saber qual dos dois o
    // número representa. Tratar como confirmado seria acreditar no rótulo.
    expect(recorteDoEnvelope('dep-0003', 'dep-0001')).toEqual({
      estado: 'ignorado',
      warehouseId: 'dep-0003',
    })
  })
})

describe('a query que o hook manda para o servidor', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      '/api/reports/stock-valuation': () => json(ENVELOPE),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  function wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }

  const BASE: ConsultaDeEstoqueValorizado = {
    productGroup: null,
    includeZero: false,
    belowMinimumOnly: false,
    warehouseId: null,
    sortBy: null,
    sortDesc: false,
    page: 1,
    pageSize: 50,
  }

  async function query(consulta: ConsultaDeEstoqueValorizado) {
    const { result } = renderHook(() => useEstoqueValorizado(consulta), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const chamada = servidor.em('/api/reports/stock-valuation').at(-1)
    // Explodir aqui em vez de asserir sobre `undefined`: hook que não chamou o
    // servidor faria toda asserção de query passar por vacuidade.
    if (!chamada) throw new Error('o hook não chamou o relatório')
    return new URL(chamada.url).searchParams
  }

  it('leva `warehouseId` quando há recorte', async () => {
    const parametros = await query({ ...BASE, warehouseId: 'dep-0003' })

    expect(parametros.get('warehouseId')).toBe('dep-0003')
  })

  it('NÃO leva `warehouseId` vazio — ausência é o padrão do contrato', async () => {
    const parametros = await query(BASE)

    expect(parametros.has('warehouseId')).toBe(false)
  })

  it('sem `sortBy` não manda ordem nenhuma — a padrão é do relatório', async () => {
    const parametros = await query(BASE)

    expect(parametros.has('sortBy')).toBe(false)
    expect(parametros.has('sortDesc')).toBe(false)
  })

  it('com `sortBy` os dois viajam juntos', async () => {
    const parametros = await query({ ...BASE, sortBy: 'quantity', sortDesc: true })

    expect(parametros.get('sortBy')).toBe('quantity')
    expect(parametros.get('sortDesc')).toBe('true')
  })
})
