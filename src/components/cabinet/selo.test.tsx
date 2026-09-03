import { renderWithQuery } from '@/test/utils'
import { describe, expect, it } from 'vitest'
import { Selo } from './selo'

describe('Selo', () => {
  it('desenha a forma do módulo dentro da caixa', () => {
    const { container } = renderWithQuery(<Selo modulo="produtos" />)

    const selo = container.querySelector('[data-slot="selo"]')
    expect(selo).not.toBeNull()
    // Produtos é o quadrado, pela mesma tabela que o vazio e o favicon leem.
    expect(selo?.querySelector('[data-slot="forma"]')).toHaveAttribute('data-tipo', 'quadrado')
  })

  it('é decoração para o leitor de tela', () => {
    // O sentido está sempre no texto ao lado. Selo anunciado seria um rótulo
    // mudo — o leitor leria "imagem" e nada mais.
    const { container } = renderWithQuery(<Selo modulo="boletim" />)

    expect(container.querySelector('[data-slot="selo"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('leva papel branco por baixo da forma', () => {
    // É a razão de a peça existir: a forma pousa sobre superfície colorida, e
    // sem o papel o tint dela sumiria dentro da tinta da mesma matiz.
    const { container } = renderWithQuery(<Selo modulo="clientes" />)

    expect(container.querySelector('[data-slot="selo"]')).toHaveClass('bg-card')
  })

  it('o tamanho lg leva elevação, os menores não', () => {
    const grande = renderWithQuery(<Selo modulo="estoque" tamanho="lg" />)
    expect(grande.container.querySelector('[data-slot="selo"]')).toHaveClass('shadow-el1')

    const pequeno = renderWithQuery(<Selo modulo="estoque" tamanho="sm" />)
    expect(pequeno.container.querySelector('[data-slot="selo"]')).not.toHaveClass('shadow-el1')
  })
})
