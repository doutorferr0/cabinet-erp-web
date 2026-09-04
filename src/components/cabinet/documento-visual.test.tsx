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
 * número-herói em display condensado à direita; o Total é o FECHO — bloco
 * próprio, fora da tira, em 48px (#236).
 */
describe('DocumentoHeader', () => {
  it('título no degrau de REGISTRO e número em Número do Documento à direita', () => {
    render(<DocumentoHeader titulo="Orçamento" numero="ORÇ-2026-00184" />)
    // Reface 2.0 (D5): documento é REGISTRO, não página — `--t-registro`
    // (Gambarino 24) com o id em mono ao lado. O `escalaTitulo="documento"`
    // subia o título a 36px, uma 12ª medida num sistema de 11 degraus; e o
    // display CONDENSADO em caixa alta saiu junto com o Bebas Neue.
    const titulo = screen.getByRole('heading', { name: 'Orçamento' })
    expect(titulo).toHaveClass('t-registro')
    expect(titulo.className).not.toContain('uppercase')
    expect(titulo.className).not.toContain('text-[2.25rem]')
    // O número-herói é a peça de D15 e não mudou aqui: mono tabular na caixa.
    const numero = screen.getByText('ORÇ-2026-00184')
    expect(numero.className).toContain('tabular-nums')
    // A caixa continua sendo dele: é a única peça escura do cabeçalho.
    expect(numero.className).toContain('bg-primary')
  })

  /**
   * O cabeçalho de documento é o MESMO `PageHeader` de toda tela — só a
   * variante muda. Antes era a `BandaDeIdentidade`, uma caixa lilás com borda
   * de 2px que gastava borda + fundo + gradiente numa fronteira que espaço
   * resolve (§Hierarquia: uma ferramenta por fronteira).
   */
  it('é o cabeçalho de página, sem caixa em volta do título', () => {
    render(<DocumentoHeader titulo="Pedido de Compra" numero="PC-001" />)
    const cabecalho = screen.getByRole('heading', { level: 1 }).closest('header')

    expect(cabecalho).toHaveAttribute('data-slot', 'page-header')
    expect(cabecalho).toHaveAttribute('data-variante', 'registro')
    // Nem a zona lilás, nem o traço de 2px: a fronteira com o que vem abaixo
    // é espaço.
    expect(cabecalho?.className).not.toContain('zone-id')
    expect(cabecalho?.className).not.toContain('border-2')
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
    // O fecho é o `TotalBox`, e não mais um item da tira separado por régua.
    expect(total.closest('[data-slot="total-box"]')).not.toBeNull()
    // Total derivado: 1000,00 - 100,00 = 900,00
    expect(screen.getByLabelText('Total')).toHaveTextContent('900')
  })

  it('tira tem canto de 4px (rounded-lg) e borda em Régua', () => {
    const { container } = render(<DocumentoTotais subtotalCentavos={0} />)
    // A tira agora é irmã do fecho dentro da coluna alinhada à direita —
    // `firstElementChild` do container é essa coluna, não a tira.
    const tira = container.firstElementChild?.firstElementChild
    expect(tira?.className).toContain('rounded-lg')
    expect(tira?.className).toContain('border')
  })

  // O fecho NÃO fica dentro da tira: se ficasse, a tela sem grade teria um
  // total de 48px espremido entre dois pares de 14px, e a decisão do #236
  // apareceria como desalinho em vez de hierarquia.
  it('o fecho é bloco próprio, irmão da tira e não item dela', () => {
    const { container } = render(<DocumentoTotais subtotalCentavos={100_000} />)
    const fecho = container.querySelector('[data-slot="total-box"]')
    expect(fecho).not.toBeNull()
    expect(fecho?.closest('.rounded-lg')).toBeNull()
    expect(screen.getByLabelText('Total').firstElementChild?.className).toContain('text-[3rem]')
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
