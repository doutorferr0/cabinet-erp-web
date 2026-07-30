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

describe('tela Profissional Externo', () => {
  it('listagem mostra profissionais mockados', async () => {
    setup('/cadastros/profissionais')
    expect(await screen.findByText('MARIANA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Profissional Externo')).toBeInTheDocument()
  })

  it('formulário grava novo profissional (volta para a listagem)', async () => {
    const user = userEvent.setup()
    const { router } = setup('/cadastros/profissionais/novo')

    const nome = await screen.findByLabelText('Nome de Apresentação')
    await user.type(nome, 'PROFISSIONAL TESTE')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/profissionais')
    })
  })

  it('abrir registro existente carrega os dados', async () => {
    setup('/cadastros/profissionais/6')
    expect(await screen.findByLabelText('Nome de Apresentação')).toHaveValue('FLAVIO COSSA')
  })
})
