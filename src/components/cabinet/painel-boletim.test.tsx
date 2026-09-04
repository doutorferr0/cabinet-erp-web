import { COR_DE_ZONA } from '@/components/cabinet/painel'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PainelBoletim } from './painel-boletim'

/**
 * Na Reface 2.0 o painel da folha do dia é um `DCard` quieto, como painel e
 * seção — a moldura DUPLA colorida, a `legend` vazada na borda e o papel
 * quadriculado saíram todos.
 *
 * Estes testes travam o que a régua manda (§Hierarquia, issue-mãe #469): card é
 * borda `n-300` + `--hard-soft`; uma ferramenta de separação por fronteira (a
 * moldura + o filete externo eram DUAS linhas encostadas); e nada de textura de
 * fundo dentro do card, que é um quarto vocabulário que a régua não tem.
 *
 * Travam também a SEMÂNTICA: as três regiões são tabelas de leitura, sem campo
 * nenhum, e `fieldset`/`legend` anunciava grupo de controles ao leitor de tela.
 */
describe('PainelBoletim', () => {
  it('é o dcard quieto — sem moldura dupla, sem papel quadriculado', () => {
    const { container } = render(
      <PainelBoletim cor="boletim" legend="Movimento do dia">
        conteúdo
      </PainelBoletim>,
    )

    const card = container.querySelector('[data-slot="painel-boletim"]') as HTMLElement
    expect(card.style.border).toBe('1px solid var(--n-300)')
    expect(card.style.boxShadow).toBe('var(--hard-soft)')
    expect(card.className).not.toContain('border-double-modulo')
    expect(card.className).not.toContain('bg-paper-grid')
    expect(card.style.outline).toBe('')
  })

  it('deixou de ser `fieldset`: as três regiões são leitura, não grupo de campos', () => {
    const { container } = render(
      <PainelBoletim cor="boletim" legend="Movimento do dia">
        conteúdo
      </PainelBoletim>,
    )

    expect(container.querySelector('fieldset')).toBeNull()
    expect(container.querySelector('legend')).toBeNull()
    // A legenda passa a ser o título do card, que é o que ela sempre foi na tela.
    expect(screen.getByRole('heading', { name: 'Movimento do dia' }).className).toContain('t-bloco')
  })

  it('a cor da região pinta o quadradinho, em token 2.0 e sem literal', () => {
    const { container } = render(
      <PainelBoletim cor="boletim" legend="Movimento">
        conteúdo
      </PainelBoletim>,
    )

    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
    expect(marca.style.background).toBe('var(--mod-hoje)')
    expect(marca.className).not.toMatch(/\[#|hsl\(/)
  })

  // `cadastros` EMPRESTA o matiz do Estoque — mesmo mecanismo de antes, agora
  // sem passar pela tripla HSL do 1.x. Nenhuma nona cor.
  it('cadastros empresta o matiz do Estoque', () => {
    const { container } = render(
      <PainelBoletim cor="cadastros" legend="Cadastros">
        conteúdo
      </PainelBoletim>,
    )

    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
    expect(marca.style.background).toBe('var(--mod-estoque)')
  })

  // Pendência é ESTADO, não módulo: lê a zona `warn`, e emprestar cor de módulo
  // aqui diria que "Ordens sem Data Envio" pertence a algum cadastro.
  it('pendência lê a zona warn e não declara módulo', () => {
    const { container } = render(
      <PainelBoletim cor="foco" legend="Ordens sem Data Envio">
        conteúdo
      </PainelBoletim>,
    )

    const card = container.querySelector('[data-slot="painel-boletim"]') as HTMLElement
    expect(card.dataset.regiao).toBe('foco')
    expect(card).not.toHaveAttribute('data-modulo')
    const marca = container.querySelector('[data-slot="marca-de-card"]') as HTMLElement
    // `--amber-600` e não `var(--warn)`: aquele nome ainda está sombreado pela
    // tripla HSL do `index.css` 1.x. Ver `COR_DE_ZONA`, em `painel.tsx`.
    expect(marca.style.background).toBe(COR_DE_ZONA.warn)
    expect(marca.style.background).not.toBe('')
  })

  it('sem legend não desenha cabeçalho nem quadradinho órfão', () => {
    // Quadradinho sem rótulo ao lado é cor que o operador não pode nomear
    // (WCAG 1.4.1) — e cabeçalho vazio ocuparia altura dizendo nada.
    const { container } = render(<PainelBoletim cor="boletim">conteúdo</PainelBoletim>)

    expect(container.querySelector('[data-slot="dcard-cabecalho"]')).toBeNull()
    expect(container.querySelector('[data-slot="marca-de-card"]')).toBeNull()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })

  it('o corpo vai sem padding, para a hairline da tabela atravessar o card', () => {
    const { container } = render(
      <PainelBoletim cor="boletim" legend="Movimento">
        tabela
      </PainelBoletim>,
    )
    const corpo = container.querySelector('[data-slot="dcard-corpo"]') as HTMLElement

    expect(corpo.style.padding).toBe('')
  })
})
