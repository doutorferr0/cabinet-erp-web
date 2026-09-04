import { DO_MODULO, Forma, FormaDoModulo, type TipoDeForma } from '@/components/cabinet/forma'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const TIPOS: TipoDeForma[] = ['casa', 'caixa', 'quadrado', 'seta', 'funil', 'circulo', 'barras']

function pecaDe(container: HTMLElement) {
  return container.querySelector('[data-slot="forma"]') as SVGSVGElement
}

/** Do contorno para o miolo — a ordem em que o SVG as empilha. */
function camadasDe(container: HTMLElement) {
  return [...container.querySelectorAll('[data-slot="forma"] path')] as SVGPathElement[]
}

describe('Forma', () => {
  it('é decoração — não entra na árvore de acessibilidade', () => {
    const { container } = render(<Forma tipo="casa" tamanho={120} />)
    expect(pecaDe(container)).toHaveAttribute('aria-hidden', 'true')
    // Nada de texto: quem explica o estado é a frase ao lado.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it.each(TIPOS)('%s é contorno duplo concêntrico, e não desenho de acervo', (tipo) => {
    const { container } = render(<Forma tipo={tipo} />)
    // Duas camadas: a gramática da marca é forma DENTRO de forma. Uma só seria
    // um ícone qualquer; três seria a marca do login, que é caso à parte.
    expect(camadasDe(container)).toHaveLength(2)
    expect(pecaDe(container)).toHaveAttribute('data-tipo', tipo)
  })

  it('sem tint a forma é só traço — o preenchimento é opcional, não o desenho', () => {
    const { container } = render(<Forma tipo="quadrado" />)
    expect(camadasDe(container).map((p) => p.getAttribute('fill'))).toEqual(['none', 'none'])
  })

  it('o tint pinta a externa a 18% e a interna a 55% — a interna é o foco', () => {
    const { container } = render(<Forma tipo="caixa" tint="--mod-compras" />)
    const [fora, dentro] = camadasDe(container).map((p) => p.getAttribute('fill'))
    expect(fora).toBe('color-mix(in oklab, var(--mod-compras) 18%, transparent)')
    expect(dentro).toBe('color-mix(in oklab, var(--mod-compras) 55%, transparent)')
  })

  it('três níveis é a marca do login, e só a casa tem o do meio', () => {
    const { container } = render(<Forma tipo="casa" tamanho={360} niveis={3} tint="--mod-hoje" />)
    const camadas = camadasDe(container)
    expect(camadas).toHaveLength(3)
    // O núcleo é chapado: é ele que carrega a marca, não o contorno.
    expect(camadas[2]).toHaveAttribute(
      'fill',
      'color-mix(in oklab, var(--mod-hoje) 100%, transparent)',
    )
    // Pedir três a quem tem dois devolve dois — melhor que inventar um nível.
    const outro = render(<Forma tipo="funil" niveis={3} />)
    expect(camadasDe(outro.container)).toHaveLength(2)
  })

  /**
   * O fio é px de TELA, e é por isso que o degrau existe: o mesmo `d` serve o
   * selo de 24 e a marca de 360. Traço em unidade de viewBox sumiria num e
   * viraria borrão no outro.
   */
  it.each([
    [64, ['5', '4']],
    [120, ['4', '3']],
    [360, ['7', '6']],
  ])('em %ipx o fio é %s', (tamanho, esperado) => {
    const { container } = render(<Forma tipo="seta" tamanho={tamanho} />)
    const camadas = camadasDe(container)
    expect(camadas.map((p) => p.getAttribute('stroke-width'))).toEqual(esperado)
    expect(camadas[0]).toHaveAttribute('vector-effect', 'non-scaling-stroke')
    expect(pecaDe(container)).toHaveAttribute('width', String(tamanho))
  })

  it('respira move só a forma interna, e não respira por padrão', () => {
    const parada = render(<Forma tipo="circulo" />)
    expect(parada.container.querySelector('[data-respira]')).toBeNull()
    expect(parada.container.querySelector('style')).toBeNull()

    const viva = render(<Forma tipo="circulo" respira />)
    const camadas = camadasDe(viva.container)
    expect(camadas[0]).not.toHaveAttribute('data-respira')
    expect(camadas[1]).toHaveAttribute('data-respira')
    // O desligamento é do NAVEGADOR, não nosso: quem pediu menos movimento não
    // depende de a tela lembrar de perguntar.
    expect(viva.container.querySelector('style')?.textContent).toContain(
      '@media (prefers-reduced-motion:reduce)',
    )
  })
})

describe('FormaDoModulo', () => {
  it('sem router não desenha — decoração não pode exigir rota montada', () => {
    const { container } = render(<FormaDoModulo tamanho={64} />)
    expect(container.querySelector('[data-slot="forma"]')).toBeNull()
  })

  it('todo módulo tem forma e matiz, e a forma é uma das sete', () => {
    // A tabela é a fonte única — o vazio, o selo, o painel e o favicon leem
    // dela. Módulo sem entrada quebraria os quatro de uma vez, em silêncio.
    for (const [tipo, matiz] of Object.values(DO_MODULO)) {
      expect(TIPOS).toContain(tipo)
      expect(matiz).toMatch(/^[a-z]+$/)
    }
    expect(DO_MODULO.compras[0]).toBe('caixa')
  })
})
