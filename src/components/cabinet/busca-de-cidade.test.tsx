import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { renderWithQuery } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('BuscaDeCidade', () => {
  it('mostra a busca configurada e devolve a cidade selecionada', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithQuery(
      <BuscaDeCidade
        open
        onOpenChange={vi.fn()}
        titulo="Busca de Naturalidade"
        onSelect={onSelect}
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Naturalidade')
    await user.click(await within(dialog).findByText('CAMPINAS'))
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))

    expect(onSelect).toHaveBeenCalledWith({ codigo: '354', nome: 'CAMPINAS', uf: 'SP' })
  })
})
