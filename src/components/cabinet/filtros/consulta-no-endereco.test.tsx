import { VitraDataTable } from '@/components/cabinet/data-table'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import type { TableQueryState } from '@/lib/table-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

/**
 * A CONSULTA NO ENDEREÇO, contra um router de VERDADE (#199).
 *
 * O codec se testa sozinho em `filtro-na-url.test.ts`; o que só aparece aqui é
 * o acordo com o TanStack Router, que serializa o search com `JSON.stringify` e
 * o relê com `JSON.parse`. Um teste de unidade sobre o codec passa verde com a
 * serialização errada — o endereço sai aspado e escapado, e a tela recarregada
 * abre sem filtro nenhum. Por isso este monta rota, história e tudo.
 *
 * Router MÍNIMO montado aqui, e não `renderRoute`: o que se exercita é a
 * `VitraDataTable` sobre um endereço, sem sessão, guarda nem tela real no meio.
 */

const CAMPOS: readonly CampoFiltravel[] = [{ id: 'name', rotulo: 'Nome', variante: 'text' }]

interface Linha {
  id: string
  name: string
}

function montarEm(url: string) {
  const consultas: TableQueryState[] = []
  const fetcher = vi.fn(async (state: TableQueryState) => {
    consultas.push(state)
    return { rows: [{ id: '1', name: 'STELLA' }] as Linha[], total: 1 }
  })

  const raiz = createRootRoute()
  const lista = createRoute({
    getParentRoute: () => raiz,
    path: '/lista',
    component: () => (
      <VitraDataTable<Linha>
        columns={[{ accessorKey: 'name', header: 'Nome' }]}
        queryKey={['consulta-no-endereco']}
        fetcher={fetcher}
        actions={[{ id: 'filtro', label: 'Filtro' }]}
        filtros={CAMPOS}
        consultaNoEndereco
      />
    ),
  })
  const router = createRouter({
    routeTree: raiz.addChildren([lista]),
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      {/* biome-ignore lint/suspicious/noExplicitAny: router de teste, sem o routeTree registrado do app. */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), router, consultas }
}

const FILTRO_STELLA = '[{"field":"name","operator":"iLike","value":"STELLA"}]'

describe('a consulta vive no endereço', () => {
  it('o endereço com filtro abre a tela JÁ filtrada, na primeira consulta', async () => {
    const { consultas } = montarEm(`/lista?filters=${encodeURIComponent(FILTRO_STELLA)}`)
    await screen.findByText('STELLA')

    // Na PRIMEIRA ida ao provider, não na segunda: semear por efeito faria a
    // tela buscar a lista inteira, mostrá-la e só então refazer a consulta.
    expect(consultas[0]?.filtros).toEqual([
      expect.objectContaining({ id: 'name', operador: 'iLike', valor: 'STELLA' }),
    ])
  })

  it('a busca do endereço chega à barra e ao provider', async () => {
    const { consultas } = montarEm('/lista?q=stella')
    await screen.findByText('STELLA')

    expect(screen.getByLabelText('Busca')).toHaveValue('stella')
    expect(consultas[0]?.q).toBe('stella')
  })

  it('busca por CÓDIGO não volta aspada do endereço', async () => {
    // O router grava string parseável como JSON (`"123"`) para poder relê-la
    // como string. Lida como texto cru, a busca do operador viraria `"123"` —
    // com as aspas dentro do campo, e a listagem não acharia nada.
    const { consultas } = montarEm('/lista?q=%22123%22')
    await screen.findByText('STELLA')

    expect(screen.getByLabelText('Busca')).toHaveValue('123')
    expect(consultas[0]?.q).toBe('123')
  })

  it('a pílula montada na tela é escrita no endereço', async () => {
    const { user, router } = montarEm('/lista')
    await screen.findByText('STELLA')

    await user.click(screen.getByRole('button', { name: /^Adicionar filtro/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Nome' }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'STELLA')

    await waitFor(() => {
      const busca = router.state.location.search as { filters?: unknown }
      expect(busca.filters).toEqual([{ field: 'name', operator: 'iLike', value: 'STELLA' }])
    })
  })

  it('limpar o filtro APAGA o parâmetro em vez de deixá-lo de pé', async () => {
    const { user, router } = montarEm(`/lista?filters=${encodeURIComponent(FILTRO_STELLA)}`)
    await screen.findByText('STELLA')

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => {
      expect(router.state.location.search).not.toHaveProperty('filters')
    })
  })

  it('filtro NÃO empilha histórico — `Voltar` sai da tela, não desfaz condição', async () => {
    const { user, router } = montarEm('/lista')
    await screen.findByText('STELLA')
    const antes = router.history.length

    await user.click(screen.getByRole('button', { name: /^Adicionar filtro/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Nome' }))
    await user.type(await screen.findByLabelText('Valor do filtro 1'), 'STELLA')

    await waitFor(() => {
      expect(router.state.location.search).toHaveProperty('filters')
    })
    // Desfazer filtro por filtro até escapar de uma listagem é o oposto do que
    // o botão `Voltar` promete.
    expect(router.history.length).toBe(antes)
  })
})
