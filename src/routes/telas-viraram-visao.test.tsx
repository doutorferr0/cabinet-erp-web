import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

/**
 * TRÊS TELAS VIRARAM VISÃO (issue D12, Reface 2.0).
 *
 * `Previsão de chegada` e `Quadro de cargas` deixaram de ser rotas com consulta
 * própria e passaram a ser um MODO da listagem de origem. As rotas ficam como
 * redirecionamento porque elas estão no menu e em links antigos — removê-las
 * devolveria 404 a quem já sabia o caminho.
 *
 * O teste é sobre o ENDEREÇO de destino, e não sobre o que a listagem desenha:
 * quem consome `modo`/`campo` nas duas listagens é a issue D14, que é dona
 * daqueles arquivos.
 */
function stubPadrao() {
  return (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    const caminho = new URL(url, 'http://api.teste').pathname
    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (caminho === '/api/catalog-lookups') return Promise.resolve(respostaLookups())
    return Promise.resolve(HttpResponse.json({ rows: [], total: 0 }))
  }
}

describe('telas que viraram visão da listagem', () => {
  it('/compras/previsao vira o calendário da listagem de ordens', async () => {
    const { router } = renderRoute('/compras/previsao', stubPadrao())

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/compras/ordens')
    })
    expect(router.state.location.searchStr).toContain('modo=calendario')
    expect(router.state.location.searchStr).toContain('campo=expectedAt')
  })

  it('/vendas/cargas vira o kanban da listagem de pedidos', async () => {
    const { router } = renderRoute('/vendas/cargas', stubPadrao())

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/vendas/pedidos')
    })
    expect(router.state.location.searchStr).toContain('modo=kanban')
    expect(router.state.location.searchStr).toContain('campo=status')
  })

  /**
   * Quem chega do documento de venda JÁ escolheu o pedido. Mandá-lo procurar o
   * mesmo cartão numa coluna perderia a escolha no caminho — com o id na mão, o
   * destino é a ficha.
   */
  it('/vendas/cargas?pedido=<id> leva à ficha daquele pedido', async () => {
    const { router } = renderRoute('/vendas/cargas?pedido=ped-1', stubPadrao())

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/vendas/pedidos/ped-1')
    })
  })
})
