import { renderWithQuery } from '@/test/utils'
import { describe, expect, it } from 'vitest'
import { Selo } from './selo'

// 2.0 (D3, #505): Selo passou a ser um Badge — sem papel por baixo nem elevação por tamanho;
// os dois testes dessas regras 1.x saíram no merge (Cowork, 2026-09-03).
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
})
