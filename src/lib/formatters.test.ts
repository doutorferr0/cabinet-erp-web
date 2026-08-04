import {
  PERCENT_ESCALA,
  formatDateBR,
  formatMoneyBRL,
  formatPercent,
  formatQuantidade,
  parseQuantidade,
} from '@/lib/formatters'
import { describe, expect, it } from 'vitest'

/** Regras de borda do CLAUDE.md: centavos int, ISO no dado, pt-BR na exibição. */
describe('formatMoneyBRL', () => {
  it('formata centavos em real, sem float no dado', () => {
    //   = espaço não separável que o Intl usa depois de "R$".
    expect(formatMoneyBRL(8990)).toBe('R$ 89,90')
    expect(formatMoneyBRL(0)).toBe('R$ 0,00')
    expect(formatMoneyBRL(100)).toBe('R$ 1,00')
  })

  it('formata valor negativo (desconto maior que o subtotal)', () => {
    expect(formatMoneyBRL(-500)).toContain('5,00')
    expect(formatMoneyBRL(-500).startsWith('-')).toBe(true)
  })

  it('mantém a precisão de centavos em valores grandes', () => {
    expect(formatMoneyBRL(123_456_789)).toBe('R$ 1.234.567,89')
  })
})

describe('formatDateBR', () => {
  it('converte ISO para pt-BR', () => {
    expect(formatDateBR('2025-08-05')).toBe('05/08/2025')
  })

  it('devolve vazio para nulo/indefinido — coluna sem data', () => {
    expect(formatDateBR(null)).toBe('')
    expect(formatDateBR(undefined)).toBe('')
    expect(formatDateBR('')).toBe('')
  })
})

describe('formatPercent', () => {
  it('usa as 4 casas do legado (§8.2 mostra 0,0010 %)', () => {
    expect(formatPercent(10)).toBe('0,0010')
    expect(formatPercent(PERCENT_ESCALA)).toBe('1,0000')
    expect(formatPercent(10 * PERCENT_ESCALA)).toBe('10,0000')
    expect(formatPercent(0)).toBe('0,0000')
  })
})

describe('parseQuantidade', () => {
  it('lê o pt-BR que a grade digita', () => {
    expect(parseQuantidade('2')).toBe(2)
    expect(parseQuantidade('2,5')).toBe(2.5)
    expect(parseQuantidade('1.234,5')).toBe(1234.5)
  })

  // Ausência não é zero: 'estoque mínimo 0' é uma regra, 'não definido' é outra.
  it('vazio é null, não 0', () => {
    expect(parseQuantidade('')).toBeNull()
    expect(parseQuantidade('   ')).toBeNull()
  })

  // `undefined` para texto inválido é o que impede o formulário de mandar
  // 'sem valor' ao servidor por causa de um erro de digitação.
  it('texto que não é número é undefined, distinto de vazio', () => {
    expect(parseQuantidade('1o2')).toBeUndefined()
    expect(parseQuantidade('abc')).toBeUndefined()
  })

  it('é a inversa da formatQuantidade nos casos do contrato', () => {
    expect(parseQuantidade(formatQuantidade(12.5))).toBe(12.5)
    expect(parseQuantidade(formatQuantidade(null))).toBeNull()
  })
})
