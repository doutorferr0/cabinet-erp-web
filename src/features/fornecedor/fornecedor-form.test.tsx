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

describe('tela Fornecedor', () => {
  it('listagem mostra fornecedores mockados', async () => {
    setup('/cadastros/fornecedores')
    expect(await screen.findByText('STELLA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Fornecedores')).toBeInTheDocument()
  })

  it('formulário inclui contato na grade e grava (volta para a listagem)', async () => {
    const user = userEvent.setup()
    const { router } = setup('/cadastros/fornecedores/novo')

    const razao = await screen.findByLabelText('Razão Social')
    await user.type(razao, 'FORNECEDOR TESTE LTDA')

    // grade Contatos: Incluir linha e preencher
    await user.click(screen.getByRole('button', { name: /Incluir/ }))
    await user.type(screen.getByLabelText('Nome linha 1'), 'MARIA')
    await user.type(screen.getByLabelText('Vínculo linha 1'), 'COMPRAS')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/fornecedores')
    })
  })

  it('abrir registro existente carrega os dados', async () => {
    setup('/cadastros/fornecedores/5')
    expect(await screen.findByDisplayValue('STELLA LTDA')).toBeInTheDocument()
  })
})
