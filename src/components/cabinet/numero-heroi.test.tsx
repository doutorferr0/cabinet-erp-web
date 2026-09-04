import { NumeroHeroi } from '@/components/cabinet/numero-heroi'
import { TotalBox } from '@/components/cabinet/total-box'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * NÚMERO-HERÓI (#236): o display condensado que o número do documento e o
 * total compartilham. O que estes casos guardam não é a aparência — é o
 * MOTIVO de ela ser assim, que some junto quando alguém "só ajusta o
 * tamanho".
 */
describe('NumeroHeroi', () => {
  it('fala pelo TOKEN, nunca pelo nome da fonte', () => {
    render(<NumeroHeroi escala="total">1.234</NumeroHeroi>)
    const n = screen.getByText('1.234')
    expect(n.className).toContain('font-[family-name:var(--font-display-condensada)]')
    // Nome de fonte escrito na tela é a família fora do token — e a 2.0 provou
    // o custo: a pilha inteira trocou em #469, e esta peça continuou certa
    // porque pede um token. Se pedisse a fonte pelo nome, continuaria pedindo
    // uma família que o `package.json` já não instala, em silêncio.
    expect(n.className).not.toMatch(/font-\[['"]/)
  })

  it('declara tabular-nums mesmo quando a família já é tabular', () => {
    render(<NumeroHeroi escala="total">R$ 9.999,99</NumeroHeroi>)
    // A condensada original publicava `tnum` e tinha avanço uniforme (medido em
    // docs/design/medir-tabular.py). Quem NÃO foi medido é o fallback da pilha.
    // Sem esta classe, o total mudaria de largura enquanto o operador digita os
    // itens, na máquina que não tiver a família de display.
    expect(screen.getByText('R$ 9.999,99').className).toContain('tabular-nums')
  })

  it('as escalas são as do desenho: 36 no documento, 48 no total, 38 no cartão', () => {
    const { rerender } = render(<NumeroHeroi escala="documento">184</NumeroHeroi>)
    expect(screen.getByText('184').className).toContain('text-[2.25rem]')

    rerender(<NumeroHeroi escala="total">184</NumeroHeroi>)
    expect(screen.getByText('184').className).toContain('text-[3rem]')

    // 38px, e não 36: o cartão de indicador já falava em condensada com essa
    // medida solta na tela (r7). Recolher a medida não é arredondá-la.
    rerender(<NumeroHeroi escala="cartao">184</NumeroHeroi>)
    expect(screen.getByText('184').className).toContain('text-[2.375rem]')
  })

  it('a escala é fechada — não há tamanho livre para cada tela escolher', () => {
    // Guarda de TIPO, e é o ponto do componente: `size` aberto traria de volta
    // três documentos com três âncoras diferentes, que é a deriva que a fusão
    // v5 fechou. Se alguém acrescentar uma escala, este caso obriga a decidir
    // aqui, no lugar onde o desenho mora.
    // @ts-expect-error — 'grande' não é escala do desenho.
    render(<NumeroHeroi escala="grande">9</NumeroHeroi>)
    expect(screen.getByText('9')).toBeInTheDocument()
  })
})

/**
 * FECHO do documento (#236): o total fora da malha. O bloco é o que torna os
 * 48px possíveis — dentro da grade, o alinhamento quebrava por TAMANHO.
 */
describe('TotalBox', () => {
  it('é o número-herói na escala do total, com rótulo em Meta', () => {
    render(<TotalBox valorCentavos={100_000} />)
    const saida = screen.getByLabelText('Total')
    expect(saida).toHaveTextContent('1.000,00')
    expect(saida.firstElementChild?.className).toContain('text-[3rem]')
    expect(screen.getByText('Total:').className).toContain('font-mono')
  })

  it('negativo escreve em vermelho — a convenção do ledger vale no fecho', () => {
    render(<TotalBox valorCentavos={-5000} />)
    const valor = screen.getByLabelText('Total').firstElementChild
    expect(valor?.className).toContain('text-destructive')
    expect(valor?.className).not.toContain('text-money')
  })

  it('positivo escreve na tinta de dinheiro sobre o lima', () => {
    render(<TotalBox valorCentavos={5000} />)
    expect(screen.getByLabelText('Total').firstElementChild?.className).toContain('text-money')
  })

  it('o rótulo é o NOME acessível do valor, não texto solto ao lado', () => {
    // Sem o `aria-label` no `<output>`, o leitor de tela anuncia "mil reais"
    // sem dizer de quê — e o fecho é justamente o dado que a tela existe para
    // responder.
    render(<TotalBox label="Total geral" valorCentavos={1} />)
    expect(screen.getByLabelText('Total geral')).toHaveTextContent('0,01')
  })
})
