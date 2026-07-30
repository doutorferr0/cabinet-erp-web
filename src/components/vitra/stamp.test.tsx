import { Stamp, type StampTom } from '@/components/vitra/stamp'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Carimbo de situação (DESIGN.md §Stamp): tinta sobre papel — borda e texto
 * no tom, fundo transparente, conteúdo em Meta. O mapeamento tom → situação
 * continua `[a resolver]`; o componente só recebe tom + rótulo.
 */
describe('Stamp', () => {
  it('renderiza os 4 tons semânticos com borda e texto na mesma cor', () => {
    const tons: StampTom[] = ['neutral', 'open', 'done', 'void']
    render(
      <div>
        {tons.map((tom) => (
          <Stamp key={tom} tom={tom} label={tom} />
        ))}
      </div>,
    )
    for (const tom of tons) {
      const el = screen.getByText(tom)
      expect(el.className).toContain(`border-stamp-${tom}`)
      expect(el.className).toContain(`text-stamp-${tom}`)
      expect(el.className).toContain('bg-transparent')
    }
  })

  it('usa Meta (mono, caixa alta, tracking) e altura de 20px', () => {
    render(<Stamp tom="open" label="EM ABERTO" />)
    const el = screen.getByText('EM ABERTO')
    expect(el.className).toContain('font-mono')
    expect(el.className).toContain('text-[0.75rem]')
    expect(el.className).toContain('uppercase')
    expect(el.className).toContain('tracking-[0.06em]')
    expect(el.className).toContain('h-5')
  })

  it('expõe o tom em data attribute para teste de tela', () => {
    render(<Stamp tom="void" label="ANULADO" />)
    expect(screen.getByText('ANULADO')).toHaveAttribute('data-tom', 'void')
  })
})
