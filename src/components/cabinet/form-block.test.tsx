import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FormBlock } from './form-block'

/**
 * FormBlock 2.0 (D16, issue #484) — CARD QUIET.
 *
 * O que estes casos vigiam mudou de mão. Até a 1.7 eles fixavam a MOLDURA
 * (`rounded-lg`, `<legend>` em mono caixa alta sobre a borda, faixa pastel do
 * módulo) — três ferramentas de separação na mesma fronteira, que é exatamente
 * o que a §Hierarquia da rodada passou a proibir. Agora vigiam a única
 * ferramenta que sobrou (borda `--n-300` + `--hard-soft`) e, sobretudo, o que
 * nunca era decoração: o papel `group`, o colapso, e a invariante do
 * obrigatório.
 */
describe('FormBlock', () => {
  it('é um card quiet: borda n-300 e sombra macia, sem caixa preta', () => {
    render(<FormBlock titulo="Transportadora">conteúdo</FormBlock>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.className).toContain('[border-color:var(--n-300)]')
    expect(fieldset?.className).toContain('shadow-[var(--hard-soft)]')
    // A sombra dura de tinta é racionada — uma por tela, e não é aqui.
    expect(fieldset?.className).not.toContain('--hard-1')
    expect(fieldset?.className).not.toContain('--hard-2')
  })

  it('o título é um `h3` de verdade, e é ele que nomeia o grupo', () => {
    render(<FormBlock titulo="Transportadora">conteúdo</FormBlock>)

    // Um texto, um papel. O `<legend class="sr-only">` da 1.7 saiu: ao lado de
    // um `<h3>` com o mesmo texto ele diria o nome duas vezes, e esconder o h3
    // com `aria-hidden` para evitar isso deixaria um heading mudo — que é o que
    // `a11y/useHeadingContent` reprova, e com razão: quem navega por títulos
    // não acharia o bloco.
    const grupo = screen.getByRole('group', { name: 'Transportadora' })
    const titulo = screen.getByRole('heading', { name: 'Transportadora' })
    expect(titulo.tagName).toBe('H3')
    expect(titulo.className).toContain('t-bloco')
    expect(grupo).toHaveAttribute('aria-labelledby', titulo.id)
    expect(grupo.querySelector('legend')).toBeNull()
    // O nome do bloco não tem caixa: título e `--t-rotulo` nunca têm borda,
    // fundo nem contorno próprio.
    expect(titulo.className).not.toContain('border')
    expect(titulo.className).not.toContain('bg-')
  })

  it('`legend` continua aceito — vinte telas montam o bloco assim', () => {
    render(<FormBlock legend="Transportadora">conteúdo</FormBlock>)
    expect(screen.getByRole('group', { name: 'Transportadora' })).toBeInTheDocument()
  })

  // A transcrição §2 registra moldura sem nome ("Bloco separado por moldura"):
  // o compartimento existe mesmo quando não há legenda para citar.
  it('sem nome, mantém o card e não inventa título vazio', () => {
    render(<FormBlock>conteúdo</FormBlock>)

    const fieldset = screen.getByText('conteúdo').closest('fieldset')
    expect(fieldset?.className).toContain('[border-color:var(--n-300)]')
    expect(fieldset?.querySelector('h3')).toBeNull()
    expect(fieldset).not.toHaveAttribute('aria-labelledby')
  })

  it('`acoes` entra à direita do título, em `.t-rotulo`', () => {
    render(
      <FormBlock titulo="Itens" acoes="Puxados de PV-21646">
        conteúdo
      </FormBlock>,
    )

    const acoes = screen.getByText('Puxados de PV-21646')
    expect(acoes.className).toContain('t-rotulo')
    expect(acoes.className).toContain('ml-auto')
  })

  it('`tint` separa o card por assunto, e só ele muda o fundo', () => {
    const { rerender } = render(<FormBlock titulo="Identidade">conteúdo</FormBlock>)
    expect(screen.getByText('conteúdo').closest('fieldset')?.className).toContain(
      '[background:var(--n-0)]',
    )

    rerender(
      <FormBlock titulo="Identidade" tint="lilac">
        conteúdo
      </FormBlock>,
    )
    expect(screen.getByText('conteúdo').closest('fieldset')?.className).toContain(
      '[background:var(--tint-lilac)]',
    )
  })
})

