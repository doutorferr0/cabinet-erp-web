import { ConfirmarDesativacao } from '@/components/cabinet/confirmar-desativacao'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

function montar(props: Partial<React.ComponentProps<typeof ConfirmarDesativacao>> = {}) {
  const onFechar = vi.fn()
  const onConfirmar = vi.fn()
  const user = userEvent.setup()
  render(
    <ConfirmarDesativacao
      entidade="produto"
      nome="PENDENTE REDONDO"
      ativo
      aberto
      onFechar={onFechar}
      onConfirmar={onConfirmar}
      {...props}
    />,
  )
  return { user, onFechar, onConfirmar }
}

describe('ConfirmarDesativacao', () => {
  it('é ALERTA, não diálogo comum — a consequência tem que ser lida junto', async () => {
    montar()
    const dialogo = await screen.findByRole('alertdialog')
    // `role="alertdialog"` faz o leitor de tela anunciar a descrição junto do
    // título; num `dialog` comum ela viria só depois de navegar até lá, e a
    // confirmação seria dada antes de a consequência ser lida.
    expect(dialogo).toBeInTheDocument()
    expect(dialogo).toHaveAccessibleDescription(/não é apagado/i)
  })

  // A voz do título do diálogo é a de TÍTULO, e ela é DECLARADA, não herdada.
  //
  // Escrito primeiro como guarda de herança (a regra do `index.css` pegava
  // `h1, h2, h3`), e reescrito no mesmo dia quando o user restringiu a regra ao
  // H1: um `Heading` sem família passou a cair no Inter do body, calado. O
  // diálogo não é o H1 da tela — é estrutura dentro dela —, e na régua 2.0 ele
  // é `--t-secao`, que é o mesmo degrau do título de hub e de seção de doc.
  it('o título é cabeçalho de verdade, na voz de título, sem caixa alta', async () => {
    montar()
    const dialogo = await screen.findByRole('alertdialog')
    const titulo = within(dialogo).getByRole('heading')

    // Cabeçalho de verdade: quem navega por leitor de tela pula por nível.
    expect(['H1', 'H2', 'H3']).toContain(titulo.tagName)
    // A família não pode voltar a depender de herança — ver o comentário acima.
    expect(titulo.className).toContain('font-display')
    expect(titulo.className).not.toContain('font-nome')
    expect(titulo.className).not.toContain('uppercase')
    expect(titulo.className).toContain('font-bold')
    expect(titulo.className).not.toContain('font-extrabold')
  })

  it('NÃO fecha ao clicar fora — a saída é por botão nomeado', async () => {
    const { user, onFechar } = montar()
    await screen.findByRole('alertdialog')

    await user.click(document.body)

    // Sumir ao primeiro clique perdido é ambíguo: o operador não sabe se
    // cancelou ou se a ação foi embora sem resposta.
    expect(onFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('não oferece um "x" mudo — quem fecha é Cancelar, que diz o que faz', async () => {
    montar()
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).queryByRole('button', { name: /fechar/i })).not.toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('registro já inativo não oferece Desativar — não há o que escrever', async () => {
    montar({ ativo: false })
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('já está inativo')
    expect(within(dialogo).queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
  })

  it('o erro do servidor é anunciado sem fechar o diálogo', async () => {
    montar({ erro: 'Sem permissão para gravar nesta empresa.' })
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByRole('alert')).toHaveTextContent(/sem permissão/i)
  })
})
