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

  it('a saída existe só onde há para onde voltar', async () => {
    const voltar = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<PageHeader titulo="Cadastro de Clientes" />)
    expect(screen.queryByRole('button', { name: /Fechar|Voltar/ })).not.toBeInTheDocument()

    rerender(<PageHeader titulo="Cliente 1042" voltar={{ label: 'Fechar', onClick: voltar }} />)
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(voltar).toHaveBeenCalledOnce()
  })
})
