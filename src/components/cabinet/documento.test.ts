import { parseQuantidade, totalItemCentavos } from '@/components/cabinet/documento'
import { PERCENT_ESCALA } from '@/lib/formatters'
import { describe, expect, it } from 'vitest'

/**
 * Núcleo de cálculo dos documentos (§9 padrão 6). O total NUNCA é campo do
 * form — é derivado daqui, então este é o ponto que precisa estar certo.
 */
describe('parseQuantidade', () => {
  it('aceita o texto do input, com vírgula ou ponto', () => {
    expect(parseQuantidade('3')).toBe(3)
    expect(parseQuantidade('2,5')).toBe(2.5)
    expect(parseQuantidade('2.5')).toBe(2.5)
    expect(parseQuantidade(4)).toBe(4)
  })

  it('trata vazio e lixo como zero em vez de NaN', () => {
    expect(parseQuantidade('')).toBe(0)
    expect(parseQuantidade('   ')).toBe(0)
    expect(parseQuantidade('abc')).toBe(0)
    expect(parseQuantidade(null)).toBe(0)
    expect(parseQuantidade(undefined)).toBe(0)
  })
})

describe('totalItemCentavos', () => {
  it('multiplica quantidade por unitário', () => {
    expect(totalItemCentavos({ quantidade: '3', valorUnitarioCentavos: 10_000 })).toBe(30_000)
  })

  it('aplica o desconto da linha em percentual de 4 casas', () => {
    // 10,0000 % sobre R$ 200,00 = R$ 180,00
    expect(
      totalItemCentavos({
        quantidade: '1',
        valorUnitarioCentavos: 20_000,
        descontoPercentual: 10 * PERCENT_ESCALA,
      }),
    ).toBe(18_000)
  })

  it('arredonda para centavo inteiro — nunca sobra fração', () => {
    const total = totalItemCentavos({
      quantidade: '3',
      valorUnitarioCentavos: 3_333,
      descontoPercentual: PERCENT_ESCALA / 3,
    })
    expect(Number.isInteger(total)).toBe(true)
  })

  it('quantidade com 3 casas (limite do CLAUDE.md) mantém total inteiro', () => {
    const total = totalItemCentavos({ quantidade: '1,125', valorUnitarioCentavos: 10_000 })
    expect(total).toBe(11_250)
    expect(Number.isInteger(total)).toBe(true)
  })

  it('linha em branco vale zero, não quebra o subtotal', () => {
    expect(totalItemCentavos({})).toBe(0)
    expect(totalItemCentavos({ quantidade: '', valorUnitarioCentavos: null })).toBe(0)
  })
})
