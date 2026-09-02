import { type AgrupamentoDeRelatorio, agrupar, somar } from '@/features/relatorios/agrupamento'
import { faixaDeDiasSemVenda, tomDaFaixa } from '@/features/relatorios/tela-estoque-parado'
import { describe, expect, it } from 'vitest'

/**
 * AS REGRAS DA QUEBRA — puras, exercitadas sem montar tela.
 *
 * O que cada caso trava:
 *
 * 1. **Sem `ordem`, os grupos saem na ordem em que apareceram.** Ordenar por
 *    nome aqui desfaria o `sortBy` que o operador acabou de clicar no cabeçalho:
 *    ele pediu "as maiores primeiro" e receberia "em ordem alfabética de tipo".
 * 2. **Com `ordem`, ela manda — e chave imprevista vai para o FIM**, não para o
 *    começo. O grupo que o domínio não previu é o que menos merece o topo.
 * 3. **Grupo inteiro sem valor soma `null`, não zero.** Um bloco de itens sem
 *    preço somando "R$ 0,00" afirmaria que aquele estoque não vale nada, quando
 *    o que se sabe dele é que não se sabe.
 * 4. **"Nunca vendeu" não é a faixa mais alta de dias**, é faixa própria: o item
 *    que nunca vendeu pode ter entrado ontem.
 */

interface Linha {
  id: string
  tipo: string | null
  valor: number | null
}

const POR_TIPO: AgrupamentoDeRelatorio<Linha> = {
  id: 'tipo',
  rotulo: 'Tipo',
  chave: (linha) => linha.tipo ?? 'Sem tipo',
}

describe('agrupar', () => {
  it('sem `ordem`, respeita a ordem em que os grupos apareceram', () => {
    const grupos = agrupar<Linha>(
      [
        { id: 'a', tipo: 'TRILHO', valor: 1 },
        { id: 'b', tipo: 'PENDENTE', valor: 2 },
        { id: 'c', tipo: 'TRILHO', valor: 3 },
      ],
      POR_TIPO,
    )

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['TRILHO', 'PENDENTE'])
    expect(grupos[0]?.linhas.map((linha) => linha.id)).toEqual(['a', 'c'])
  })

  it('a chave nula tem grupo próprio e nome por extenso', () => {
    const grupos = agrupar<Linha>(
      [
        { id: 'a', tipo: null, valor: 1 },
        { id: 'b', tipo: 'PENDENTE', valor: 2 },
      ],
      POR_TIPO,
    )

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['Sem tipo', 'PENDENTE'])
  })

  it('com `ordem`, ela manda — e a chave imprevista vai para o FIM', () => {
    const grupos = agrupar<Linha>(
      [
        { id: 'a', tipo: 'OUTRO', valor: 1 },
        { id: 'b', tipo: 'B', valor: 2 },
        { id: 'c', tipo: 'A', valor: 3 },
      ],
      { ...POR_TIPO, ordem: ['A', 'B'] },
    )

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['A', 'B', 'OUTRO'])
  })

  it('o tom do grupo vem da regra, e o padrão é neutro', () => {
    const grupos = agrupar<Linha>([{ id: 'a', tipo: 'A', valor: 1 }], {
      ...POR_TIPO,
      tom: (chave) => (chave === 'A' ? 'bad' : 'neutro'),
    })

    expect(grupos[0]?.tom).toBe('bad')
    expect(agrupar<Linha>([{ id: 'a', tipo: 'A', valor: 1 }], POR_TIPO)[0]?.tom).toBe('neutro')
  })
})

describe('somar', () => {
  it('ignora quem não tem valor, mas soma quem tem', () => {
    expect(
      somar<Linha>(
        [
          { id: 'a', tipo: null, valor: 100 },
          { id: 'b', tipo: null, valor: null },
          { id: 'c', tipo: null, valor: 50 },
        ],
        (linha) => linha.valor,
      ),
    ).toBe(150)
  })

  it('grupo INTEIRO sem valor devolve null, não zero', () => {
    // Zero afirmaria que o estoque não vale nada; null diz que não se sabe.
    expect(somar<Linha>([{ id: 'a', tipo: null, valor: null }], (linha) => linha.valor)).toBeNull()
  })
})

describe('faixa de dias sem venda', () => {
  it('os três cortes da issue, e o resto embaixo', () => {
    expect(faixaDeDiasSemVenda(30)).toBe('Até 90 dias')
    expect(faixaDeDiasSemVenda(90)).toBe('Até 90 dias')
    expect(faixaDeDiasSemVenda(91)).toBe('Mais de 90 dias')
    expect(faixaDeDiasSemVenda(181)).toBe('Mais de 180 dias')
    expect(faixaDeDiasSemVenda(366)).toBe('Mais de 365 dias')
  })

  it('nulo é NUNCA VENDEU, e não "infinitos dias parado"', () => {
    // O item que nunca vendeu pode ter entrado ontem — enfiá-lo na faixa mais
    // alta o transformaria em "parado há muito tempo".
    expect(faixaDeDiasSemVenda(null)).toBe('Nunca vendeu')
    expect(faixaDeDiasSemVenda(undefined)).toBe('Nunca vendeu')
  })

  it('a decoração acompanha a gravidade, e o nunca-vendeu vai com a pior', () => {
    expect(tomDaFaixa('Até 90 dias')).toBe('neutro')
    expect(tomDaFaixa('Mais de 90 dias')).toBe('neutro')
    expect(tomDaFaixa('Mais de 180 dias')).toBe('warn')
    expect(tomDaFaixa('Mais de 365 dias')).toBe('bad')
    expect(tomDaFaixa('Nunca vendeu')).toBe('bad')
  })
})
