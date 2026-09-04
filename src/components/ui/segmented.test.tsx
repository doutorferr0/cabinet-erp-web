import { Segmented, SegmentedItem } from '@/components/ui/segmented'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

/**
 * O segmentado é escolha exclusiva DE VERDADE — e é por isso que ele nasceu
 * sobre o `RadioGroup` da RAC em vez de uma fileira de `<button>`.
 *
 * O que estes casos guardam não é a pele (jsdom não roda Tailwind), é o
 * contrato de acessibilidade que a pele esconde: papel `radiogroup`, um nome
 * para o grupo, `aria-checked` em quem está ativo, e troca por teclado com as
 * setas. Uma fileira de botões passaria no olho e falharia em todos eles.
 */
function Modo() {
  const [valor, setValor] = useState('lista')
  return (
    <Segmented value={valor} onChange={setValor} aria-label="Modo de exibição">
      <SegmentedItem value="lista">Lista</SegmentedItem>
      <SegmentedItem value="quadro">Quadro</SegmentedItem>
      <SegmentedItem value="calendario">Calendário</SegmentedItem>
    </Segmented>
  )
}

describe('Segmented', () => {
  it('é um grupo de escolha exclusiva com nome próprio', () => {
    renderWithQuery(<Modo />)
    expect(screen.getByRole('radiogroup', { name: 'Modo de exibição' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('o segmento ativo se anuncia como escolhido, e só ele', () => {
    renderWithQuery(<Modo />)
    expect(screen.getByRole('radio', { name: 'Lista' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Quadro' })).not.toBeChecked()
  })

  it('clicar troca o modo', async () => {
    const user = userEvent.setup()
    renderWithQuery(<Modo />)

    await user.click(screen.getByRole('radio', { name: 'Quadro' }))

    expect(screen.getByRole('radio', { name: 'Quadro' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Lista' })).not.toBeChecked()
  })

  it('a seta caminha entre os segmentos — o teclado não precisa do mouse', async () => {
    const user = userEvent.setup()
    renderWithQuery(<Modo />)

    await user.tab()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: 'Quadro' })).toBeChecked()
  })

  it('segmento desabilitado não vira o modo', async () => {
    const user = userEvent.setup()
    renderWithQuery(
      <Segmented defaultValue="entrada" aria-label="Natureza">
        <SegmentedItem value="entrada">Entrada</SegmentedItem>
        <SegmentedItem value="ajuste" isDisabled>
          Ajuste
        </SegmentedItem>
      </Segmented>,
    )

    await user.click(screen.getByRole('radio', { name: 'Ajuste' }))

    expect(screen.getByRole('radio', { name: 'Entrada' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Ajuste' })).not.toBeChecked()
  })

  it('o grupo tem UMA borda e os itens nenhuma — a divisão é hairline entre irmãos', () => {
    // §Hierarquia: nunca duas ferramentas de separação na mesma fronteira.
    // Borda por item dobraria o traço em cada junta da faixa.
    renderWithQuery(<Modo />)
    const grupo = screen.getByRole('radiogroup')
    expect(grupo.className).toContain('border-[color:var(--n-300)]')

    // `getByRole('radio')` devolve o `<input>` que a RAC esconde; quem carrega
    // a pele é o `<label>` em volta. Buscar o input e medir a classe dele
    // devolveria string vazia — e o teste passaria dizendo nada.
    const item = document.querySelectorAll('[data-slot="segmented-item"]')[1]
    expect(item).toBeDefined()
    expect(item?.className).toContain('[&+&]:border-l')
    // Nenhuma borda PRÓPRIA: só a que separa de um irmão.
    expect(item?.className).not.toMatch(/(?<!\[&\+&\]:)border-\[color/)
  })
})
