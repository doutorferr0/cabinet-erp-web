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

describe('tela Colaborador', () => {
  it('listagem mostra colaboradores mockados', async () => {
    setup('/cadastros/colaboradores')
    expect(await screen.findByText('CARLA SOUZA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Colaboradores')).toBeInTheDocument()
  })

  it('formulário grava novo colaborador (volta para a listagem)', async () => {
    const user = userEvent.setup()
    const { router } = setup('/cadastros/colaboradores/novo')

    const nome = await screen.findByLabelText('Nome')
    await user.type(nome, 'COLABORADOR TESTE')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores')
    })
  })

  it('abrir registro existente carrega os dados', async () => {
    setup('/cadastros/colaboradores/1')
    expect(await screen.findByDisplayValue('CARLA SOUZA')).toBeInTheDocument()
  })
})
