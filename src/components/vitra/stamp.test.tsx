import { Stamp } from '@/components/vitra/stamp'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Carimbo de situação (DESIGN.md §Stamp): retângulo de 24px, borda 2px, Meta.
 *
 * Os tons NÃO se comportam igual, e essa é a informação: o que está resolvido
 * (`done`) e o que está aberto (`open`) são carimbos PREENCHIDOS — leem-se de
 * longe numa lista —, enquanto anulado e neutro ficam em tinta sobre papel.
 * Um carimbo é a marca que se procura correndo o olho; se os quatro tiverem o
 * mesmo peso, nenhum se destaca.
 *
 * O mapeamento tom → situação continua `[a resolver]`; o componente só recebe
 * tom + rótulo.
 */
describe('Stamp', () => {
  it('aberto e concluído são preenchidos; anulado e neutro, tinta sobre papel', () => {
    render(
      <div>
        <Stamp tom="open" label="aberto" />
        <Stamp tom="done" label="concluído" />
        <Stamp tom="void" label="anulado" />
        <Stamp tom="neutral" label="neutro" />
      </div>,
    )

    // Amarelo NUNCA é cor de texto (DESIGN.md §Don'ts): é fundo, com Tinta em
    // cima — e a BORDA continua Tinta, senão a caixa preta some no amarelo
    // (é o que o mockup mostra: caixa preta preenchida, não bloco amarelo).
    const aberto = screen.getByText('aberto')
    expect(aberto.className).toContain('bg-stamp-open')
    expect(aberto.className).toContain('text-foreground')
    expect(aberto.className).toContain('border-border')
    expect(aberto.className).not.toContain('text-stamp-open')
    expect(aberto.className).not.toContain('border-stamp-open')

    const concluido = screen.getByText('concluído')
    expect(concluido.className).toContain('bg-stamp-done')
    expect(concluido.className).toContain('text-primary-foreground')

    for (const [texto, tom] of [
      ['anulado', 'void'],
      ['neutro', 'neutral'],
    ] as const) {
      const el = screen.getByText(texto)
      expect(el.className).toContain(`border-stamp-${tom}`)
      expect(el.className).toContain(`text-stamp-${tom}`)
      expect(el.className).toContain('bg-transparent')
    }
  })

  it('é retângulo de 24px com borda 2px, sem canto', () => {
    render(<Stamp tom="open" label="EM ABERTO" />)
    const el = screen.getByText('EM ABERTO')
    expect(el.className).toContain('h-6')
    expect(el.className).toContain('border-2')
    expect(el.className).not.toContain('rounded')
  })

  it('usa Meta na rampa do DESIGN.md (mono 700, caixa alta, tracking 0.07em)', () => {
    render(<Stamp tom="open" label="EM ABERTO" />)
    const el = screen.getByText('EM ABERTO')
    expect(el.className).toContain('font-mono')
    expect(el.className).toContain('text-[0.75rem]')
    expect(el.className).toContain('uppercase')
    expect(el.className).toContain('tracking-[0.07em]')
    expect(el.className).toContain('font-bold')
  })

  it('expõe o tom em data attribute para teste de tela', () => {
    render(<Stamp tom="void" label="ANULADO" />)
    expect(screen.getByText('ANULADO')).toHaveAttribute('data-tom', 'void')
  })
})
