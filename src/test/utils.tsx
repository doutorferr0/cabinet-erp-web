import { configurarApi } from '@/api/cliente'
import { Providers } from '@/app/providers'
import { opcoesDoRouter } from '@/app/router'
import { VOCABULARIO_DE_APOIO } from '@/mocks/lookups'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  type AnyRouter,
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { type RenderResult, render, screen, within } from '@testing-library/react'
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

/**
 * Todos os recursos opcionais do contrato — o que uma empresa COMPLETA opera.
 *
 * É o padrão do `respostaVinculos` porque a maioria dos testes de tela não fala
 * de recurso nenhum: eles querem a tela no ar. Empresa sem o recurso é caso
 * ESPECÍFICO e quem o testa passa a própria lista (ver `shell.test.tsx`).
 */
export const RECURSOS_TODOS = ['suppliers', 'professionals', 'employees'] as const

/**
 * Resposta de vínculos, no shape exato do contrato (`VinculoDeEmpresa[]`).
 *
 * `features` é obrigatório no contrato: omiti-lo faria o teste exercitar um
 * vínculo que o servidor nunca devolve — e as telas dos três cadastros gated
 * cairiam no aviso de recurso indisponível por defeito do teste, não da tela.
 */
export function respostaVinculos(features: readonly string[] = RECURSOS_TODOS) {
  return new Response(
    JSON.stringify([
      {
        tenantId: '00000000-0000-0000-0000-000000000003',
        name: 'VERTZ ILUMINAÇÃO',
        role: 'owner',
        features,
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
  if (caminho === '/api/catalog-lookups') return Promise.resolve(respostaLookups())
  // As VIEWS SALVAS (D13) entram no stub padrão pela mesma razão das listas de
  // apoio: o grupo FAVORITOS mora na barra lateral e consulta em TODA rota
  // autenticada. Sem isto, cada teste de tela receberia "fetch sem stub" por uma
  // consulta que a tela dele nem conhece. Vazio é o padrão certo — usuário novo
  // não tem view salva; teste que queira favoritos passa o próprio stub.
  if (caminho === '/api/me/views') return Promise.resolve(respostaViews())
  return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
}

/**
 * As listas de apoio no shape do contrato (`PagedResultOfCatalogLookupDto`),
 * a partir do MESMO vocabulário que semeia o servidor mock. Toda tela de
 * detalhe consulta `/api/catalog-lookups` para traduzir id em nome na ficha
 * (`useRotulosDeApoio`), então a resposta mora no stub PADRÃO como a sessão —
 * teste que quiser exercitar a falha das listas passa o próprio stub.
 */
export function respostaLookups(): Response {
  const rows = Object.entries(VOCABULARIO_DE_APOIO).flatMap(([kind, nomes]) =>
    nomes.map((name, i) => ({ id: `lk-${kind}-${i + 1}`, kind, name, active: true })),
  )
  return new Response(JSON.stringify({ rows, total: rows.length }), {
    headers: { 'content-type': 'application/json' },
  })
}

/** Nenhuma view salva — o estado de quem nunca clicou em "Salvar consulta". */
export function respostaViews(views: readonly unknown[] = []): Response {
  return new Response(JSON.stringify(views), {
    headers: { 'content-type': 'application/json' },
  })
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
  // `opcoesDoRouter` é a MESMA config do app (`src/app/router.ts`): sem ela o
  // teste montaria um router diferente do que o operador usa, e passaria a
  // afirmar coisas sobre uma configuração que não existe em produção.
  const router = createRouter({
    ...opcoesDoRouter,
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
 * Marca a linha pelo CHECKBOX e aciona a ação na barra de seleção.
 *
 * É o gesto que a #198 instalou: clicar na linha ABRE o registro, então o teste
 * que quer `Alterar` ou `Excluir` precisa marcar primeiro — como o operador. O
 * caminho mora aqui porque já mudou duas vezes (barra fixa → `⋯` do cabeçalho →
 * barra de seleção) e cada mudança custava uma varredura por dez arquivos.
 */
export async function acaoNaLinha(
  user: ReturnType<typeof userEvent.setup>,
  textoDaLinha: string | RegExp,
  acao: string | RegExp,
) {
  const celula = await screen.findByText(textoDaLinha)
  const linha = celula.closest('tr')
  if (!linha) throw new Error('O texto informado não está numa linha de tabela.')
  await user.click(within(linha).getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: acao }))
}

/**
 * Estado de consulta da listagem para testes de provider/fetcher.
 * `delayMs = 0` é responsabilidade de quem chama o provider.
 */
export function tableState(over: Partial<import('@/lib/table-query').TableQueryState> = {}) {
  return { q: '', sort: null, page: 1, pageSize: 10, ...over }
}
