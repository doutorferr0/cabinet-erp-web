import { configurarApi } from '@/api/cliente'
import { Providers } from '@/app/providers'
import { routeTree } from '@/routeTree.gen'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O cabeçalho da sidebar mostra a empresa ATIVA da sessão, que vem do backend.
 * Sem servidor falso, o shell abriria em "Empresas indisponíveis" e o teste do
 * seletor não diria nada sobre a troca. O contrato dessa fronteira é exercitado
 * em `company-switcher.test.tsx`; aqui ele só precisa responder.
 */
const EMPRESAS = [
  { tenantId: 'aaaa-1111', name: 'VERTZ ILUMINAÇÃO', role: 'owner' },
  { tenantId: 'bbbb-2222', name: 'VIA HF', role: 'operator-sales' },
]

let empresaAtiva = EMPRESAS[0]?.tenantId ?? null

async function servidorDeSessao(entrada: RequestInfo | URL) {
  const requisicao = entrada instanceof Request ? entrada : null
  const url = String(requisicao ? requisicao.url : entrada)
  const caminho = new URL(url).pathname
  const corpo = requisicao ? await requisicao.clone().text() : ''

  const json = (valor: unknown) =>
    new Response(JSON.stringify(valor), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

  if (caminho === '/auth/tenants') return json(EMPRESAS)
  if (caminho === '/auth/me') {
    return json({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: empresaAtiva,
      expiresAt: '2026-08-01T00:00:00Z',
    })
  }
  if (caminho === '/auth/active-tenant') {
    empresaAtiva = (JSON.parse(corpo) as { tenantId: string }).tenantId
    return new Response(null, { status: 204 })
  }
  return new Response('', { status: 404 })
}

beforeEach(() => {
  empresaAtiva = EMPRESAS[0]?.tenantId ?? null
  configurarApi('http://api.teste')
  vi.stubGlobal('fetch', vi.fn(servidorDeSessao))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setup(initialUrl = '/') {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
    defaultPreload: 'intent',
  })
  const view = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { router, ...view }
}

describe('AppShell', () => {
  it('renders sidebar modules and header controls', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /alternar tema/i })).toBeInTheDocument()
      expect(screen.getByText('Cadastros')).toBeInTheDocument()
    })
    for (const moduleName of ['Estoque', 'Vendas', 'Compras']) {
      expect(screen.getByText(moduleName)).toBeInTheDocument()
    }
  })

  it('switches active company via dropdown', async () => {
    setup()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vertz iluminação/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /vertz iluminação/i }))
    await user.click(screen.getByRole('menuitem', { name: /via hf/i }))
    expect(screen.getByText('VIA HF')).toBeInTheDocument()
  })

  it('toggles theme and updates document class', async () => {
    setup()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /alternar tema/i })).toBeInTheDocument()
    })
    const toggle = screen.getByRole('button', { name: /alternar tema/i })
    expect(document.documentElement.classList.contains('light')).toBe(true)
    await user.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await user.click(toggle)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  // A rota `/` deixou de ser o menu vazio e virou o Boletim (PRODUCT.md
  // nomeia a entrada atual como buraco: "no lugar do menu vazio atual").
  it('displays dashboard content on home route', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
    })
  })

  it('wraps route content in the page-frame folha (Regra da Folha)', async () => {
    setup()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Boletim' })).toBeInTheDocument()
    })
    const frame = document.querySelector('[data-slot="page-frame"]')
    expect(frame).toBeInTheDocument()
    expect(frame).toContainElement(screen.getByRole('heading', { name: 'Boletim' }))
  })
})
