import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
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

  it('busca de naturalidade preserva título e preenche cidade, código e UF', async () => {
    const { user } = renderRoute('/cadastros/colaboradores/novo')

    await screen.findByLabelText('Nome')
    await user.click(screen.getByRole('button', { name: 'Buscar naturalidade' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Naturalidade')

    await user.click(await within(dialog).findByText('CAMPINAS'))
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => expect(screen.getByLabelText('Naturalidade')).toHaveValue('CAMPINAS'))
    expect(screen.getByText('354')).toBeInTheDocument()
    expect(screen.getByText('SP')).toBeInTheDocument()
  })
})
