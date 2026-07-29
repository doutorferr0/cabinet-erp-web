import { LookupCombo } from '@/components/vitra/lookup-combo'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

function Harness({ kind = 'marca' as const }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div>
      <LookupCombo kind={kind} value={value} onChange={setValue} />
      <output data-testid="valor">{value ?? ''}</output>
    </div>
  )
}

describe('LookupCombo', () => {
  it('seleciona uma opção da lista', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /STELLA/ }))

    expect(screen.getByTestId('valor')).toHaveTextContent('STELLA')
  })

  it('cadastra item novo sem sair da tela (botão "...")', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Cadastrar Marca' }))
    await user.type(screen.getByLabelText('Nome'), 'Marca Nova X')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    // item novo vira o valor selecionado, em maiúsculas
    expect(screen.getByTestId('valor')).toHaveTextContent('MARCA NOVA X')
  })

  it('busca filtra as opções', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText(/buscar marca/i), 'evo')

    expect(await screen.findByRole('option', { name: /EVOLED/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /STELLA/ })).not.toBeInTheDocument()
  })
})
