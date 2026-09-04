import { Campo } from '@/components/cabinet/campo'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Campo (D16, issue #484) — rótulo sem caixa, ajuda e erro na mesma linha.
 */
describe('Campo', () => {
  it('o rótulo é texto, não selo: sem borda, sem fundo, sem caixa alta', () => {
    render(
      <Campo label="Razão social" htmlFor="razao">
        <input id="razao" />
      </Campo>,
    )

    const rotulo = screen.getByText('Razão social')
    expect(rotulo.tagName).toBe('LABEL')
    expect(rotulo.className).toContain('t-ui')
    expect(rotulo.className).not.toContain('border')
    expect(rotulo.className).not.toContain('bg-')
    expect(rotulo.className).not.toContain('uppercase')
    // O `htmlFor` liga rótulo e controle — é o que faz clicar no nome focar o campo.
    expect(screen.getByLabelText('Razão social')).toBe(document.getElementById('razao'))
  })

  it('obrigatório marca `*` para o olho e diz a palavra para o leitor de tela', () => {
    render(
      <Campo label="CNPJ" obrigatorio htmlFor="cnpj">
        <input id="cnpj" />
      </Campo>,
    )

    // `*` sozinho é lido como "asterisco" ou como nada, conforme o leitor.
    const asterisco = screen.getByText('*')
    expect(asterisco).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByLabelText(/CNPJ.*obrigatório/)).toBeInTheDocument()
  })

  it('a ajuda aparece sozinha e some quando há erro', () => {
    const { rerender } = render(
      <Campo label="CEP" ajuda="Só números">
        <input />
      </Campo>,
    )
    expect(screen.getByText('Só números')).toBeInTheDocument()

    rerender(
      <Campo label="CEP" ajuda="Só números" erro="CEP inválido">
        <input />
      </Campo>,
    )
    // O erro VENCE: quem já sabe que errou não precisa mais da dica de como
    // digitar, e mostrar as duas empurraria o campo seguinte para baixo no
    // instante em que o operador errou.
    expect(screen.queryByText('Só números')).toBeNull()
    const erro = screen.getByRole('alert')
    expect(erro).toHaveTextContent('CEP inválido')
    expect(erro.className).toContain('[color:var(--bad)]')
  })

  it('os ids da ajuda e do erro vêm de fora — o `aria-describedby` é do controle', () => {
    render(
      <Campo label="CEP" idAjuda="cep-ajuda" ajuda="Só números">
        <input aria-describedby="cep-ajuda" />
      </Campo>,
    )
    // Gerar id próprio aqui produziria dois pares: o input apontaria para um id
    // que não existe e a ajuda ficaria muda para o leitor de tela.
    expect(screen.getByText('Só números')).toHaveAttribute('id', 'cep-ajuda')
  })
})
