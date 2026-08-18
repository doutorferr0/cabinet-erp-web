import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * ROUND-TRIP: abrir e gravar sem editar não pode mudar o registro.
 *
 * O `PUT` do contrato é INTEGRAL — substitui. Então todo campo que o formulário
 * não devolve exatamente como recebeu é campo alterado sem ninguém ter pedido, e
 * o operador que abriu a tela "só para conferir" leva a alteração junto.
 *
 * Com o dado do Postgres isto deixa de ser hipótese: o produto real vem com
 * quase tudo `null` (a organização acabou de cadastrá-lo), e é justamente o
 * `null` que se perde em conversão — string vazia, zero, objeto montado com
 * campos em branco.
 */

const ID = 'adea3b8d-30e6-4997-9775-dbe6e411ec5e'

/** Produto REAL do backend, com a variante NÃO precificada na empresa ativa. */
const DETALHE_REAL = {
  id: ID,
  code: 'LUM-SEM-PRECO',
  description: 'Plafon sem preço na empresa',
  active: true,
  variants: [
    {
      id: '1d583953-8400-4a46-8794-9ac38efcf1cf',
      finish: 'Branco',
      size: 'P',
      active: true,
      priceCents: null,
      stockQty: null,
      minStock: null,
    },
  ],
  specialCode: null,
  shortCode: null,
  unitIn: null,
  unitInQty: null,
  unitOut: null,
  unitOutQty: null,
  productTypeId: null,
  productTypeName: null,
  brandId: null,
  brandName: null,
  factoryId: null,
  factoryName: null,
  specs: null,
}

interface Escrita {
  url: string
  metodo: string
  corpo: Record<string, unknown>
}

function servidor(escritas: Escrita[]) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()

    if (url.includes('/api/products')) {
      if (metodo !== 'GET') {
        escritas.push({ url, metodo, corpo: (await req?.json()) as Record<string, unknown> })
        return new Response(JSON.stringify(DETALHE_REAL), {
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(DETALHE_REAL), {
        headers: { 'content-type': 'application/json' },
      })
    }
    return undefined
  }
}

describe('gravar sem editar', () => {
  it('devolve os campos vazios como NULOS, não como texto vazio', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute(`/cadastros/produtos/${ID}`, servidor(escritas) as never)

    // o formulário carregou com o produto
    await waitFor(() => expect(screen.getByLabelText(/Nosso Código/i)).toHaveValue('LUM-SEM-PRECO'))

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))

    await waitFor(() => expect(escritas.length).toBeGreaterThan(0))
    const produto = escritas.find((e) => !e.url.includes('/variants'))
    expect(produto?.metodo).toBe('PUT')

    const corpo = produto?.corpo as Record<string, unknown>
    // O servidor mandou `null`; devolver `''` grava texto vazio no lugar de
    // "não informado" — e no `PUT` integral isso É uma alteração do registro.
    expect(corpo.specialCode).toBeNull()
    expect(corpo.shortCode).toBeNull()
    expect(corpo.unitInQty).toBeNull()
    expect(corpo.unitOutQty).toBeNull()
  })

  it('não inventa ficha técnica para produto que não tem', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute(`/cadastros/produtos/${ID}`, servidor(escritas) as never)

    await waitFor(() => expect(screen.getByLabelText(/Nosso Código/i)).toHaveValue('LUM-SEM-PRECO'))
    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))

    await waitFor(() => expect(escritas.length).toBeGreaterThan(0))
    const corpo = escritas.find((e) => !e.url.includes('/variants'))?.corpo as {
      specs: unknown
    }

    // `specs: null` chegou; devolver um objeto com quinze campos em branco faz
    // o servidor guardar uma ficha técnica vazia onde não havia ficha nenhuma.
    expect(corpo.specs).toBeNull()
  })
})
