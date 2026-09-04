import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MonogramaDoFunil, iniciaisDoFunil } from './monograma'
import { realceDosDias } from './quadro-do-funil'

/**
 * O cartão do funil 2.0: quem é o negócio (monograma) e há quanto tempo ele
 * está parado. As duas regras têm teste próprio porque as duas mentem em
 * silêncio se errarem — iniciais iguais para pessoas diferentes, e realce que
 * some justamente na etapa sem prazo configurado.
 */

function etapa(rotDays: number | null) {
  return {
    id: 'e1',
    pipelineId: 'f1',
    name: 'Contato',
    sort: 1,
    probability: 100_000,
    isWon: false,
    isLost: false,
    rotDays,
  }
}

describe('iniciaisDoFunil', () => {
  it('pega os dois primeiros termos', () => {
    expect(iniciaisDoFunil('Lívia Moreira')).toBe('LM')
    expect(iniciaisDoFunil('Henrique Ferro Silva')).toBe('HF')
  })

  it('razão social não vira as iniciais do sufixo — o defeito medido na tela', () => {
    // Primeiro+último daria `MM` aqui, e `CS` em "Construtora Horizonte SA".
    expect(iniciaisDoFunil('MARIA HELENA ARQUITETURA ME')).toBe('MH')
    expect(iniciaisDoFunil('Construtora Horizonte SA')).toBe('CH')
  })

  it('ignora termo de uma letra — a partícula não distingue ninguém', () => {
    expect(iniciaisDoFunil('Marina D Duarte')).toBe('MD')
  })

  it('nome de uma palavra dá uma letra, e vazio não quebra', () => {
    expect(iniciaisDoFunil('Construtora')).toBe('C')
    expect(iniciaisDoFunil('   ')).toBe('?')
  })
})

describe('MonogramaDoFunil', () => {
  it('mostra as iniciais e diz o nome inteiro a quem ouve', () => {
    renderWithQuery(<MonogramaDoFunil nome="Rafael Alves" />)

    expect(screen.getByText('RA')).toBeInTheDocument()
    // O nome inteiro continua legível — o monograma é reconhecimento, não
    // substituição do dado.
    expect(screen.getByText('Rafael Alves')).toBeInTheDocument()
  })
})

describe('realceDosDias', () => {
  it('não realça quando a EMPRESA configurou o prazo — quem fala ali é o selo', () => {
    expect(realceDosDias(40, etapa(7))).toBe(false)
  })

  it('sem prazo configurado, realça acima de 14 dias', () => {
    expect(realceDosDias(15, etapa(null))).toBe(true)
    expect(realceDosDias(14, etapa(null))).toBe(false)
  })

  it('coluna que não é etapa (agrupada por responsável) cai na mesma régua', () => {
    expect(realceDosDias(20, undefined)).toBe(true)
  })
})
