import { Money } from '@/components/cabinet/money'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * MONEY — o valor com o símbolo em peso menor (#471, D3).
 *
 * O que estes testes travam: o `R$` existe mas não compete com o número, o
 * negativo nunca fala só por cor, e o valor é sempre mono tabular — sem isso a
 * coluna de valores perde o alinhamento vertical, que é o único motivo de ela
 * existir.
 */
function valorDe(el: HTMLElement) {
  return el.querySelector('[data-slot="money-valor"]')?.textContent
}

describe('Money', () => {
  it('separa o símbolo do número e recua o símbolo', () => {
    const { container } = render(<Money valor={123456} />)
    const money = container.querySelector('[data-slot="money"]') as HTMLElement
    const simbolo = money.querySelector('[data-slot="money-simbolo"]') as HTMLElement

    expect(simbolo.textContent).toBe('R$')
    // Peso 400 e tinta secundária: o símbolo se repete em toda linha da coluna
    // e não carrega informação depois da primeira.
    expect(simbolo.className).toContain('font-normal')
    expect(simbolo.className).toContain('[color:var(--n-500)]')
    expect(valorDe(money)).toBe('1.234,56')
  })

  it('o número é mono tabular — é o que alinha a coluna', () => {
    const { container } = render(<Money valor={500} />)
    const money = container.querySelector('[data-slot="money"]') as HTMLElement

    // `.t-dado` é o degrau da §Hierarquia para valor: mono 500 12.5 tabular.
    expect(money.className).toContain('t-dado')
    // O valor da espec da issue: 500 centavos = R$ 5,00.
    expect(valorDe(money)).toBe('5,00')
  })

  it('negativo leva cor E sinal, e o sinal fica colado ao dígito', () => {
    const { container } = render(<Money valor={-123456} />)
    const money = container.querySelector('[data-slot="money"]') as HTMLElement

    expect(money.className).toContain('[color:var(--bad)]')
    expect(money).toHaveAttribute('data-negativo', 'true')
    // "Sem sinal solto": nada de `-R$ 1.234,56`, com o menos a três caracteres
    // do número que ele nega. E é o menos tipográfico (U+2212), que tem a
    // largura do dígito — o hífen desalinharia a coluna tabular inteira.
    expect(valorDe(money)).toBe('−1.234,56')
    expect(valorDe(money)).not.toContain('-')
  })

  it('positivo não é vermelho nem ganha sinal', () => {
    const { container } = render(<Money valor={1} />)
    const money = container.querySelector('[data-slot="money"]') as HTMLElement

    // Sem sobrescrita de cor: a tinta é a n-900 que o próprio `.t-dado` traz.
    expect(money.className).not.toContain('[color:var(--bad)]')
    expect(money).not.toHaveAttribute('data-negativo')
    expect(valorDe(money)).toBe('0,01')
  })

  it('centavos "leve" recua só os centavos, e o padrão não recua nada', () => {
    const { container } = render(<Money valor={123456} centavos="leve" />)
    const leve = container.querySelector('[data-slot="money-centavos"]') as HTMLElement
    expect(leve.textContent).toBe(',56')
    expect(leve.className).toContain('[color:var(--n-500)]')

    const outro = render(<Money valor={123456} />)
    const normal = outro.container.querySelector('[data-slot="money-centavos"]') as HTMLElement
    // No KPI o centavo é ruído; na célula de listagem, quem confere uma nota
    // confere o centavo.
    expect(normal.className).not.toContain('[color:var(--n-500)]')
  })

  it('riscado marca o valor que existiu e não vale mais', () => {
    const { container } = render(<Money valor={1000} riscado />)
    const money = container.querySelector('[data-slot="money"]') as HTMLElement

    expect(money).toHaveAttribute('data-riscado', 'true')
    expect(money.className).toContain('line-through')
  })

  it('centavos entram inteiros, sem float em lugar nenhum', () => {
    // Dinheiro trafega em centavos (int) — CLAUDE.md §Convenções. O caso que
    // pegaria float: 1099 centavos que viram 10,99 e não 10,98999…
    const { container } = render(<Money valor={1099} />)
    expect(valorDe(container.querySelector('[data-slot="money"]') as HTMLElement)).toBe('10,99')
  })
})
