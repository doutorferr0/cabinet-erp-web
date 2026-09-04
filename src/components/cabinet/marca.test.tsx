import { renderWithQuery } from '@/test/utils'
import { describe, expect, it } from 'vitest'
import { Marca } from './marca'

describe('Marca', () => {
  // O degrau de espessura é o motivo de o componente existir: a mesma casa a
  // 16px e a 96px pede traços diferentes, e quem pede a marca não deve ter de
  // saber disso.
  it('escolhe a espessura pelo tamanho, em três degraus', () => {
    const pesoDe = (tamanho: number) =>
      renderWithQuery(<Marca tamanho={tamanho} />)
        .container.querySelector('[data-slot="marca-simbolo"]')
        ?.getAttribute('data-peso')

    expect(pesoDe(16)).toBe('grossa')
    expect(pesoDe(28)).toBe('grossa')
    expect(pesoDe(40)).toBe('media')
    expect(pesoDe(64)).toBe('media')
    expect(pesoDe(96)).toBe('fina')
  })

  it('é UM desenho de duas casas, e o traço mora no caminho', () => {
    // Era um par de arquivos (3 níveis + moldura acima de 64px, 2 níveis
    // abaixo), porque o desenho antigo não sobrevivia à redução. O da 2.0 é
    // um só: o que muda é a espessura, e ela vai em cada `path` — no `<svg>`
    // ela seria uma só para as duas casas, e a de dentro engordaria junto.
    const { container: pequena } = renderWithQuery(<Marca tamanho={28} />)
    const { container: grande } = renderWithQuery(<Marca tamanho={96} />)

    const caminhos = (raiz: HTMLElement) => [
      ...raiz.querySelectorAll('[data-slot="marca-simbolo"] path'),
    ]
    expect(caminhos(pequena)).toHaveLength(2)
    expect(caminhos(grande)).toHaveLength(2)
    expect(caminhos(pequena).map((p) => p.getAttribute('stroke-width'))).toEqual(['11', '9'])
    expect(caminhos(grande).map((p) => p.getAttribute('stroke-width'))).toEqual(['6', '5'])
  })

  it('a cor é herdada e o desenho é vazado', () => {
    // `currentColor` é o que faz a marca virar no tema escuro. Um valor literal
    // sumiria na bancada escura sem quebrar teste nenhum.
    const { container } = renderWithQuery(<Marca tamanho={28} />)

    const simbolo = container.querySelector('[data-slot="marca-simbolo"]')
    expect(simbolo).toHaveAttribute('stroke', 'currentColor')
    expect(simbolo).toHaveAttribute('fill', 'none')
    // Canto vivo: a casa é reta, e `round` a 16px arredonda a cumeeira.
    expect(simbolo).toHaveAttribute('stroke-linejoin', 'miter')
  })

  it('a assinatura leva símbolo e nome, com um único rótulo', () => {
    // Dois elementos rotulados "Cabinet" lado a lado fariam o leitor de tela
    // anunciar o produto duas vezes na primeira parada da barra.
    const { container } = renderWithQuery(<Marca variante="assinatura" tamanho={28} />)

    const marca = container.querySelector('[data-slot="marca"]')
    expect(marca).toHaveAttribute('role', 'img')
    expect(marca).toHaveAttribute('aria-label', 'Cabinet')
    expect(marca?.querySelector('[data-slot="marca-simbolo"]')).not.toBeNull()
    expect(marca?.querySelector('[data-slot="marca-nome"]')).not.toBeNull()
    expect(container.querySelectorAll('[aria-label="Cabinet"]')).toHaveLength(1)
  })

  it('o nome recebe a classe de quem hospeda — some por CSS, não por render', () => {
    // A barra colapsada anima a largura; desmontar o wordmark no meio da
    // transição faria a assinatura pular.
    const { container } = renderWithQuery(
      <Marca
        variante="assinatura"
        tamanho={28}
        classeDoNome="group-data-[collapsible=icon]:hidden"
      />,
    )

    expect(container.querySelector('[data-slot="marca-nome"]')).toHaveClass(
      'group-data-[collapsible=icon]:hidden',
    )
  })

  it('a variante nome não desenha o símbolo, e é deitada', () => {
    const { container } = renderWithQuery(<Marca variante="nome" tamanho={20} />)

    const nome = container.querySelector('[data-slot="marca-nome"]')
    expect(container.querySelector('[data-slot="marca-simbolo"]')).toBeNull()
    expect(nome).toHaveAttribute('height', '20')
    // ~4,08:1 — o wordmark é largo, e a altura é que manda.
    expect(Number(nome?.getAttribute('width'))).toBeGreaterThan(60)
  })
})
