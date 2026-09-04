import { Ornamento, OrnamentoDoModulo } from '@/components/cabinet/ornamento'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function pecaDe(container: HTMLElement) {
  return container.querySelector('[data-slot="ornamento"]') as SVGSVGElement
}

function aneisDe(container: HTMLElement) {
  return [...container.querySelectorAll('[data-slot="ornamento"] circle')]
}

/** Do externo para o miolo — a ordem em que o SVG os empilha. */
function anelDe(container: HTMLElement, indice: number) {
  return aneisDe(container)[indice] as SVGCircleElement
}

/** A cruz tracejada — o único `path` da forma. */
function cruzDe(container: HTMLElement) {
  return container.querySelector('[data-slot="ornamento"] path') as SVGPathElement
}

describe('Ornamento', () => {
  it('é decoração — não entra na árvore de acessibilidade', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    expect(pecaDe(container)).toHaveAttribute('aria-hidden', 'true')
    // Nada de texto: quem explica o estado é a frase ao lado.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('é UMA forma: três anéis concêntricos e a cruz tracejada, sem acervo', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={64} />)
    const aneis = aneisDe(container)
    expect(aneis).toHaveLength(3)
    // Concêntricos: mesmo centro, raio decrescente — senão o miolo some sob o
    // anel de fora e a forma vira um disco.
    expect(aneis.map((a) => a.getAttribute('cx'))).toEqual(['180', '180', '180'])
    expect(aneis.map((a) => Number(a.getAttribute('r')))).toEqual([150, 100, 50])
    expect(cruzDe(container)).toHaveAttribute('stroke-dasharray', '3 5')
  })

  it('o miolo é sempre a marca — é o que dá cara própria ao login', () => {
    const { container } = render(<Ornamento shape="dashboard" tom="icone" tamanho={360} />)
    expect(anelDe(container, 2)).toHaveAttribute('fill', 'var(--main)')
  })

  it('o shape escolhe o MATIZ, e o mesmo shape dá sempre o mesmo', () => {
    // Derivado do nome, não sorteado: sem isto a 404 mudaria de cor a cada
    // render e o módulo não teria como se reconhecer na própria forma.
    const um = render(<Ornamento shape="compras" tom="modulo" tamanho={96} />)
    const outro = render(<Ornamento shape="compras" tom="modulo" tamanho={96} />)
    expect(pecaDe(um.container)).toHaveAttribute('data-matiz', 'lilac')
    expect(pecaDe(outro.container)).toHaveAttribute('data-matiz', 'lilac')

    const matizes = (['compras', 'estoque', 'vendas', 'crm'] as const).map((shape) => {
      const { container } = render(<Ornamento shape={shape} tom="icone" tamanho={20} />)
      return pecaDe(container).getAttribute('data-matiz')
    })
    expect(new Set(matizes).size).toBe(4)
  })

  it('shape sem matiz próprio cai no lilac do login, não em branco', () => {
    const { container } = render(<Ornamento shape="rota-inexistente" tom="erro" tamanho={96} />)
    expect(pecaDe(container)).toHaveAttribute('data-matiz', 'lilac')
    expect(anelDe(container, 0)).toHaveAttribute('fill', 'var(--tint-lilac)')
  })

  it('os dois anéis de fora nunca repetem o tint — dois iguais viram um disco', () => {
    const { container } = render(<Ornamento shape="crm" tom="modulo" tamanho={96} />)
    const [externo, meio] = aneisDe(container).map((a) => a.getAttribute('fill'))
    expect(externo).toBe('var(--tint-sand)')
    expect(meio).not.toBe(externo)
  })

  it('o fio é px de TELA — sem isso ele some no viewBox de 360 unidades', () => {
    const { container } = render(<Ornamento shape="vendas" tom="modulo" tamanho={128} />)
    expect(cruzDe(container)).toHaveAttribute('vector-effect', 'non-scaling-stroke')
  })

  it('fio sai de currentColor, nunca de literal — senão some no tema escuro', () => {
    const { container } = render(<Ornamento shape="clientes" tom="modulo" tamanho={64} />)
    expect(cruzDe(container).getAttribute('stroke')).toBe('currentColor')
    expect(anelDe(container, 0).getAttribute('stroke')).toBe('currentColor')
  })

  it('estado de sistema não usa a cor do módulo', () => {
    const { container } = render(<Ornamento shape="rota-inexistente" tom="erro" tamanho={96} />)
    expect(pecaDe(container)).toHaveClass('text-destructive')
    expect(pecaDe(container)).not.toHaveClass('text-modulo')
  })

  it('no papel de ÍCONE a cor é herdada, não escolhida', () => {
    const { container } = render(<Ornamento shape="produtos" tom="icone" tamanho={16} />)
    const peca = pecaDe(container)
    expect(peca).not.toHaveClass('text-modulo')
    expect(peca).not.toHaveClass('text-modulo-suave')
  })

  it('ícone e decoração são o MESMO desenho — muda a cor, não a técnica', () => {
    const icone = render(<Ornamento shape="estoque" tom="icone" tamanho={16} />)
    const decoracao = render(<Ornamento shape="estoque" tom="modulo" tamanho={96} />)
    expect(cruzDe(icone.container).getAttribute('d')).toBe(
      cruzDe(decoracao.container).getAttribute('d'),
    )
    expect(aneisDe(icone.container)).toHaveLength(aneisDe(decoracao.container).length)
  })

  it('fora do router o ornamento de módulo não desenha o de outro módulo', () => {
    // `renderWithQuery` monta peça compartilhada sem router; ausência é a
    // resposta certa, e exigir router só por decoração quebraria essas telas.
    const { container } = render(<OrnamentoDoModulo tamanho={24} />)
    expect(container.querySelector('[data-slot="ornamento"]')).toBeNull()
  })
})
