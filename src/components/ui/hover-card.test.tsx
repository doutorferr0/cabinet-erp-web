import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

function Exemplo() {
  return (
    <HoverCard delayAbrir={0} delayFechar={0}>
      <HoverCardTrigger>
        <button type="button">Cadastros</button>
      </HoverCardTrigger>
      <HoverCardContent>
        <p>Clientes, fornecedores e produtos</p>
      </HoverCardContent>
    </HoverCard>
  )
}

describe('HoverCard', () => {
  it('abre com o mouse e fecha ao sair', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    expect(screen.queryByText('Clientes, fornecedores e produtos')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: 'Cadastros' }))
    expect(await screen.findByText('Clientes, fornecedores e produtos')).toBeVisible()

    await user.unhover(screen.getByRole('button', { name: 'Cadastros' }))
    expect(screen.queryByText('Clientes, fornecedores e produtos')).not.toBeInTheDocument()
  })

  it('abre no foco — quem usa teclado também alcança o conteúdo', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Cadastros' })).toHaveFocus()
    expect(await screen.findByText('Clientes, fornecedores e produtos')).toBeVisible()
  })

  it('não embrulha o gatilho em caixa nova — o botão continua sendo o filho direto', () => {
    const { container } = render(<Exemplo />)
    const botao = screen.getByRole('button', { name: 'Cadastros' })
    // Sem `<span>` de embrulho no meio: um wrapper aqui quebraria o layout de
    // quem já é filho direto de um flex, como o botão da sidebar. O gatilho é
    // o PRÓPRIO botão — é nele que o `data-slot` pousa.
    expect(container.firstChild).toBe(botao)
    expect(botao).toHaveAttribute('data-slot', 'hover-card-trigger')
  })
})
