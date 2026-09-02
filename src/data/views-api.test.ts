import type { SavedViewDto } from '@/api/gerado'
import { corpoDaView, viewsDaRota, viewsFavoritas } from '@/data/views-api'
import { describe, expect, it } from 'vitest'

/**
 * A FRONTEIRA das views salvas — o que o servidor recebe e o que a barra lê.
 *
 * Duas coisas se travam aqui, e as duas falham em silêncio na tela:
 *
 * 1. **`corpoDaView` parte da view INTEIRA.** `PUT` substitui o registro, então
 *    renomear mandando `{ name }` sozinho apagaria filtros, cor e a estrela — e
 *    o operador só descobriria na segunda-feira seguinte, ao abrir a consulta
 *    salva e encontrar a lista inteira.
 * 2. **A ordem tem desempate.** `position` é opcional no DTO; sem o `name` como
 *    segundo critério, duas views sem posição trocariam de lugar entre dois
 *    carregamentos, e o operador clicaria na errada por memória muscular.
 */

function view(parcial: Partial<SavedViewDto> & { id: string; name: string }): SavedViewDto {
  return {
    route: '/compras/ordens',
    color: 'neutro',
    filters: [],
    joinOperator: 'and',
    sortBy: null,
    sortDesc: false,
    groupBy: '',
    columns: [],
    mode: '',
    favorite: false,
    ...parcial,
  }
}

const ATRASADAS = view({
  id: 'v1',
  name: 'Atrasadas',
  color: 'amber',
  favorite: true,
  filters: [{ field: 'status', operator: 'eq', value: 'late' }],
  joinOperator: 'or',
  sortBy: 'code',
  sortDesc: true,
  mode: 'quadro',
  position: 1,
})

describe('corpo de escrita da view', () => {
  it('renomear preserva filtros, cor, visão e a estrela', () => {
    const corpo = corpoDaView(ATRASADAS, { name: 'Atrasadas de verdade' })

    expect(corpo.name).toBe('Atrasadas de verdade')
    expect(corpo.filters).toEqual([{ field: 'status', operator: 'eq', value: 'late' }])
    expect(corpo).toMatchObject({
      color: 'amber',
      favorite: true,
      joinOperator: 'or',
      sortBy: 'code',
      sortDesc: true,
      mode: 'quadro',
    })
  })

  it('não manda o id no corpo — ele é da URL, e o dono é a sessão', () => {
    expect(corpoDaView(ATRASADAS)).not.toHaveProperty('id')
  })

  it('favoritar troca só a estrela', () => {
    expect(corpoDaView(ATRASADAS, { favorite: false })).toMatchObject({
      favorite: false,
      name: 'Atrasadas',
      color: 'amber',
    })
  })
})

describe('recorte das listas', () => {
  const OUTRA_TELA = view({ id: 'v2', name: 'Semana', route: '/vendas/orcamentos', favorite: true })
  const SEM_POSICAO_B = view({ id: 'v3', name: 'Bravo' })
  const SEM_POSICAO_A = view({ id: 'v4', name: 'Alfa' })
  const TODAS = [ATRASADAS, OUTRA_TELA, SEM_POSICAO_B, SEM_POSICAO_A]

  it('a tela vê só as suas', () => {
    expect(viewsDaRota(TODAS, '/compras/ordens').map((v) => v.id)).toEqual(['v4', 'v3', 'v1'])
  })

  it('os FAVORITOS atravessam telas — é a barra lateral, não a listagem', () => {
    expect(viewsFavoritas(TODAS).map((v) => v.route)).toEqual([
      '/vendas/orcamentos',
      '/compras/ordens',
    ])
  })

  it('resposta que não é lista vira lista vazia — a barra não pode cair com a tela', () => {
    // Medido na suíte: um teste de outra tela respondia `{rows, total}` a
    // qualquer caminho, o `filter` estourou dentro do grupo de favoritos e
    // apagou a tela que estava sendo testada. A barra monta em cima de tudo.
    expect(viewsFavoritas({ rows: [], total: 0 } as never)).toEqual([])
    expect(viewsDaRota(undefined as never, '/compras/ordens')).toEqual([])
  })

  it('sem posição, o nome decide — e não a ordem em que vieram', () => {
    expect(
      viewsDaRota([SEM_POSICAO_B, SEM_POSICAO_A], '/compras/ordens').map((v) => v.name),
    ).toEqual(['Alfa', 'Bravo'])
  })
})
