import { renderWithQuery } from '@/test/utils'
import { describe, expect, it } from 'vitest'
import { Marca } from './marca'

describe('Marca', () => {
  // O corte de peso é o motivo de o componente existir: a versão com moldura é
  // ilegível abaixo de 64px, e quem pede a marca não deve ter de saber disso.
  it('abaixo de 64px usa o peso compacto, de 64 para cima o cheio', () => {
    const { container: pequena } = renderWithQuery(<Marca tamanho={28} />)
    const { container: grande } = renderWithQuery(<Marca tamanho={64} />)

    expect(pequena.querySelector('[data-slot="marca-simbolo"]')).toHaveAttribute(
      'data-peso',
      'compacta',
    )
    expect(grande.querySelector('[data-slot="marca-simbolo"]')).toHaveAttribute(
      'data-peso',
      'cheia',
    )
  })

  it('o compacto tem 2 níveis e o cheio 3 mais a moldura', () => {
    // Não são o mesmo desenho em duas espessuras: o compacto PERDE um nível e a
    // moldura, que é o que devolve o vão entre traços a 16px.
    const { container: pequena } = renderWithQuery(<Marca tamanho={28} />)
    const { container: grande } = renderWithQuery(<Marca tamanho={96} />)

    expect(pequena.querySelectorAll('[data-slot="marca-simbolo"] path')).toHaveLength(2)
    expect(grande.querySelectorAll('[data-slot="marca-simbolo"] path')).toHaveLength(4)
  })

  it('o traço sai do arquivo e a cor é herdada', () => {
    // `currentColor` é o que faz a marca virar no tema escuro. Um preto literal
    // sumiria na bancada escura sem quebrar teste nenhum.
    const { container } = renderWithQuery(<Marca tamanho={28} />)

    const simbolo = container.querySelector('[data-slot="marca-simbolo"]')
    expect(simbolo).toHaveAttribute('stroke', 'currentColor')
    expect(simbolo).toHaveAttribute('stroke-width', '9')
    expect(simbolo).toHaveAttribute('fill', 'none')
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
