import { DocumentoHeader, DocumentoTotais } from '@/components/cabinet/documento'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Anatomia do documento (DESIGN.md §DocumentoHeader / §DocumentoTotais):
 * número em mono 600 à direita com régua forte fechando o bloco; Total é o
 * único em Title e vem separado dos demais por régua forte.
 */
describe('DocumentoHeader', () => {
  it('título em Headline à esquerda e número em Número do Documento à direita', () => {
    render(<DocumentoHeader titulo="Orçamento" numero="ORÇ-2026-00184" />)
    // Headline da banda: 800, caixa alta (DESIGN.md §Typography).
    const titulo = screen.getByRole('heading', { name: 'Orçamento' })
    expect(titulo.className).toContain('font-extrabold')
    expect(titulo.className).toContain('uppercase')
    // Nº do Documento: mono 700, 1.5rem — a âncora do cabeçalho.
    const numero = screen.getByText('ORÇ-2026-00184')
    expect(numero.className).toContain('font-mono')
    expect(numero.className).toContain('font-bold')
    expect(numero.className).toContain('text-2xl')
    expect(numero.className).toContain('tabular-nums')
  })

  // O cabeçalho de documento é a MESMA banda de identidade do cadastro: quem
  // muda a faixa muda os dois. Antes era um `<header>` com régua de 1px que
  // repetia, com outros valores, o que a banda já dizia.
  it('é a banda de identidade, não um cabeçalho paralelo', () => {
    const { container } = render(<DocumentoHeader titulo="Pedido de Compra" numero="PC-001" />)
    const banda = screen.getByRole('heading', { level: 1 }).closest('div')
    expect(banda?.className).toContain('bg-zone-id')
    expect(banda?.className).toContain('border-2')
    expect(container.querySelector('header')).toBeNull()
  })

  it('modo é contexto ao lado do título, não sufixo dentro dele', () => {
    const { container } = render(<DocumentoHeader titulo="Orçamento" modo="Incluir" />)
    // O `<h1>` diz o documento; o Meta ao lado diz o modo. Colados, o leitor de
    // tela anunciava "Orçamento — Incluir" como se fosse o nome do documento.
    expect(screen.getByRole('heading', { name: 'Orçamento' })).toBeInTheDocument()
    expect(screen.getByText('Incluir')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="documento-numero"]')).toBeNull()
  })

  it('carimbo de situação aparece ao lado do número quando presente', () => {
    render(
      <DocumentoHeader titulo="Orçamento" numero="184" stamp={{ tom: 'open', label: 'ABERTO' }} />,
    )
    expect(screen.getByText('ABERTO')).toHaveAttribute('data-tom', 'open')
  })
})

describe('DocumentoTotais', () => {
  it('rótulos em Meta e Total separado por régua forte', () => {
    render(
      <DocumentoTotais
        subtotalCentavos={100_000}
        ajustes={[{ label: 'Desconto', valorCentavos: 10_000, sinal: -1 }]}
      />,
    )
    const total = screen.getByText('Total:')
    expect(total.className).toContain('font-mono')
    expect(total.className).toContain('uppercase')
    expect(total.parentElement?.className).toContain('border-rule-strong')
    // Total derivado: 1000,00 - 100,00 = 900,00
    expect(screen.getByLabelText('Total')).toHaveTextContent('900')
  })

  it('tira tem canto de 4px (rounded-lg) e borda em Régua', () => {
    const { container } = render(<DocumentoTotais subtotalCentavos={0} />)
    const tira = container.firstElementChild
    expect(tira?.className).toContain('rounded-lg')
    expect(tira?.className).toContain('border')
  })
})
