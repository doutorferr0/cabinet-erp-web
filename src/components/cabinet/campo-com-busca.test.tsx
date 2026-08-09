import { CampoComBusca } from '@/components/cabinet/campo-com-busca'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

describe('CampoComBusca', () => {
  it('associa o rótulo ao campo e dispara a busca pelo botão', async () => {
    const onBuscar = vi.fn()
    renderWithQuery(
      <CampoComBusca label="Cidade" inputId="cidade" ariaLabel="Buscar cidade" onBuscar={onBuscar}>
        <input id="cidade" />
      </CampoComBusca>,
    )

    expect(screen.getByLabelText('Cidade')).toHaveAttribute('id', 'cidade')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Buscar cidade' }))
    expect(onBuscar).toHaveBeenCalledOnce()
  })
})
