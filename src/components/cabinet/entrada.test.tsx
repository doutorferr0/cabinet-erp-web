import { Entrada, ORDEM_MAXIMA, atrasoDaOrdem } from '@/components/cabinet/entrada'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Entrada', () => {
  it('termina VISÍVEL — a tela não pode ficar presa no primeiro quadro', async () => {
    render(
      <Entrada>
        <p>Cadastro de fornecedores</p>
      </Entrada>,
    )
    // A ESPERA é da VISIBILIDADE, não da existência — e a diferença é o teste
    // inteiro. A peça parte de `opacity: 0` e o estado final chega alguns quadros
    // depois; `findByText` resolve assim que o elemento EXISTE, que é já no
    // primeiro quadro, e uma asserção síncrona em cima disso afirma o começo da
    // animação — justamente o estado em que ela não pode ficar. Passava por
    // sorte, quando a mola avançava dentro do primeiro intervalo de sondagem.
    const peca = screen.getByText('Cadastro de fornecedores')
    await waitFor(() => {
      expect(peca).toBeVisible()
    })
  })

  it('escalona de 80ms em 80ms', () => {
    expect(atrasoDaOrdem(0)).toBe(0)
    expect(atrasoDaOrdem(1)).toBeCloseTo(0.08)
    expect(atrasoDaOrdem(3)).toBeCloseTo(0.24)
  })

  it('trava o atraso no teto — tela não monta em partes', () => {
    expect(atrasoDaOrdem(ORDEM_MAXIMA)).toBeCloseTo(atrasoDaOrdem(40))
    expect(atrasoDaOrdem(40)).toBeLessThanOrEqual(0.4)
  })

  it('não aceita atraso negativo', () => {
    expect(atrasoDaOrdem(-3)).toBe(0)
  })
})
