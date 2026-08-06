import { Ornamento } from '@/components/cabinet/ornamento'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Ornamento', () => {
  it('é decoração — não entra na árvore de acessibilidade', () => {
    const { container } = render(<Ornamento shape="produtos" tom="modulo" tamanho={128} />)
    const peca = container.querySelector('[data-slot="ornamento"]')
    expect(peca).toHaveAttribute('aria-hidden', 'true')
    // Nada de texto: quem explica o estado é a frase ao lado.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('recolore por MÁSCARA — o `fill` do SVG nunca é tocado', () => {
    const { container } = render(<Ornamento shape="clientes" tom="modulo" tamanho={24} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    // A forma entra como RECORTE e a cor vem da classe de token. O SVG chega
    // intacto — `fill="white"` preservado, que é a prova de que ninguém editou
    // o arquivo à mão: editar o fill quebraria as máscaras internas do Figma.
    // (Vem como data URI: o Vite inlineia asset pequeno em vez de servir arquivo.)
    expect(peca.style.maskImage).toMatch(/^url\(/)
    // Aspas simples: ao inlinear, o Vite troca `"` por `'` para caber na URL.
    expect(decodeURIComponent(peca.style.maskImage)).toMatch(/fill=['"]white['"]/)
    expect(peca).toHaveClass('bg-modulo-cheia')
  })

  it('cada módulo tem o SEU shape, sempre o mesmo', () => {
    const { container: a } = render(<Ornamento shape="produtos" tom="modulo" tamanho={18} />)
    const { container: b } = render(<Ornamento shape="estoque" tom="modulo" tamanho={18} />)
    const shapeA = (a.querySelector('[data-slot="ornamento"]') as HTMLElement).style.maskImage
    const shapeB = (b.querySelector('[data-slot="ornamento"]') as HTMLElement).style.maskImage
    expect(shapeA).not.toBe(shapeB)
  })

  it('estado de sistema não usa a cor do módulo', () => {
    const { container } = render(<Ornamento shape="busca-vazia" tom="info" tamanho={96} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    // Vazio de BUSCA não é módulo vazio: mesma tela, significados diferentes.
    expect(peca).toHaveClass('bg-info')
    expect(peca).not.toHaveClass('bg-modulo-cheia')
  })

  it('o tamanho é o da escala pedida, em px', () => {
    const { container } = render(<Ornamento shape="boletim" tom="modulo" tamanho={24} />)
    const peca = container.querySelector('[data-slot="ornamento"]') as HTMLElement
    expect(peca.style.width).toBe('24px')
    expect(peca.style.height).toBe('24px')
  })
})
