import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('CelulaAtivo', () => {
  it('escreve a situação por extenso, não só em cor', () => {
    render(<CelulaAtivo ativo />)
    // Cor sozinha não diz estado (WCAG 1.4.1): a palavra é o que sobra para
    // quem não distingue os tons e para o leitor de tela.
    expect(screen.getByText('Ativo')).toBeInTheDocument()
  })

  it('inativo é o carimbo ANULADO, não o preenchido', () => {
    render(<CelulaAtivo ativo={false} />)
    const carimbo = screen.getByText('Inativo')
    // `void` é o tom vazado. Preencher o inativo faria a lista gritar
    // justamente a linha que saiu de circulação.
    expect(carimbo).toHaveAttribute('data-tom', 'void')
  })

  it('ativo usa o tom preenchido', () => {
    render(<CelulaAtivo ativo />)
    expect(screen.getByText('Ativo')).toHaveAttribute('data-tom', 'done')
  })
})
