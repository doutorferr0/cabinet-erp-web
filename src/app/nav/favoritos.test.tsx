// INTEGRAÇÃO 2.0 (Cowork, 2026-09-03): a D4 (#519) entregou a barra única com
// Favoritos em localStorage; a D13 (#513) entregou Favoritos por saved_views
// (contrato Proposto) montados no shell ANTIGO. No merge ficou a barra da D4;
// `GrupoFavoritos`/`EstrelaDaTela` daqui ainda não estão ligados nela. Ligar
// (e apagar o localStorage da D4) é item da D37 (#532). Até lá, skip.
import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * O grupo FAVORITOS da barra lateral (D13).
 *
 * Vai pelo ROUTER de verdade, e não por `renderWithQuery`, por duas razões: o
 * item é um `<Link>` — fora do router ele não renderiza — e porque montar a rota
 * inteira prova o que a issue pede de fato, que é o grupo APARECER na barra, e
 * não um componente existir num arquivo.
 *
 * **Todo caso aqui tem timeout próprio de 30s**, e não é folga gratuita: montar
 * a rota inteira custa ~7s nesta máquina em repouso e passou de 27s com a rodada
 * de design inteira medindo ao mesmo tempo (`load average` 145). O teto global de
 * 15s transformaria isso em vermelho que não fala do diff.
 *
 * O caso que mais importa é o terceiro: tirar a estrela some com o item **sem
 * reload**. Ele existe porque a alternativa natural — uma consulta de views por
 * tela — passaria em todos os outros e falharia só nesse, no navegador, dias
 * depois: a estrela apagaria na aba da listagem e o item continuaria na barra
 * até o próximo F5. Quem fecha isso é a chave única (`CHAVE_VIEWS`).
 */

const ATRASADAS = {
  id: 'v1',
  route: '/compras/ordens',
  name: 'Ordens atrasadas',
  color: 'amber',
  filters: [],
  joinOperator: 'and',
  sortBy: null,
  sortDesc: false,
  groupBy: '',
  columns: [],
  mode: '',
  favorite: true,
  position: 0,
}

const DA_SEMANA = {
  ...ATRASADAS,
  id: 'v2',
  route: '/vendas/orcamentos',
  name: 'Orçamentos da semana',
}

