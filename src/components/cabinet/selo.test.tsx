import { renderWithQuery } from '@/test/utils'
import { describe, expect, it } from 'vitest'
import { Selo } from './selo'

describe('Selo', () => {
  it('desenha o shape do módulo dentro da caixa', () => {
    const { container } = renderWithQuery(<Selo shape="produtos" />)

    const selo = container.querySelector('[data-slot="selo"]')
    expect(selo).not.toBeNull()
    expect(selo?.querySelector('[data-slot="ornamento"]')).toHaveAttribute('data-shape', 'produtos')
  })

  it('é decoração para o leitor de tela', () => {
    // O sentido está sempre no texto ao lado. Selo anunciado seria um rótulo
    // mudo — o leitor leria "imagem" e nada mais.
    const { container } = renderWithQuery(<Selo shape="boletim" />)

    expect(container.querySelector('[data-slot="selo"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('leva papel branco por baixo do shape', () => {
    // É a razão de a peça existir: o ornamento pousa sobre superfície colorida,
    // e sem o papel a cheia /01 sumiria dentro da pastel /02 da mesma matiz.
    const { container } = renderWithQuery(<Selo shape="clientes" />)

    expect(container.querySelector('[data-slot="selo"]')).toHaveClass('bg-card')
  })

  it('o tamanho lg leva elevação, os menores não', () => {
    const grande = renderWithQuery(<Selo shape="estoque" tamanho="lg" />)
    expect(grande.container.querySelector('[data-slot="selo"]')).toHaveClass('shadow-el1')

    const pequeno = renderWithQuery(<Selo shape="estoque" tamanho="sm" />)
    expect(pequeno.container.querySelector('[data-slot="selo"]')).not.toHaveClass('shadow-el1')
  })
})
