import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('AvisoDeCobertura', () => {
  it('mostra o texto da tela dentro da caixa de pendência', () => {
    render(<AvisoDeCobertura>Gravar envia só cinco campos.</AvisoDeCobertura>)

    const caixa = screen
      .getByText('Gravar envia só cinco campos.')
      .closest('[data-slot="aviso-de-cobertura"]')
    expect(caixa).not.toBeNull()
    // Zona de PENDÊNCIA, não de bloqueio: falta caminho no contrato, ninguém
    // errou e não há o que corrigir na tela.
    expect(caixa?.className).toContain('bg-zone-warn')
  })

  it('o erro da gravação entra na mesma caixa, e só quando existe', () => {
    const { rerender } = render(<AvisoDeCobertura>Texto.</AvisoDeCobertura>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(
      <AvisoDeCobertura erro={<p role="alert">Não foi possível gravar.</p>}>
        Texto.
      </AvisoDeCobertura>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível gravar.')
  })
})
