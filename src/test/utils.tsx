import { configurarApi } from '@/api/cliente'
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
import { vi } from 'vitest'

/**
 * Utilidades de teste compartilhadas.
 *
 * Regra: teste de TELA monta o router de verdade (`renderRoute`) — assim ele
 * exercita rota + query + form juntos, como o usuário. Teste de COMPONENTE
 * isolado usa `renderWithQuery`, sem router.
 */

/**
 * Resposta de sessão válida, no shape exato do contrato (`SessaoAtual`).
 *
 * `mustChangePassword` é OBRIGATÓRIO no contrato — omiti-lo faria o teste
 * exercitar uma sessão que o servidor nunca devolve, e a guarda de senha
 * provisória passaria por sorte (campo ausente também é falso). Padrão `false`
 * (senha definitiva); quem testa a senha provisória passa `true`.
 */
export function respostaSessao({ mustChangePassword = false } = {}) {
  return new Response(
    JSON.stringify({
      organizationId: '00000000-0000-0000-0000-000000000001',
      employeeId: '00000000-0000-0000-0000-000000000002',
      activeTenantId: '00000000-0000-0000-0000-000000000003',
      expiresAt: '2099-01-01T00:00:00Z',
      mustChangePassword,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

/** Resposta de vínculos, no shape exato do contrato (`VinculoDeEmpresa[]`). */
export function respostaVinculos() {
  return new Response(
    JSON.stringify([
      {
        tenantId: '00000000-0000-0000-0000-000000000003',
        name: 'VERTZ ILUMINAÇÃO',
        role: 'owner',
      },
    ]),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

export type FetchStub = (input: RequestInfo | URL) => Promise<Response>

/**
 * Stub padrão do `renderRoute`: sessão VÁLIDA para a guarda (`/auth/me`) e
 * vínculos para o seletor de empresa (`/auth/tenants`); erro alto para
 * qualquer outra URL — uma tela que buscar dado real novo sem o teste saber
 * tem que quebrar aqui, não passar batido.
 */
const sessaoValida: FetchStub = (input) => {
  const url = String(input instanceof Request ? input.url : input)
  const caminho = new URL(url, 'http://localhost').pathname
  if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
  if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
  return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
}

export interface RenderRouteResult extends RenderResult {
  router: AnyRouter
  user: ReturnType<typeof userEvent.setup>
}

/**
 * Renderiza a aplicação inteira na URL pedida, com o routeTree real.
 * Devolve o `router` (para asserção de navegação) e um `user` já configurado.
 *
 * A guarda de sessão consulta `/auth/me` em TODA rota, então o `fetch` é
 * stubado aqui mesmo — o padrão é "sessão válida"; testes de login/guarda
 * passam o próprio stub no segundo argumento.
 */
export function renderRoute(
  initialUrl: string,
  fetchStub: FetchStub = sessaoValida,
): RenderRouteResult {
  const user = userEvent.setup()
  configurarApi('http://api.teste')
  vi.stubGlobal('fetch', vi.fn(fetchStub))
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
