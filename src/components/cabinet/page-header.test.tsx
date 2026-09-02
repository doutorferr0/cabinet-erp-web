import { PageHeader } from '@/components/cabinet/page-header'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pencil, Plus, Printer } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

/**
 * O que estes testes travam é a PROMESSA do padrão, não o desenho: uma ação
 * forte por tela, o resto atrás do `⋯` e alcançável por teclado, e motivo
 * VISÍVEL em quem não serve agora. A barra Softlux passava nos três pelo
 * avesso — sete botões de peso igual, nenhum menu, e o motivo só no `title`.
 */
describe('PageHeader', () => {
  it('anuncia o nome da tela como cabeçalho de nível 1', () => {
    render(<PageHeader titulo="Cadastro de Clientes" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro de Clientes' }),
    ).toBeInTheDocument()
  })

  it('a ação primária é a ÚNICA fora do menu', async () => {
    const incluir = vi.fn()
    const user = userEvent.setup()
    render(
      <PageHeader
        titulo="Cadastro de Clientes"
        primaria={{ id: 'incluir', label: 'Incluir', icon: Plus, onClick: incluir }}
        secundarias={[
          { id: 'alterar', label: 'Alterar', icon: Pencil },
          { id: 'imprimir', label: 'Imprimir', icon: Printer },
        ]}
      />,
    )

    // Fora do menu só existem a primária e o gatilho do `⋯`: é isso que faz
    // `Incluir` ser encontrado sem leitura, em dez telas, sempre no mesmo canto.
    // A ordem é a do Polaris: o `⋯` antes, a primária no fim da linha — o canto
    // extremo é o lugar mais fácil de mirar, e é dela.
    const botoes = screen.getAllByRole('button').map((b) => b.textContent)
    expect(botoes).toEqual(['', 'Incluir'])
    expect(screen.queryByRole('button', { name: 'Alterar' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Incluir' }))
    expect(incluir).toHaveBeenCalledOnce()
  })

  it('as secundárias abrem pelo teclado e agem no clique', async () => {
    const imprimir = vi.fn()
    const user = userEvent.setup()
    render(
      <PageHeader
        titulo="Cadastro de Clientes"
        secundarias={[{ id: 'imprimir', label: 'Imprimir', icon: Printer, onClick: imprimir }]}
      />,
    )

    // Teclado puro, sem mouse: `Tab` até o gatilho e `Enter` para abrir — o
    // caminho de quem não usa ponteiro, e a DoD da issue.
    await user.tab()
    expect(screen.getByRole('button', { name: 'Mais ações' })).toHaveFocus()
    await user.keyboard('{Enter}')

    await user.click(await screen.findByRole('menuitem', { name: /Imprimir/ }))
    expect(imprimir).toHaveBeenCalledOnce()
  })

  it('item que não serve fica desabilitado e DIZ o motivo, à vista', async () => {
    const user = userEvent.setup()
    render(
      <PageHeader
        titulo="Cadastro de Colaboradores"
        secundarias={[
          {
            id: 'alterar',
            label: 'Alterar',
            disabled: true,
            motivo: 'O servidor ainda não publica o detalhe deste cadastro.',
          },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    const item = await screen.findByRole('menuitem', { name: /Alterar/ })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    // VISÍVEL, não em `title`: item de menu morto não recebe hover em toda
    // plataforma, e motivo que só aparece no ponteiro não é motivo dado.
    expect(item).toHaveTextContent('O servidor ainda não publica o detalhe deste cadastro.')
  })

  it('o aviso do grupo é dito uma vez, e não em cada item', async () => {
    const user = userEvent.setup()
    render(
      <PageHeader
        titulo="Cadastro de Clientes"
        avisoDasSecundarias="Escolha uma linha na listagem para usar as ações de registro."
        secundarias={[
          { id: 'alterar', label: 'Alterar', disabled: true },
          { id: 'excluir', label: 'Excluir', disabled: true, destrutiva: true },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    expect(
      await screen.findAllByText('Escolha uma linha na listagem para usar as ações de registro.'),
    ).toHaveLength(1)
  })

  /**
   * GUARDA INVERTIDA (#235): o cabeçalho NÃO tem saída.
   *
   * Ela existiu como prop `voltar` OPT-IN, e um único consumidor a passava —
   * as demais telas ficavam sem saída; a #235 a mudou para a folha
   * (`PageFrame`). Na 2.0 (D5) ela volta para cá, colada ao título, porque é
   * onde o olho já está — o que NÃO volta é o opt-in: o padrão é ligado, e
   * quem decide se há tecla é `rotaMaeDe`.
   *
   * Fora do roteador não há mãe nem histórico, e o `BotaoVoltar` some inteiro:
   * é o que deixa este arquivo montar o cabeçalho sem `RouterProvider`.
   */
  it('a saída é do cabeçalho de novo, e some onde não há para onde voltar', () => {
    render(<PageHeader titulo="Cliente 1042" primaria={{ id: 'alterar', label: 'Alterar' }} />)

    // Sem roteador: sem tecla. Quem prova o outro lado — a tecla PRESENTE numa
    // rota de detalhe — é `page-frame.test.tsx`, que monta a rota de verdade.
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()
  })

  /**
   * A régua tipográfica (§Hierarquia) tem TRÊS degraus de título, e a tela pede
   * o PAPEL, não a medida: mudar 28 para 26 é uma linha em `index.css`.
   *
   * A guarda é sobre a classe porque é ela que carrega o degrau — asserir o
   * `font-size` computado mediria o CSS do jsdom, que não carrega os tokens.
   */
  it('o título sai no degrau que a tela PEDE, e o padrão é o de página', () => {
    const { rerender } = render(<PageHeader titulo="Ordens de Compra" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('t-pagina')

    rerender(<PageHeader titulo="OC-5098" variante="registro" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('t-registro')

    rerender(<PageHeader titulo="Boa tarde, Henrique" variante="display" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('t-display')
  })

  /**
   * O subtítulo diz o que a tela TEM agora, e é PARÁGRAFO, não cabeçalho: um
   * segundo `<h*>` embaixo do título faria o leitor de tela anunciar dois
   * níveis onde há um assunto só.
   */
  it('o subtítulo é dado da tela, embaixo do título, fora da hierarquia', () => {
    render(<PageHeader titulo="Ordens de Compra" subtitulo="14 ordens · 3 fornecedores" />)

    const subtitulo = screen.getByText('14 ordens · 3 fornecedores')
    expect(subtitulo.tagName).toBe('P')
    expect(subtitulo).toHaveClass('t-meta')
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  /**
   * As ações FRACAS ficam à vista, à esquerda do `⋯`, e a forte continua sendo
   * uma — pelo TIPO, não por conferência em tempo de execução: `primaria` é
   * prop própria, então "duas primárias" não compila.
   */
  it('as ações fracas saem em ghost, antes do menu e da forte', async () => {
    const imprimir = vi.fn()
    const user = userEvent.setup()
    render(
      <PageHeader
        titulo="Ordens de Compra"
        acoes={[{ id: 'imprimir', label: 'Imprimir', icon: Printer, onClick: imprimir }]}
        primaria={{ id: 'incluir', label: 'Incluir', icon: Plus }}
        secundarias={[{ id: 'alterar', label: 'Alterar', icon: Pencil }]}
      />,
    )

    // A ordem da linha é a do Polaris: fracas · `⋯` · forte no canto extremo.
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Imprimir',
      '',
      'Incluir',
    ])

    await user.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(imprimir).toHaveBeenCalledTimes(1)
  })
})
