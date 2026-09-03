import { COR_DE_ZONA } from '@/components/cabinet/painel'
import { Secao } from '@/components/cabinet/secao'
import { render, screen } from '@testing-library/react'
import { FileText } from 'lucide-react'
import { describe, expect, it } from 'vitest'

/**
 * A seção é a caixa-filha do documento e, na Reface 2.0, é o MESMO `DCard` do
 * painel — a mesma caixa desenhada uma vez só.
 *
 * O que estes testes travam é o que a fusão v5 tinha posto aqui e §Hierarquia
 * removeu: barra de zona de 4px, título dentro de caixa pastel com contorno,
 * ordinal em display condensado e filete tracejado. Eram três ferramentas de
 * separação na mesma fronteira mais uma marca de cor no próprio texto — e
 * `--t-rotulo` nunca tem caixa, borda ou fundo próprio.
 */
describe('Secao — caixa-filha numerada', () => {
  it('é o dcard quieto, com o título em `.t-bloco`', () => {
    const { container } = render(
      <Secao numero="01" titulo="Cliente & Obra" cor="id">
        <p>campos</p>
      </Secao>,
    )

    const card = container.querySelector('[data-slot="secao"]') as HTMLElement
    expect(card.style.border).toBe('1px solid var(--n-300)')
    expect(card.style.boxShadow).toBe('var(--hard-soft)')

    const titulo = screen.getByRole('heading', { name: 'Cliente & Obra' })
    expect(titulo.className).toContain('t-bloco')
    // O que saiu: caixa pastel + contorno no próprio título.
    expect(titulo.className).not.toContain('bg-zone-id')
    expect(titulo.className).not.toContain('border')
  })

  it('a zona pinta o quadradinho de 8px, e nada mais', () => {
    const { container } = render(
      <Secao numero="02" titulo="Identificação" cor="info">
        <p>campos</p>
      </Secao>,
    )

    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
    // `--sky-600` e não `var(--info)`: o `index.css` 1.x ainda sombreia esse
    // nome com uma tripla HSL, que como `background` sai transparente. Ver
    // `COR_DE_ZONA`, em `painel.tsx`.
    expect(marca.style.background).toBe(COR_DE_ZONA.info)
    expect(marca.style.background).not.toBe('')
    // A barra de 4px na lateral era a segunda ferramenta na mesma fronteira.
    expect(container.querySelector('[data-slot="secao"] > span')).toBeNull()
  })

  it('o ordinal é DADO e fala em mono — não em display condensado', () => {
    // Número de seção é o que se conta ("estou na 2 de 5"), e dado fala em mono
    // (`.t-dado-meta`). Gambarino nunca abaixo de 20px, e o ordinal era 18px.
    render(
      <Secao numero="02" titulo="Identificação" cor="info">
        <p>campos</p>
      </Secao>,
    )

    const ordinal = screen.getByText('02')
    expect(ordinal.className).toContain('t-dado-meta')
    expect(ordinal.className).not.toContain('font-display-condensada')
    expect(ordinal.className).not.toContain('text-info')
  })

  it('o ícone SUBSTITUI o quadradinho — dois marcadores seriam dois donos', () => {
    const { container } = render(
      <Secao titulo="Documento" cor="warn" icone={FileText}>
        <p>campos</p>
      </Secao>,
    )

    expect(container.querySelector('[data-slot="secao-icone"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="marca-de-card"]')).toBeNull()
  })

  it('ordinal e nota dividem a mesma nota do cabeçalho', () => {
    render(
      <Secao numero="03" titulo="Itens" nota="por fornecedor">
        <p>campos</p>
      </Secao>,
    )

    const nota = screen.getByText('por fornecedor')
    const caixa = nota.closest('[data-slot="dcard-nota"]')
    expect(caixa).not.toBeNull()
    expect(caixa?.textContent).toContain('03')
  })
})
