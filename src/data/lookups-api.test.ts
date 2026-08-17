import { nomeDoLookup } from '@/data/lookups-api'
import { describe, expect, it } from 'vitest'

/**
 * A FRONTEIRA DAS LISTAS DE APOIO, depois da migração para `value=id` (#94).
 *
 * Este arquivo cobria `resolverIdDoLookup` — a tradução nome→id que rodava no
 * submit, com cinco casos: nome único, nome AMBÍGUO (dois homônimos), nome fora
 * da lista, nome vazio e espaço nas bordas. **Os cinco deixaram de existir**,
 * não de ser testados: o combo escolhe por id, e não há mais um passo entre a
 * escolha e a gravação onde um nome possa virar o id errado.
 *
 * O que sobrou é o caminho inverso, e ele é só de EXIBIÇÃO: dado um id, qual
 * nome mostrar. Errar aqui mostra o rótulo errado; errar na tradução antiga
 * gravava o registro errado. É outra classe de risco, e é por isso que ela pode
 * ser simples.
 */
describe('nomeDoLookup', () => {
  const opcoes = [
    { id: 'lk-MARCA-1', nome: 'EVOLED' },
    { id: 'lk-MARCA-2', nome: 'STELLA' },
  ]

  it('acha o nome do id que está na lista', () => {
    expect(nomeDoLookup(opcoes, 'lk-MARCA-2')).toBe('STELLA')
  })

  it('devolve `undefined` para id fora da lista — e isso NÃO é erro', () => {
    // Item desativado depois de gravado, ou lista cortada no teto de 100. Quem
    // exibe decide o que pôr no lugar (o `LookupCombo` põe o rótulo que o
    // registro trouxe); o que não se faz é apagar o valor por não saber o nome.
    expect(nomeDoLookup(opcoes, 'lk-MARCA-99')).toBeUndefined()
  })

  it('sem id, não há nome — campo vazio é escolha legítima', () => {
    expect(nomeDoLookup(opcoes, null)).toBeUndefined()
    expect(nomeDoLookup(opcoes, '')).toBeUndefined()
  })

  it('homônimo deixou de ser problema: escolhe pelo id, não pelo nome', () => {
    // O caso que derrubava a tradução antiga. Aqui os dois convivem e cada id
    // acha o SEU rótulo — que é o ponto inteiro da issue #94.
    const comHomonimo = [
      { id: 'lk-MARCA-1', nome: 'STELLA' },
      { id: 'lk-MARCA-7', nome: 'STELLA' },
    ]
    expect(nomeDoLookup(comHomonimo, 'lk-MARCA-7')).toBe('STELLA')
    expect(nomeDoLookup(comHomonimo, 'lk-MARCA-1')).toBe('STELLA')
  })
})
