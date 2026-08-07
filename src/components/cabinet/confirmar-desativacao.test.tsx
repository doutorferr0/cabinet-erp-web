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
