import { AvisoDadosDeExemplo } from '@/components/cabinet/aviso-dados-de-exemplo'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('AvisoDadosDeExemplo', () => {
  it('diz que o dado é de demonstração e que a tela não grava', () => {
    render(<AvisoDadosDeExemplo origem="exemplo" />)

    expect(screen.getByText(/Dados de exemplo/)).toBeInTheDocument()
    expect(screen.getByText(/não será salvo/)).toBeInTheDocument()
  })

  // As duas metades do silêncio: recurso HTTP (`servidor`) e provider que não
  // se declarou (`undefined`). A segunda é o default, e é ela que decide que
  // provider novo esquecido não enche a tela de aviso falso.
  it.each([['servidor' as const], [undefined]])('cala com origem %s', (origem) => {
    const { container } = render(<AvisoDadosDeExemplo origem={origem} />)

    expect(container).toBeEmptyDOMElement()
  })
})
