import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Profissional Externo', () => {
  it('listagem mostra profissionais mockados', async () => {
    renderRoute('/cadastros/profissionais')
    expect(await screen.findByText('MARIANA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Profissional Externo')).toBeInTheDocument()
  })

  it('formulário grava novo profissional (volta para a listagem)', async () => {
    const { router, user } = renderRoute('/cadastros/profissionais/novo')

    const nome = await screen.findByLabelText('Nome de Apresentação')
    await user.type(nome, 'PROFISSIONAL TESTE')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/profissionais')
    })
  })

  it('abrir registro existente carrega os dados', async () => {
    renderRoute('/cadastros/profissionais/6')
    expect(await screen.findByLabelText('Nome de Apresentação')).toHaveValue('FLAVIO COSSA')
  })
})
