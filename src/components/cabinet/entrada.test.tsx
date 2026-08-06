import { Entrada, ORDEM_MAXIMA, atrasoDaOrdem } from '@/components/cabinet/entrada'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Entrada', () => {
  it('termina VISÍVEL — a tela não pode ficar presa no primeiro quadro', async () => {
    render(
      <Entrada>
        <p>Cadastro de fornecedores</p>
      </Entrada>,
    )
    // `findBy`, não `getBy`: a peça parte de `opacity: 0` e o estado final chega
    // no quadro seguinte. Uma asserção síncrona aqui afirmaria o começo da
    // animação, que é justamente o estado em que ela NÃO pode ficar.
    expect(await screen.findByText('Cadastro de fornecedores')).toBeVisible()
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
