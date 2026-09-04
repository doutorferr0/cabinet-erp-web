import { instalarServidor, json } from '@/test/servidor'
import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A BUSCA DE REGISTRO vista da paleta — a tela, não a fronteira.
 *
 * O que a fronteira promete está em `src/data/busca-de-registro.test.ts`; aqui
 * se prova o que o OPERADOR faz: abre a caixa, digita o nome do cliente, vê o
 * cliente e chega na ficha dele. É o caminho que a #362 mediu como faltando —
 * a paleta achava tela e ação, e não achava registro.
 */

const CLIENTE = {
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
}

let fetchStub: (entrada: RequestInfo | URL, init?: RequestInit) => Promise<Response>

beforeEach(() => {
  const servidor = instalarServidor({
    '/auth/tenants': () => [
      {
        tenantId: 'aaaa-1111',
        name: 'VERTZ ILUMINAÇÃO',
        role: 'owner',
        features: ['suppliers', 'professionals', 'employees'],
      },
    ],
    '/auth/me': () => ({
      organizationId: 'org-1',
      employeeId: 'emp-1',
      activeTenantId: 'aaaa-1111',
      expiresAt: '2099-01-01T00:00:00Z',
      mustChangePassword: false,
    }),
    '/api/partners': ({ url }) =>
      new URL(url).searchParams.get('q') === 'batalha'
        ? json({ rows: [CLIENTE], total: 1 })
        : json({ rows: [], total: 0 }),
    '/api/products': () => json({ rows: [], total: 0 }),
    '/api/quotes': () => json({ rows: [], total: 0 }),
    '/api/orders': () => json({ rows: [], total: 0 }),
  })
  fetchStub = servidor.fetch
})

afterEach(() => vi.unstubAllGlobals())

async function abrirPaleta() {
  const user = userEvent.setup()
  const resultado = renderRoute('/', fetchStub)
  await user.click(await screen.findByRole('button', { name: 'Abrir a busca' }))
  await screen.findByPlaceholderText(/nome\/número de um registro/)
  return { ...resultado, user }
}

describe('paleta — achar registro', () => {
  it('digitar o nome do cliente traz o cliente, e escolher leva à ficha dele', async () => {
    const { user, router } = await abrirPaleta()

    await user.keyboard('batalha')

    const item = await screen.findByRole('menuitem', { name: /ANDRÉ BATALHA/ }, { timeout: 3000 })
    // O código e o papel ficam na segunda linha: dois clientes de nome parecido
    // só se distinguem por eles.
    expect(item).toHaveTextContent('1042')
    expect(item).toHaveTextContent('Cliente')

    await user.click(item)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/clientes/p-1')
    })
  })

  it('abaixo do mínimo não consulta, e a caixa diz por quê', async () => {
    const { user } = await abrirPaleta()

    await user.keyboard('ba')

    expect(await screen.findByText(/Digite 3 letras ou mais/)).toBeInTheDocument()
  })

  it('a ajuda de atalhos é alcançável pela própria paleta', async () => {
    // A tela do mapa não está na barra lateral (ajuda não é módulo do negócio):
    // se a paleta não a oferecesse, o operador não teria como chegar nela.
    const { user, router } = await abrirPaleta()

    await user.click(await screen.findByRole('menuitem', { name: /Atalhos do teclado/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/ajuda/atalhos')
    })
  })
})
