import { Providers } from '@/app/providers'
import { routeTree } from '@/routeTree.gen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  type AnyRouter,
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { type RenderResult, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'

/**
 * Utilidades de teste compartilhadas.
 *
 * Regra: teste de TELA monta o router de verdade (`renderRoute`) — assim ele
 * exercita rota + query + form juntos, como o usuário. Teste de COMPONENTE
 * isolado usa `renderWithQuery`, sem router.
 */

export interface RenderRouteResult extends RenderResult {
  router: AnyRouter
  user: ReturnType<typeof userEvent.setup>
}

/**
 * Renderiza a aplicação inteira na URL pedida, com o routeTree real.
 * Devolve o `router` (para asserção de navegação) e um `user` já configurado.
 */
export function renderRoute(initialUrl: string): RenderRouteResult {
  const user = userEvent.setup()
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
  })
  const result = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...result, router, user }
}

export interface RenderWithQueryResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>
  queryClient: QueryClient
}

/** Componente isolado que depende de TanStack Query, sem router. */
export function renderWithQuery(ui: ReactElement): RenderWithQueryResult {
  const user = userEvent.setup()
  // `retry: false` para o teste falhar rápido em vez de repetir a query.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
  return { ...result, user, queryClient }
}

/**
 * Estado de consulta da listagem para testes de provider/fetcher.
 * `delayMs = 0` é responsabilidade de quem chama o provider.
 */
export function tableState(over: Partial<import('@/lib/table-query').TableQueryState> = {}) {
  return { q: '', sort: null, page: 1, pageSize: 10, ...over }
}
