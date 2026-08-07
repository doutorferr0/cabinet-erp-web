import { Label } from '@/components/ui/label'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Rótulo de campo é ETIQUETA INVERTIDA (DESIGN.md §Overview, `.rot` da amostra
 * da fase 1.5): caixa clara de traço 2px com letra preta, mono 10px, caixa
 * alta, tracking 0.12em.
 *
 * **Por que isto está travado por teste:** a decisão foi contestada. A crítica
 * do impeccable marcou P1 na etiqueta como rótulo de CAMPO — mono + caixa alta
 * + 10px é a combinação mais lenta de ler, e é o elemento mais repetido do
 * sistema (20 telas × dezenas de campos). O user decidiu pela amostra, que usa
 * `.rot` em tudo. O teste guarda a decisão para que ela não se desfaça por
 * descuido numa refatoração — se mudar, muda por decisão nova.
 */
describe('Label — etiqueta invertida', () => {
  it('é caixa clara de traço 2px com letra preta, não faixa preenchida', () => {
    render(<Label htmlFor="x">Razão social</Label>)

    const etiqueta = screen.getByText('Razão social')
    expect(etiqueta.className).toContain('border-2')
    expect(etiqueta.className).toContain('bg-card')
    expect(etiqueta.className).toContain('text-foreground')
    // A barra preta sólida da fundação anterior é justamente o que sai (§Don'ts).
    expect(etiqueta.className).not.toContain('bg-foreground')
  })

  it('fala em mono 10px caixa alta com tracking largo', () => {
    render(<Label htmlFor="x">Razão social</Label>)

    const etiqueta = screen.getByText('Razão social')
    expect(etiqueta.className).toContain('font-mono')
    expect(etiqueta.className).toContain('text-[10px]')
    expect(etiqueta.className).toContain('uppercase')
    expect(etiqueta.className).toContain('tracking-[0.12em]')
  })

  it('embrulha o texto em vez de esticar na largura do campo', () => {
    render(<Label htmlFor="x">CEP</Label>)

    // Sem `w-fit`/`self-start` a etiqueta viraria faixa — que é outra peça.
    const etiqueta = screen.getByText('CEP')
    expect(etiqueta.className).toContain('w-fit')
    expect(etiqueta.className).toContain('self-start')
  })

  it('é ITEM: canto reto, porque encosta no campo que ela nomeia', () => {
    render(<Label htmlFor="x">NCM</Label>)

    expect(screen.getByText('NCM').className).toContain('rounded-item')
  })

  it('continua um <label> de verdade, associado ao controle', () => {
    render(
      <>
        <Label htmlFor="razao">Razão social</Label>
        <input id="razao" />
      </>,
    )

    // A amostra usa `<span class="rot">`, sem `for` — aqui não: a etiqueta é o
    // rótulo acessível do campo, e clicar nela foca o controle.
    expect(screen.getByLabelText('Razão social')).toBe(screen.getByRole('textbox'))
  })
})
