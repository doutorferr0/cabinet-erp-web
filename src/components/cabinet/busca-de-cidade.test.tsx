import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BuscaDeCidade } from '@/components/cabinet/busca-de-cidade'
import { renderWithQuery } from '@/test/utils'

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
    // Campinas está além da primeira página dos 5571 municípios: usa a busca.
    await user.type(within(dialog).getByLabelText('Busca'), 'campinas')
    await user.click(await within(dialog).findByText('Campinas'))
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))

    // O código é o do IBGE (7 dígitos), e a grafia é a oficial — não a caixa-alta do mock antigo.
    expect(onSelect).toHaveBeenCalledWith({ codigo: '3509502', nome: 'Campinas', uf: 'SP' })
  })
})
