import { Providers } from '@/app/providers'
import { routeTree } from '@/routeTree.gen'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

function setup(initialUrl: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
  })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { router }
}

describe('tela Ordem de Compra', () => {
  it('listagem mostra as ordens com data em pt-BR', async () => {
    setup('/compras/ordens')

    expect(await screen.findByText('EVOLED (ATIVA COMERCIAL)')).toBeInTheDocument()
    expect(screen.getAllByText('05/08/2025').length).toBeGreaterThan(0)
  })

  it('abre a ordem e calcula subtotal, desconto e total', async () => {
    const user = userEvent.setup()
    setup('/compras/ordens/2')

    // Item mockado: 3 × R$ 103,27 = R$ 309,81.
    expect(await screen.findByLabelText('SubTotal')).toHaveTextContent('309,81')
    expect(screen.getByLabelText('Total')).toHaveTextContent('309,81')

    // "Desconto" existe duas vezes: o campo e o rótulo do total.
    await user.type(screen.getByLabelText('Desconto', { selector: 'input' }), '5000')
    await waitFor(() => {
      expect(screen.getByLabelText('Total')).toHaveTextContent('259,81')
    })
  })

  it('busca de transportadora preenche os rótulos do bloco', async () => {
    const user = userEvent.setup()
    setup('/compras/ordens/1')

    await screen.findByLabelText('Código')
    expect(screen.getByLabelText('Nome da transportadora')).toHaveTextContent('—')

    await user.click(screen.getByRole('button', { name: /Busca \(Alt\+T\)/ }))

    expect(screen.getByLabelText('Nome da transportadora')).toHaveTextContent(
      'TRANSPORTES CAMPINAS LTDA',
    )
    expect(screen.getByLabelText('UF da transportadora')).toHaveTextContent('SP')
  })

  it('navega para o pedido de compra relacionado', async () => {
    const user = userEvent.setup()
    const { router } = setup('/compras/ordens/1')

    await screen.findByLabelText('Código')
    await user.click(screen.getByRole('button', { name: 'Pedido de Compra' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/compras/pedidos')
    })
  })
})