/**
 * HIERARQUIA (issue #99) — as três propriedades. A invariante que elas servem:
 * obrigatório mora em bloco SEMPRE ABERTO, opcional pode morar em bloco
 * recolhido, e bloco fechado NUNCA esconde campo obrigatório.
 */
describe('FormBlock com hierarquia', () => {
  it('colapsável sem obrigatório nasce FECHADO', () => {
    render(
      <FormBlock titulo="Dados bancários" colapsavel>
        <input aria-label="CEP" />
      </FormBlock>,
    )

    const gatilho = screen.getByRole('button', { name: /Dados bancários/ })
    expect(gatilho).toHaveAttribute('aria-expanded', 'false')

    // Escondido, não desmontado: o valor digitado sobrevive ao fecha-e-abre.
    const campo = screen.getByLabelText('CEP')
    expect(campo).toBeInTheDocument()
    expect(campo.closest('[hidden]')).not.toBeNull()
  })

  it('o gatilho abre e fecha, e aponta para o corpo que governa', async () => {
    const usuario = userEvent.setup()
    render(
      <FormBlock titulo="Dados bancários" colapsavel>
        <input aria-label="CEP" />
      </FormBlock>,
    )

    const gatilho = screen.getByRole('button', { name: /Dados bancários/ })
    const idCorpo = gatilho.getAttribute('aria-controls') ?? ''
    const corpo = document.getElementById(idCorpo)
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
      <FormBlock titulo="Identificação" obrigatorio colapsavel>
        <input aria-label="Nome" />
      </FormBlock>,
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('group', { name: 'Identificação' })).toBeInTheDocument()
    expect(screen.getByText('Obrigatório')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome').closest('[hidden]')).toBeNull()
    expect(screen.queryByText('Opcional')).toBeNull()
  })

  it('o carimbo é `.t-rotulo` sem caixa, e o contador é mono', async () => {
    const usuario = userEvent.setup()
    render(
      <FormBlock titulo="Documentos" colapsavel>
        <input aria-label="RG" defaultValue="12.345.678-9" />
        <input aria-label="PIS" />
        <textarea aria-label="Observação" />
      </FormBlock>,
    )

    const carimbo = screen.getByText('Opcional')
    expect(carimbo.className).toContain('t-rotulo')
    // O verde de preenchimento saiu: verde tem dono, e é dinheiro. Contagem é
    // número — o que a distingue do rótulo ao lado é a família mono.
    expect(carimbo.className).not.toContain('bg-')

    const contador = screen.getByText('1/3')
    expect(contador.className).toContain('t-dado-meta')

    await usuario.click(screen.getByRole('button', { name: /Documentos/ }))
    await usuario.type(screen.getByLabelText('PIS'), '123')
    expect(screen.getByText('2/3')).toBeInTheDocument()

    await usuario.clear(screen.getByLabelText('RG'))
    await usuario.clear(screen.getByLabelText('PIS'))
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })

  it('campo obrigatório fora de bloco obrigatório derruba o render', () => {
    // A invariante em forma executável. Nenhum formulário do repo marca
    // `required` hoje (a obrigatoriedade mora no schema Zod), então isto não
    // pode disparar por acidente — ele existe para o dia em que marcar.
    expect(() =>
      render(
        <FormBlock titulo="Extras">
          <input aria-label="CPF" required />
        </FormBlock>,
      ),
    ).toThrow(/campo obrigatório dentro de bloco que não é/)
  })

  it('`cor` continua saindo como data-modulo, sem cor escrita na tela', () => {
    render(
      <FormBlock titulo="Fornecimento" cor="fornecedores">
        <input aria-label="Prazo" />
      </FormBlock>,
    )

    const bloco = screen.getByRole('group', { name: 'Fornecimento' })
    expect(bloco).toHaveAttribute('data-modulo', 'fornecedores')
    expect(bloco.tagName).toBe('FIELDSET')
    // A barra de 4px na cheia /01 e a faixa pastel MORRERAM na 2.0: card quiet
    // é uma ferramenta de separação, e a faixa colorida era a segunda na mesma
    // fronteira. O `data-modulo` fica porque é o gancho do tint em CSS.
    expect(bloco.querySelector('.bg-modulo-cheia')).toBeNull()
    expect(bloco.className).not.toContain('bg-modulo')
  })
})
