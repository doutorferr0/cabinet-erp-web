import { Stamp, type StampTom } from '@/components/cabinet/stamp'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * STAMP — o alias do `<Badge>` (#471, D3).
 *
 * A 1.x testava aqui a APARÊNCIA do carimbo: `bg-stamp-open`, `border-2`,
 * `h-6`, `uppercase`, `tracking-[0.07em]`. Nada disso sobrou — a 2.0 troca a
 * peça, e a meta da rodada é explícita ("nada cheio, nada com borda"). O que
 * este arquivo protege agora é o MAPEAMENTO e a compatibilidade do alias, que é
 * o contrato que as telas ainda dependem até D30.
 */
const MAPA: Array<[StampTom, string]> = [
  ['open', 'info'],
  ['done', 'ok'],
  ['void', 'bad'],
  ['neutral', 'mut'],
]

describe('Stamp', () => {
  it('mapeia os quatro tons legados na escala da 2.0', () => {
    for (const [legado, novo] of MAPA) {
      const { unmount } = render(<Stamp tom={legado} label={legado} />)
      expect(screen.getByText(legado), `${legado} → ${novo}`).toHaveAttribute(
        'data-badge-tom',
        novo,
      )
      unmount()
    }
  })

  it('mantém data-slot e data-tom legados — alias que muda atributo não é alias', () => {
    render(<Stamp tom="open" label="ABERTO" />)
    const el = screen.getByText('ABERTO')
    // `documento-visual.test.tsx` consulta `data-tom="open"`; telas podem
    // estilizar por `[data-slot=stamp]`. Os dois sobrevivem à troca de peça.
    expect(el).toHaveAttribute('data-slot', 'stamp')
    expect(el).toHaveAttribute('data-tom', 'open')
  })

  it('nenhum dos quatro é preenchido de cor cheia', () => {
    // O que mudou de verdade: `open` e `done` eram blocos saturados (amarelo
    // com tinta em cima, verde com branco em cima) e agora são pastel como os
    // outros dois. O destaque passou do bloco para o ponto.
    for (const [legado] of MAPA) {
      const { unmount } = render(<Stamp tom={legado} label={legado} />)
      const el = screen.getByText(legado)
      expect(el.className).not.toContain('text-primary-foreground')
      expect(el.className).not.toContain('text-white')
      expect(el.className).not.toMatch(/\bborder\b/)
      unmount()
    }
  })

  it('todo tom escreve o estado por extenso', () => {
    render(<Stamp tom="void" label="Cancelado" />)
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })
})
