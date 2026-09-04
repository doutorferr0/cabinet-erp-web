import { CartaoLateral } from '@/components/cabinet/cartao-lateral'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * CARTÃO LATERAL (Reface 2.0, D18).
 *
 * O que se prova aqui é o que a §Hierarquia cobra: o tint é do CARTÃO (região
 * por natureza), o título é `--t-bloco` e não um Gambarino a mais na tela, e o
 * par rótulo+valor é `dl` de verdade — rótulo solto ao lado de valor solto lê
 * como duas colunas de texto para quem ouve.
 */
describe('CartaoLateral', () => {
  it('é uma região nomeada pelo título — a coluna tem quatro delas', () => {
    render(<CartaoLateral titulo="Transportadora" tint="sky" />)

    // `aria-label` no `section`: sem nome, quatro cartões viram quatro regiões
    // idênticas na lista de landmarks.
    expect(screen.getByRole('region', { name: 'Transportadora' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transportadora' })).toBeInTheDocument()
  })

  it('declara o assunto no cartão, não no texto de dentro', () => {
    render(<CartaoLateral titulo="Pagamento" tint="sand" />)

    const cartao = screen.getByRole('region', { name: 'Pagamento' })
    // `data-tint` é o que a captura e o teste leem; a classe de fundo pode
    // trocar de alias (`--zone-*` hoje, `--tint-*` depois da D30) sem que a
    // promessa "este cartão é do assunto financeiro" mude.
    expect(cartao.dataset.tint).toBe('sand')
  })

  it('liga rótulo e valor num par, não em duas listas paralelas', () => {
    render(
      <CartaoLateral
        titulo="Fornecedor"
        tint="lilac"
        pares={[
          { rotulo: 'Nome', valor: 'Metalúrgica Aurora' },
          { rotulo: 'Faturamento mínimo', valor: 'R$ 1.200,00' },
        ]}
      />,
    )

    const cartao = screen.getByRole('region', { name: 'Fornecedor' })
    const termos = within(cartao).getAllByRole('term')
    expect(termos.map((termo) => termo.textContent)).toEqual(['Nome', 'Faturamento mínimo'])
    expect(within(cartao).getByText('Metalúrgica Aurora')).toBeInTheDocument()
  })

  it('não desenha a lista de pares quando não há par nenhum', () => {
    render(
      <CartaoLateral titulo="Andamento" tint="mint">
        <p>miolo</p>
      </CartaoLateral>,
    )

    const cartao = screen.getByRole('region', { name: 'Andamento' })
    expect(within(cartao).queryAllByRole('term')).toHaveLength(0)
    expect(within(cartao).getByText('miolo')).toBeInTheDocument()
  })
})
