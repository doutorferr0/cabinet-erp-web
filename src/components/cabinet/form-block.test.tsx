import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FormBlock } from './form-block'

/**
 * FormBlock — DESIGN.md §Shapes: compartimento fechado (borda Régua, canto
 * 4px) com `<legend>` em Meta (mono 0.75rem, caixa alta) sobre a borda.
 */
describe('FormBlock', () => {
  it('renderiza fieldset com canto 4px e borda', () => {
    render(<FormBlock legend="Transportadora">conteúdo</FormBlock>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.className).toContain('rounded-lg')
    expect(fieldset?.className).toContain('border')
  })

  it('legend usa tipografia Meta (mono, caixa alta, tracking)', () => {
    render(<FormBlock legend="Transportadora">conteúdo</FormBlock>)

    const legend = screen.getByText('Transportadora')
    expect(legend.tagName).toBe('LEGEND')
    expect(legend.className).toContain('font-mono')
    expect(legend.className).toContain('text-[0.75rem]')
    expect(legend.className).toContain('uppercase')
    expect(legend.className).toContain('tracking-[0.06em]')
    expect(legend.className).toContain('text-text-strong')
  })

  // A transcrição §2 registra moldura sem nome ("Bloco separado por moldura"):
  // o compartimento existe mesmo quando não há legenda para citar.
  it('sem legend, mantém o compartimento e não renderiza <legend> vazio', () => {
    render(<FormBlock>conteúdo</FormBlock>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.className).toContain('rounded-lg')
    expect(fieldset?.querySelector('legend')).toBeNull()
  })
})

/**
 * HIERARQUIA (issue #99) — as três propriedades novas. A invariante que elas
 * servem: obrigatório mora em bloco SEMPRE ABERTO, opcional pode morar em bloco
 * recolhido, e bloco fechado NUNCA esconde campo obrigatório.
 */
describe('FormBlock com hierarquia', () => {
  it('colapsável sem obrigatório nasce FECHADO', () => {
    render(
      <FormBlock legend="Dados bancários" colapsavel>
        <input aria-label="Agência" />
      </FormBlock>,
    )

    const gatilho = screen.getByRole('button', { name: /Dados bancários/ })
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')
    // O campo continua NO DOM (o react-hook-form o mantém registrado) e fora da
    // tela — desmontar apagaria o que o operador já digitou.
    const campo = screen.getByLabelText('Agência')
    expect(campo).toBeInTheDocument()
    expect(campo.closest('[hidden]')).not.toBeNull()
  })

  it('o gatilho abre e fecha, e aponta para o corpo que governa', async () => {
    const usuario = userEvent.setup()
    render(
      <FormBlock legend="Endereço" colapsavel>
        <input aria-label="CEP" />
      </FormBlock>,
    )

    const gatilho = screen.getByRole('button', { name: /Endereço/ })
    const corpo = document.getElementById(gatilho.getAttribute('aria-controls') as string)
    expect(corpo).toContainElement(screen.getByLabelText('CEP'))

    await usuario.click(gatilho)
    expect(gatilho).toHaveAttribute('aria-expanded', 'true')
    expect(corpo).not.toHaveAttribute('hidden')

    await usuario.click(gatilho)
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')
    expect(corpo).toHaveAttribute('hidden')
  })

  it('obrigatório NÃO expõe gatilho de colapso, nem quando pedem colapsável', () => {
    render(
      <FormBlock legend="Identificação" obrigatorio colapsavel>
        <input aria-label="Nome" />
      </FormBlock>,
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('group', { name: 'Identificação' })).toBeInTheDocument()
    expect(screen.getByText('Obrigatório')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome').closest('[hidden]')).toBeNull()
    // Sem colapso não há o que contar: contador é a promessa de "o que ficou
    // escondido aqui dentro", e nada fica escondido num bloco que não fecha.
    expect(screen.queryByText('Opcional')).toBeNull()
  })

  it('o contador conta campos preenchidos e fica verde quando há algum', async () => {
    const usuario = userEvent.setup()
    render(
      <FormBlock legend="Documentos" colapsavel>
        <input aria-label="RG" defaultValue="12.345.678-9" />
        <input aria-label="PIS" />
        <textarea aria-label="Observação" />
      </FormBlock>,
    )

    const contador = screen.getByText('1/3')
    expect(contador).toHaveClass('bg-fill-money')

    await usuario.click(screen.getByRole('button', { name: /Documentos/ }))
    await usuario.type(screen.getByLabelText('PIS'), '123')
    expect(screen.getByText('2/3')).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText('RG'))
    await usuario.clear(screen.getByLabelText('PIS'))
    const vazio = screen.getByText('0/3')
    expect(vazio).toHaveClass('bg-card')
    expect(vazio).not.toHaveClass('bg-fill-money')
  })

  it('campo obrigatório fora de bloco obrigatório derruba o render', () => {
    // A invariante em forma executável. Nenhum formulário do repo marca
    // `required` hoje (a obrigatoriedade mora no schema Zod), então isto não
    // pode disparar por acidente — ele existe para o dia em que marcar.
    expect(() =>
      render(
        <FormBlock legend="Extras">
          <input aria-label="CPF" required />
        </FormBlock>,
      ),
    ).toThrow(/campo obrigatório dentro de bloco que não é/)
  })

  it('cor veste o módulo pelo data-modulo, sem cor escrita na tela', () => {
    render(
      <FormBlock legend="Fornecimento" cor="fornecedores">
        <input aria-label="Prazo" />
      </FormBlock>,
    )

    // `group` é o papel do `<fieldset>`: o nome vem do `<legend>`, que continua
    // existindo mesmo com a faixa desenhada fora dele.
    const bloco = screen.getByRole('group', { name: 'Fornecimento' })
    expect(bloco).toHaveAttribute('data-modulo', 'fornecedores')
    expect(bloco.tagName).toBe('FIELDSET')
    // Faixa na cheia, corpo na pastel — as duas utilities leem o par do escopo.
    const faixa = bloco.querySelector('.bg-modulo-cheia')
    expect(faixa).not.toBeNull()
    expect(screen.getByLabelText('Prazo').parentElement?.className).toContain('bg-modulo')
    // A tinta da faixa é MEDIDA, não a do tema: fornecedores é dos três em que
    // o neon é escuro e o preto reprovaria (4,13:1).
    expect(faixa?.className).toContain('text-white')
  })
})
