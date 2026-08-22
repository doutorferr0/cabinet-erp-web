import {
  DocumentoBloco,
  DocumentoFrame,
  DocumentoHeader,
  DocumentoTotais,
} from '@/components/cabinet/documento'
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
    // FUSÃO v5 r3 (decisão do user, 2026-08-19): o título da banda fala em
    // display CONDENSADO (Bebas Neue) e CAIXA ALTA — a regra "serifada não
    // leva caixa alta" era da Newsreader e sai junto com ela AQUI; a serifa
    // continua sendo a voz de QUEM no <Nome> e nos H1 de cadastro.
    const titulo = screen.getByRole('heading', { name: 'Orçamento' })
    expect(titulo.className).toContain('font-[family-name:var(--font-display-condensada)]')
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
    // r5: zona de identidade em gradiente — ver banda-identidade.test.
    expect(banda?.className).toContain('hsl(var(--zone-id))')
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

/**
 * MOLDURA-MÃE e CARD AGRUPADOR (fusão v5 §3 "subdivisão explícita"): a moldura
 * envolve a entidade e carrega a etiqueta sobreposta na borda; o bloco é o pano
 * semi-transparente que faz as seções-filhas brancas saltarem.
 */
describe('DocumentoFrame', () => {
  it('renderiza a etiqueta com tipo e número do documento', () => {
    render(
      <DocumentoFrame tipo="Orçamento" numero="184">
        <span>conteúdo</span>
      </DocumentoFrame>,
    )
    const etiqueta = screen.getByText('DOCUMENTO · Orçamento Nº 184')
    expect(etiqueta).toHaveAttribute('data-slot', 'documento-etiqueta')
  })

  it('em inclusão a etiqueta omite o número', () => {
    render(
      <DocumentoFrame tipo="Orçamento">
        <span>conteúdo</span>
      </DocumentoFrame>,
    )
    expect(screen.getByText('DOCUMENTO · Orçamento')).toBeInTheDocument()
  })

  it('a etiqueta é o NOME acessível da moldura, não texto solto ao lado dela', () => {
    render(
      <DocumentoFrame tipo="Orçamento" numero="184">
        <span>conteúdo</span>
      </DocumentoFrame>,
    )
    // Sem o `aria-labelledby` a moldura seria uma região anônima e a etiqueta,
    // um fragmento de texto sem dono — a fronteira que ela desenha na tela
    // não existiria para quem navega por leitor.
    expect(screen.getByRole('region', { name: 'DOCUMENTO · Orçamento Nº 184' })).toBeInTheDocument()
  })

  it('moldura usa traço estrutural, raio de moldura, fundo translúcido e sombra macia', () => {
    const { container } = render(
      <DocumentoFrame tipo="Pedido de Compra" numero="PC-001">
        <span>conteúdo</span>
      </DocumentoFrame>,
    )
    const frame = container.querySelector('[data-slot="documento-frame"]')
    expect(frame?.className).toContain('border-2')
    expect(frame?.className).toContain('border-rule-strong')
    expect(frame?.className).toContain('bg-card/40')
    expect(frame?.className).toContain('shadow-macia')
    // Raio 20 contra os 12 da seção-filha: é o degrau que torna a contenção
    // legível. `rounded-card` aqui empataria mãe e filha.
    expect(frame?.className).toContain('rounded-frame')
  })

  it('a etiqueta é chip invertido — legível nos dois temas, não lima de tema único', () => {
    render(
      <DocumentoFrame tipo="Orçamento" numero="9">
        <span>conteúdo</span>
      </DocumentoFrame>,
    )
    const etiqueta = screen.getByText('DOCUMENTO · Orçamento Nº 9')
    expect(etiqueta.className).toContain('bg-foreground')
    expect(etiqueta.className).toContain('text-background')
    // `text-modulo` seria lilás claro sobre fundo claro no tema escuro.
    expect(etiqueta.className).not.toContain('text-modulo')
  })
})

describe('DocumentoBloco', () => {
  it('renderiza o card agrupador semi-transparente', () => {
    const { container } = render(
      <DocumentoBloco>
        <span>seções</span>
      </DocumentoBloco>,
    )
    const bloco = container.querySelector('[data-slot="documento-bloco"]')
    expect(bloco?.className).toContain('bg-card/55')
    expect(bloco?.className).toContain('rounded-card')
    expect(bloco?.className).toContain('border')
  })
})
