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

  it('ativo é o tom bom', () => {
    render(<CelulaAtivo ativo />)
    expect(screen.getByText('Ativo')).toHaveAttribute('data-badge-tom', 'ok')
  })

  it('inativo é MUDO, não vermelho', () => {
    render(<CelulaAtivo ativo={false} />)
    const badge = screen.getByText('Inativo')
    // A 1.x mandava inativo → `void`, o tom do anulado. Numa listagem de
    // cadastros vermelho é a cor do que exige AÇÃO, e um fornecedor que a
    // empresa parou de usar não exige nenhuma: a coluna pintava de alarme uma
    // condição administrativa banal. `mut` é sair de circulação — silêncio.
    expect(badge).toHaveAttribute('data-badge-tom', 'mut')
    expect(badge).not.toHaveAttribute('data-badge-tom', 'bad')
  })
})
