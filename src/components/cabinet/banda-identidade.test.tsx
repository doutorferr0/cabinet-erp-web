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
    // r5: a zona de identidade virou GRADIENTE (id → info suave) — mais um
    // degrau de detalhe das referências; a âncora segue sendo a zona-id.
    expect(banda.className).toContain('var(--zone-id)')
    expect(banda.className).toContain('border-2')
    expect(banda.className).not.toContain('rounded')
  })

  /**
   * A escala maior do #236 é do DOCUMENTO, e entra por opt-in. A banda é a
   * headline de toda tela — login, configurações, boletim, os cadastros —, e
   * subir a medida no padrão mudaria o título do sistema inteiro para atender
   * uma decisão tomada sobre o documento. Ninguém leria isso como decisão de
   * desenho: leria como a tela de login ter engordado sozinha.
   */
  it('o título de tela fica em 28px por padrão', () => {
    render(<BandaDeIdentidade titulo="Cadastro de fornecedores" />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.className).toContain('text-[1.75rem]')
    expect(h1.className).not.toContain('text-[2.25rem]')
  })

  it('só o documento pede os 36px, e pede explicitamente', () => {
    render(<BandaDeIdentidade titulo="Orçamento" escalaTitulo="documento" />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.className).toContain('text-[2.25rem]')
    expect(h1.className).not.toContain('text-[1.75rem]')
  })
})
