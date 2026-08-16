import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('listagem de Colaborador com filtro por módulo', () => {
  it('a faixa de chips por módulo aparece na tela', async () => {
    renderRoute('/cadastros/colaboradores')

    expect(await screen.findByText('Cadastro de Colaboradores')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Identificação/ })).toBeInTheDocument()
  })

  // Colaborador é MOCK: o id do filtro é a chave do registro, não o campo do
  // DTO. Se as duas pontas saíssem de lugares diferentes, o filtro montaria
  // bonito e a listagem não estreitaria — falha silenciosa, a pior de todas.
  it('filtrar por setor estreita a listagem de verdade', async () => {
    const { user } = renderRoute('/cadastros/colaboradores')

    await screen.findByText('Cadastro de Colaboradores')
    const linhasAntes = within(screen.getByRole('table')).getAllByRole('row').length

    await user.click(await screen.findByRole('button', { name: /Identificação/ }))
    await user.type(await screen.findByLabelText('Setor'), 'VENDAS')

    await waitFor(() => {
      const linhasDepois = within(screen.getByRole('table')).getAllByRole('row').length
      expect(linhasDepois).toBeLessThan(linhasAntes)
    })
  })
})