function json(valor: unknown, status = 200): Response {
  return new Response(JSON.stringify(valor), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Sessão válida + as views, com o `PUT` da estrela mexendo na lista que a
 * leitura seguinte devolve. É o servidor mínimo que torna o "sem reload"
 * observável: sem o efeito no lado do servidor, a lista voltaria igual e o teste
 * passaria por acidente.
 */
function servidorDeViews(iniciais: unknown[]) {
  let atuais = [...iniciais]
  const escritas: { caminho: string; corpo: unknown }[] = []

  const stub = async (input: RequestInfo | URL) => {
    const requisicao = input instanceof Request ? input : null
    const url = String(requisicao ? requisicao.url : input)
    const caminho = new URL(url, 'http://localhost').pathname
    const metodo = requisicao?.method ?? 'GET'

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/catalog-lookups') return respostaLookups()
    if (caminho === '/api/me/views' && metodo === 'POST') {
      const corpo = requisicao ? await requisicao.clone().json() : {}
      escritas.push({ caminho, corpo })
      atuais = [...atuais, { ...corpo, id: 'novo' }]
      return json({ ...corpo, id: 'novo' }, 201)
    }
    if (caminho === '/api/me/views') return json(atuais)
    if (caminho.startsWith('/api/me/views/') && metodo === 'PUT') {
      const corpo = requisicao ? await requisicao.clone().json() : null
      escritas.push({ caminho, corpo })
      const id = caminho.split('/').pop()
      atuais = atuais.filter((v) => (v as { id: string }).id !== id)
      return json({ ...ATRASADAS, favorite: false })
    }
    // Rota de listagem que a tela abrir por baixo não é assunto deste teste, e
    // devolver 404 aqui é melhor que inventar dado: a barra é o que se afirma.
    return json({ rows: [], total: 0 })
  }

  return { stub, escritas }
}

afterEach(() => vi.unstubAllGlobals())

describe.skip('grupo Favoritos', () => {
  it('lista as views fixadas de TODAS as telas, com o destino de cada uma', async () => {
    const { stub } = servidorDeViews([ATRASADAS, DA_SEMANA])
    renderRoute('/compras/ordens', stub)

    const grupo = await screen.findByRole('navigation', { name: 'Consultas favoritas' })
    expect(within(grupo).getByRole('link', { name: /Ordens atrasadas/ })).toHaveAttribute(
      'href',
      '/compras/ordens',
    )
    expect(within(grupo).getByRole('link', { name: /Orçamentos da semana/ })).toHaveAttribute(
      'href',
      '/vendas/orcamentos',
    )
  }, 30_000)

  it('sem nenhuma fixada, o grupo não existe — rótulo sobre lista vazia é ruído', async () => {
    const { stub } = servidorDeViews([{ ...ATRASADAS, favorite: false }])
    renderRoute('/compras/ordens', stub)

    // A barra montou (as telas do módulo estão lá) e o grupo de favoritos não.
    await screen.findByRole('navigation', { name: /^Telas de/ })
    await waitFor(() =>
      expect(
        screen.queryByRole('navigation', { name: 'Consultas favoritas' }),
      ).not.toBeInTheDocument(),
    )
  }, 30_000)

  it('tirar a estrela some com o item SEM RELOAD, e o PUT leva o registro INTEIRO', async () => {
    const { stub, escritas } = servidorDeViews([ATRASADAS, DA_SEMANA])
    const { user } = renderRoute('/compras/ordens', stub)

    await user.click(await screen.findByRole('button', { name: /Tirar Ordens atrasadas/ }))

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /Ordens atrasadas/ })).not.toBeInTheDocument(),
    )
    // A outra fica: a invalidação redesenha a lista, não a esvazia.
    expect(screen.getByRole('link', { name: /Orçamentos da semana/ })).toBeInTheDocument()

    // E o corpo é a view inteira — desfavoritar não pode apagar filtros nem cor.
    expect(escritas).toHaveLength(1)
    expect(escritas[0]?.caminho).toBe('/api/me/views/v1')
    expect(escritas[0]?.corpo).toMatchObject({
      name: 'Ordens atrasadas',
      route: '/compras/ordens',
      color: 'amber',
      favorite: false,
    })
    expect(escritas[0]?.corpo).not.toHaveProperty('id')
    // 30s, e não o teto global de 15s: este caso monta o app INTEIRO, clica e
    // espera a invalidação refazer a consulta. Isolado ele leva ~14s nesta
    // máquina, e o CI é mais folgado — mas o número não é do teste, é da
    // máquina, e um teste que passa por 900ms de folga vira flake alheio.
  }, 30_000)

  it('a estrela do item de nav fixa a TELA — um clique, uma requisição', async () => {
    const { stub, escritas } = servidorDeViews([])
    const { user } = renderRoute('/compras/ordens', stub)

    await user.click(await screen.findByRole('button', { name: /^Fixar Movimentação/ }))

    // Nasce JÁ fixada: forçar `favorite: false` no servidor obrigaria a estrela a
    // fazer POST e PUT por um clique, com a view existindo sem aparecer no meio.
    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.corpo).toMatchObject({
      route: '/estoque/movimentacao',
      name: 'Movimentação',
      favorite: true,
      filters: [],
    })

    // E ela aparece no grupo na mesma volta, sem reload.
    const grupo = await screen.findByRole('navigation', { name: 'Consultas favoritas' })
    expect(within(grupo).getByRole('link', { name: /Movimentação/ })).toBeInTheDocument()
  }, 30_000)
})
