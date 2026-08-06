import { Stipple } from '@/components/cabinet/stipple'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O Stipple é o único elemento puramente decorativo do sistema. Duas coisas
 * precisam continuar verdadeiras: ele não fala com leitor de tela (não há o
 * que dizer sobre uma textura), e ele mora numa caixa preta como qualquer
 * outra peça — textura solta no papel viraria mancha, não acento.
 */
describe('Stipple', () => {
  it('é decorativo: escondido da árvore de acessibilidade', () => {
    const { container } = render(<Stipple />)
    const stipple = container.querySelector('[data-slot="stipple"]')

    expect(stipple).toHaveAttribute('aria-hidden', 'true')
    expect(stipple?.textContent).toBe('')
  })

  it('usa a textura por utility e a caixa preta 2px, sem canto', () => {
    const { container } = render(<Stipple />)
    const stipple = container.querySelector('[data-slot="stipple"]')

    expect(stipple?.className).toContain('bg-stipple')
    expect(stipple?.className).toContain('border-2')
    expect(stipple?.className).not.toContain('rounded')
  })
})
