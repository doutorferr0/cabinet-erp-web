import { configurarApi } from '@/api/cliente'
import { ErroDaApi, PAGE_SIZE_MAX, createApiListProvider, queryDaTabela } from '@/data/api-provider'
import { tableState } from '@/test/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Trava a tradução entre o contrato da UI e a convenção do backend.
 *
 * O alvo do teste é `/api/catalog-lookups` porque é o único endpoint de lista
 * publicado — o adaptador não é exercitado contra endpoint imaginário.
 */
const URL_LOOKUPS = '/api/catalog-lookups'

interface Linha {
  id: string
  name: string
}

let chamadas: string[] = []

function respostaPaginada(rows: Linha[], total = rows.length) {
  return new Response(JSON.stringify({ rows, total }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function stubFetch(resposta: () => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: RequestInfo | URL) => {
      chamadas.push(String(entrada instanceof Request ? entrada.url : entrada))
      return Promise.resolve(resposta())
    }),
  )
}

const ultimaUrl = () => new URL(chamadas[chamadas.length - 1] as string)

beforeEach(() => {
  chamadas = []
  configurarApi('http://api.teste')
  stubFetch(() => respostaPaginada([{ id: 'a', name: 'EVOLED' }], 42))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('queryDaTabela', () => {
  it('traduz o sort da UI para sortBy + sortDesc', () => {
    expect(queryDaTabela(tableState({ sort: { id: 'nome', desc: true } }))).toMatchObject({
      sortBy: 'nome',
      sortDesc: true,
    })
  })

  it('omite q e sort quando não há filtro nem ordenação', () => {
    const query = queryDaTabela(tableState())
    expect(query).toEqual({ page: 1, pageSize: 10 })
  })

  it('mantém a paginação 1-based do contrato', () => {
    expect(queryDaTabela(tableState({ page: 3, pageSize: 25 }))).toMatchObject({
      page: 3,
      pageSize: 25,
    })
  })

  // As duas condições que o contrato manda o servidor rejeitar com 400. Barrar
  // aqui evita mandar requisição sabidamente inválida e receber de volta um erro
  // que pareceria do servidor quando o defeito é de quem chamou.
  it('barra página menor que 1 antes de chamar o servidor', () => {
    expect(() => queryDaTabela(tableState({ page: 0 }))).toThrow(/1-based/)
  })

  it('barra pageSize acima do teto de 100 do contrato', () => {
    expect(() => queryDaTabela(tableState({ pageSize: PAGE_SIZE_MAX + 1 }))).toThrow(/teto/)
    expect(() => queryDaTabela(tableState({ pageSize: PAGE_SIZE_MAX }))).not.toThrow()
  })
})

describe('createApiListProvider', () => {
  it('monta a consulta na URL do recurso', async () => {
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS })
    await provider.list(tableState({ q: 'evo', sort: { id: 'name', desc: false }, page: 2 }))

    const url = ultimaUrl()
    expect(url.pathname).toBe(URL_LOOKUPS)
    expect(url.searchParams.get('q')).toBe('evo')
    expect(url.searchParams.get('sortBy')).toBe('name')
    expect(url.searchParams.get('sortDesc')).toBe('false')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('pageSize')).toBe('10')
  })

  it('soma a query fixa do recurso discriminado', async () => {
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS, fixa: { kind: 'MARCA' } })
    await provider.list(tableState())

    expect(ultimaUrl().searchParams.get('kind')).toBe('MARCA')
  })

  it('devolve rows e o total PÓS-FILTRO, não o da página', async () => {
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS })
    const pagina = await provider.list(tableState())

    expect(pagina.rows).toHaveLength(1)
    expect(pagina.total).toBe(42)
  })

  it('falha do servidor REJEITA — nunca vira lista vazia', async () => {
    stubFetch(() => new Response('', { status: 500 }))
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS })

    await expect(provider.list(tableState())).rejects.toThrow(/falha ao consultar/i)
  })

  // O contrato manda `application/problem+json` (RFC 9457) em toda falha. O
  // `detail` é a frase que o backend escolheu para o caso — jogá-la fora deixaria
  // o operador com "algo deu errado" quando o servidor explicou o quê.
  it('preserva status e detail do problem+json', async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            type: 'about:blank',
            title: 'Bad Request',
            status: 400,
            detail: 'sortBy inválido para este recurso.',
          }),
          { status: 400, headers: { 'content-type': 'application/problem+json' } },
        ),
    )
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS })

    const erro = await provider.list(tableState()).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroDaApi)
    expect((erro as ErroDaApi).status).toBe(400)
    expect((erro as ErroDaApi).detail).toBe('sortBy inválido para este recurso.')
  })

  it('erro sem corpo problem+json não inventa detalhe', async () => {
    stubFetch(() => new Response('', { status: 500 }))
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS })

    const erro = (await provider.list(tableState()).catch((e: unknown) => e)) as ErroDaApi
    expect(erro.detail).toBeUndefined()
  })
})

describe('filtro estruturado × contrato v1', () => {
  it('recusa em voz alta em vez de mandar a consulta sem o filtro', async () => {
    stubFetch(() => respostaPaginada([{ id: '1', name: 'MARCA' }]))
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS })

    // Mandar a requisição sem os filtros devolveria a lista COMPLETA com a tela
    // mostrando filtro aplicado — dado certo respondendo a pergunta errada.
    await expect(
      provider.list(
        tableState({
          filtros: [
            {
              filtroId: 'f1',
              id: 'name',
              variante: 'text',
              operador: 'iLike',
              valor: 'marca',
            },
          ],
        }),
      ),
    ).rejects.toThrow(/não existe no contrato/i)

    expect(chamadas).toHaveLength(0)
  })

  it('filtro ainda sem valor não é filtro — a consulta segue normal', async () => {
    stubFetch(() => respostaPaginada([{ id: '1', name: 'MARCA' }]))
    const provider = createApiListProvider<Linha>({ url: URL_LOOKUPS })

    const r = await provider.list(
      tableState({
        filtros: [{ filtroId: 'f1', id: 'name', variante: 'text', operador: 'iLike', valor: '' }],
      }),
    )

    expect(r.rows).toHaveLength(1)
    expect(ultimaUrl().searchParams.has('filtros')).toBe(false)
  })
})
