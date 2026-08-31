import {
  MINIMO_DE_LETRAS,
  POR_ALVO,
  useBuscaDeRegistro,
  useTermoAdiado,
} from '@/data/busca-de-registro'
import { instalarServidor, json, problema } from '@/test/servidor'
import { respostaSessao, respostaVinculos } from '@/test/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { type ReactNode, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A BUSCA DE REGISTRO contra servidor falso — a fronteira, não a paleta.
 *
 * O que se prova aqui é o que a #362 mediu como "trabalho só de front": o `q`
 * de cada listagem já casa nome, código, documento e número, e juntar as quatro
 * respostas numa lista não precisou de caminho novo no contrato. Por isso o
 * teste bate no `fetch` — se alguém trocar o parâmetro, a URL ou a forma da
 * resposta, é aqui que quebra.
 */

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  )

function parceiro(over: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    code: '1042',
    legalName: 'ANDRE BATALHA COMERCIO LTDA',
    tradeName: 'ANDRÉ BATALHA',
    document: '12345678000199',
    email: null,
    isCustomer: true,
    isSupplier: false,
    isProfessional: false,
    paymentTerms: null,
    active: true,
    registrationActive: true,
    ...over,
  }
}

function pagina(rows: unknown[], total = rows.length) {
  return json({ rows, total })
}

const VAZIA = () => pagina([])

/** As quatro listagens respondendo vazio — cada teste sobrescreve a sua. */
function rotasBase(over: Record<string, () => Response> = {}) {
  return {
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/partners': VAZIA,
    '/api/products': VAZIA,
    '/api/quotes': VAZIA,
    '/api/orders': VAZIA,
    ...over,
  }
}

