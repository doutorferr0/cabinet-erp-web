import { Providers } from '@/app/providers'
import { routeTree } from '@/routeTree.gen'
import { instalarServidor } from '@/test/servidor'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O cabeçalho da sidebar mostra a empresa ATIVA da sessão, que vem do backend.
 * Sem servidor falso, o shell abriria em "Empresas indisponíveis". O contrato
 * dessa fronteira é exercitado em `company-switcher.test.tsx`; aqui ele só
 * precisa responder.
 */
const EMPRESAS = [
  { tenantId: 'aaaa-1111', name: 'VERTZ ILUMINAÇÃO', role: 'owner' },
  { tenantId: 'bbbb-2222', name: 'VIA HF', role: 'operator-sales' },
]

let empresaAtiva: string | null = EMPRESAS[0]?.tenantId ?? null

beforeEach(() => {
  empresaAtiva = EMPRESAS[0]?.tenantId ?? null
  instalarServidor({
    '/auth/tenants': () => EMPRESAS,
    '/auth/me': () => ({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: empresaAtiva,
      expiresAt: '2026-08-01T00:00:00Z',
    }),
    '/auth/active-tenant': ({ corpo }) => {
      empresaAtiva = (corpo as { tenantId: string }).tenantId
      return new Response(null, { status: 204 })
    },
  })
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
