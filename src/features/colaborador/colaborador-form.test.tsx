import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Colaborador', () => {
  it('listagem mostra colaboradores mockados', async () => {
    renderRoute('/cadastros/colaboradores')
    expect(await screen.findByText('CARLA SOUZA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Colaboradores')).toBeInTheDocument()
  })

  it('formulário grava novo colaborador (volta para a listagem)', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores/novo')

    const nome = await screen.findByLabelText('Nome')
    await user.type(nome, 'COLABORADOR TESTE')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores')
    })
  })

  it('abrir registro existente carrega os dados', async () => {
    renderRoute('/cadastros/colaboradores/1')
    expect(await screen.findByDisplayValue('CARLA SOUZA')).toBeInTheDocument()
  })
})