describe('useBuscaDeRegistro', () => {
  let servidor: ReturnType<typeof instalarServidor>

  afterEach(() => vi.unstubAllGlobals())

  async function buscar(termo: string, rotas = rotasBase()) {
    servidor = instalarServidor(rotas)
    const { result } = renderHook(() => useBuscaDeRegistro(termo), { wrapper })
    await waitFor(() => expect(result.current.buscando).toBe(false))
    return result
  }

  it('pergunta o `q` às quatro listagens, e só uma vez a cada uma', async () => {
    await buscar('batalha')

    for (const caminho of ['/api/partners', '/api/products', '/api/quotes', '/api/orders']) {
      const chamadas = servidor.em(caminho)
      expect(chamadas, `nenhuma chamada em ${caminho}`).toHaveLength(1)
      const url = new URL(chamadas[0]?.url ?? '')
      expect(url.searchParams.get('q')).toBe('batalha')
      // A paleta mostra o começo, não a listagem: página cheia traria 50 linhas
      // para desenhar cinco.
      expect(url.searchParams.get('pageSize')).toBe(String(POR_ALVO))
    }
  })

  it('não consulta nada abaixo do mínimo de letras — e diz que o termo é curto', async () => {
    const result = await buscar('an')

    expect(result.current.curto).toBe(true)
    expect(servidor.em('/api/partners')).toHaveLength(0)
    expect(result.current.grupos).toEqual([])
    expect('an'.length).toBeLessThan(MINIMO_DE_LETRAS)
  })

  it('monta o resultado do parceiro com o caminho da ficha do papel', async () => {
    const result = await buscar(
      'batalha',
      rotasBase({ '/api/partners': () => pagina([parceiro()]) }),
    )

    const grupo = result.current.grupos.find((g) => g.chave === 'parceiros')
    expect(grupo?.itens).toHaveLength(1)
    expect(grupo?.itens[0]).toMatchObject({
      titulo: 'ANDRÉ BATALHA',
      url: '/cadastros/clientes/p-1',
    })
    // O documento entra no `textValue` porque foi por ele que o servidor pode
    // ter casado: sem isso o filtro local da paleta esconderia o resultado de
    // quem procurou pelo CNPJ.
    expect(grupo?.itens[0]?.textValue).toContain('12345678000199')
    expect(grupo?.itens[0]?.subtitulo).toContain('1042')
  })

  it('fornecedor vai para a ficha de fornecedor, e some quando a empresa não opera o recurso', async () => {
    const soFornecedor = parceiro({
      id: 'p-2',
      isCustomer: false,
      isSupplier: true,
      tradeName: 'METALÚRGICA SUL',
    })
    const rotas = rotasBase({ '/api/partners': () => pagina([soFornecedor]) })

    const comRecurso = await buscar('metal', rotas)
    expect(comRecurso.current.grupos[0]?.itens[0]?.url).toBe('/cadastros/fornecedores/p-2')

    vi.unstubAllGlobals()
    const semRecurso = await buscar(
      'metal',
      rotasBase({
        '/api/partners': () => pagina([soFornecedor]),
        // Empresa que não contratou `suppliers`: a ficha de fornecedor é uma
        // tela que a guarda recusa, e mandar para lá seria oferecer um beco.
        '/auth/tenants': () => respostaVinculos(['employees']),
      }),
    )
    expect(semRecurso.current.grupos).toEqual([])
  })

  it('acha documento pelo número, e agrupa orçamento e pedido separados', async () => {
    const result = await buscar(
      '11390',
      rotasBase({
        '/api/quotes': () =>
          pagina([
            {
              id: 'q-1',
              number: '11390',
              customerId: 'c-1',
              customerName: 'ANDRÉ BATALHA',
              projectName: 'COZINHA',
              status: 'draft',
              totalCents: 100,
            },
          ]),
        '/api/orders': () =>
          pagina([
            {
              id: 'o-1',
              number: '11390',
              customerId: 'c-1',
              customerName: 'ANDRÉ BATALHA',
              status: 'open',
              totalCents: 100,
            },
          ]),
      }),
    )

    expect(result.current.grupos.map((g) => g.chave)).toEqual(['orcamentos', 'pedidos'])
    expect(result.current.grupos[0]?.itens[0]).toMatchObject({
      titulo: 'Orçamento 11390',
      url: '/vendas/orcamentos/q-1',
    })
    expect(result.current.grupos[1]?.itens[0]).toMatchObject({
      titulo: 'Pedido 11390',
      url: '/vendas/pedidos/o-1',
    })
  })

  it('diz quando a página cortou — "3 de 47" não é a mesma frase que "3"', async () => {
    const result = await buscar(
      'pendente',
      rotasBase({
        '/api/products': () =>
          pagina([{ id: 'pr-1', code: '1201', description: 'PENDENTE REDONDO', active: true }], 47),
      }),
    )

    const grupo = result.current.grupos.find((g) => g.chave === 'produtos')
    expect(grupo?.cortado).toBe(true)
    expect(grupo?.total).toBe(47)
  })

  it('alvo que falha é DITO, e os outros continuam respondendo', async () => {
    // O defeito que isto impede: produto fora do ar virando "nenhum produto com
    // esse nome" — a mesma tela de uma busca bem-sucedida e vazia.
    const result = await buscar(
      'batalha',
      rotasBase({
        '/api/partners': () => pagina([parceiro()]),
        '/api/products': () => problema(500, 'o catálogo caiu'),
      }),
    )

    expect(result.current.falharam).toEqual(['Produtos'])
    expect(result.current.grupos.map((g) => g.chave)).toEqual(['parceiros'])
  })
})

describe('useTermoAdiado', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('só entrega o termo depois da pausa — digitar não é consultar', () => {
    const { result, rerender } = renderHook(({ termo }) => useTermoAdiado(termo, 250), {
      initialProps: { termo: '' },
    })

    rerender({ termo: 'bat' })
    expect(result.current).toBe('')

    act(() => vi.advanceTimersByTime(250))
    expect(result.current).toBe('bat')
  })

  it('apagar a caixa limpa na hora — resultado velho não fica na tela esperando o relógio', () => {
    const { result, rerender } = renderHook(({ termo }) => useTermoAdiado(termo, 250), {
      initialProps: { termo: 'batalha' },
    })
    act(() => vi.advanceTimersByTime(250))
    expect(result.current).toBe('batalha')

    rerender({ termo: '' })
    expect(result.current).toBe('')
  })
})
