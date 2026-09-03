import { EsqueletoDeCarregamento } from '@/components/cabinet/estado-de-consulta'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O ESQUELETO DA FOLHA (#201) — nove telas de detalhe carregam por aqui.
 *
 * Um retângulo cinza de 64 de altura não é esqueleto: é uma mancha do tamanho
 * errado, que o formulário substitui por cabeçalho, abas e duas colunas de
 * campo. O esqueleto existe para reservar o lugar do que vem — se o lugar não
 * bate, ele só adianta o salto.
 */
describe('EsqueletoDeCarregamento', () => {
  it('anuncia o carregamento a quem ouve a tela', () => {
    render(<EsqueletoDeCarregamento />)
    // As barras são decoração; quem informa é o texto. Sem ele o leitor de tela
    // encontra uma região que mudou e não tem o que dizer sobre ela.
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('tem a forma da folha: cabeçalho, abas e campos em duas colunas', () => {
    render(<EsqueletoDeCarregamento />)
    const esqueleto = screen.getByRole('status')

    expect(within(esqueleto).getByTestId('esqueleto-cabecalho')).toBeInTheDocument()
    expect(within(esqueleto).getByTestId('esqueleto-abas')).toBeInTheDocument()
    // Par rótulo+campo, que é a unidade do formulário — não uma barra por
    // linha inteira.
    expect(within(esqueleto).getAllByTestId('esqueleto-campo').length).toBeGreaterThanOrEqual(6)
  })

  it('reserva a coluna lateral, que a folha 2.0 tem e a 1.x não tinha', () => {
    render(<EsqueletoDeCarregamento />)
    const esqueleto = screen.getByRole('status')

    // Sem esta coluna a lateral apareceria de repente e empurraria o documento
    // inteiro para a esquerda no instante em que a consulta responde — o salto
    // que o esqueleto existe para evitar.
    const lateral = within(esqueleto).getByTestId('esqueleto-lateral')
    expect(within(lateral).getAllByTestId('esqueleto-cartao')).toHaveLength(4)
  })
})
