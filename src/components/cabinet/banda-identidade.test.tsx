import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O título da tela era `<h1 className="text-xl font-semibold">` copiado em 19
 * rotas — mesma classe, nenhum dono. A banda é esse padrão virando peça: um
 * lugar só para mudar, e a zona de identidade (creme-avermelhado) que o `<h1>`
 * solto não tinha. O teste afirma o nível do cabeçalho, não só o texto: é o
 * cabeçalho de nível 1 que diz a quem navega por leitor de tela onde está.
 */
describe('BandaDeIdentidade', () => {
  it('anuncia o nome da tela como cabeçalho de nível 1', () => {
    render(<BandaDeIdentidade titulo="Cadastro de fornecedores" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cadastro de fornecedores' }),
    ).toBeInTheDocument()
  })

  it('contexto acompanha o título sem competir com ele', () => {
    render(<BandaDeIdentidade titulo="Cadastro de Produtos" contexto="Banco Principal" />)
    const contexto = screen.getByText('Banco Principal')
    // Meta: mono, caixa alta — etiqueta, não segundo título.
    expect(contexto.className).toContain('font-mono')
    expect(contexto.className).toContain('uppercase')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Cadastro de Produtos')
  })

  it('é zona de identidade em caixa preta (creme-avermelhado, 2px, radius 0)', () => {
    const { container } = render(<BandaDeIdentidade titulo="Orçamento" />)
    const banda = container.firstElementChild as HTMLElement
    expect(banda.className).toContain('bg-zone-id')
    expect(banda.className).toContain('border-2')
    expect(banda.className).not.toContain('rounded')
  })
})
