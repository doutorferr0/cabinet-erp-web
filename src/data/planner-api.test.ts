import type { ProjectPlanDto } from '@/api/gerado'
import { type Reagendamento, planoComItemReagendado } from '@/data/planner-api'
import { describe, expect, it } from 'vitest'

/**
 * A FOTO OTIMISTA do plano — o que a tela mostra enquanto o `PATCH` viaja.
 *
 * Vale um teste próprio, e não um caso dentro do teste de tela, porque o erro
 * que ela comete é invisível na tela: mutar o objeto do cache em vez de devolver
 * um novo passa despercebido no caminho feliz e só aparece no ROLLBACK, onde o
 * snapshot restaurado já vem alterado junto. Aí a barra fica no lugar errado
 * depois de um erro que a tela reportou corretamente — e a suspeita cai sobre o
 * aviso, que estava certo.
 */

const PLANO: ProjectPlanDto = {
  projectId: 'proj-1',
  phases: [
    {
      id: 'fase-1',
      name: 'Aquisição',
      startsOn: '2026-03-01',
      endsOn: '2026-05-31',
      items: [
        {
          id: 'item-1',
          label: 'Pedido de compra #479',
          kind: 'order',
          startsOn: '2026-03-10',
          endsOn: '2026-04-20',
          progressPercent: 60,
        },
        {
          id: 'item-2',
          label: 'Entrega das luminárias',
          kind: 'delivery',
          startsOn: '2026-05-05',
          endsOn: '2026-05-05',
          progressPercent: 0,
        },
      ],
    },
    {
      id: 'fase-2',
      name: 'Instalação',
      startsOn: '2026-06-01',
      endsOn: '2026-07-31',
      items: [
        {
          id: 'item-3',
          label: 'Montagem dos trilhos',
          kind: 'task',
          startsOn: '2026-06-01',
          endsOn: '2026-06-30',
          progressPercent: 0,
        },
      ],
    },
  ],
}

const mover = (novo: Reagendamento) => planoComItemReagendado(PLANO, novo)

describe('a foto otimista do plano', () => {
  it('move só o item pedido, e deixa os irmãos onde estavam', () => {
    const novo = mover({ itemId: 'item-1', startsOn: '2026-03-15', endsOn: '2026-04-25' })
    const fase = novo.phases[0]

    expect(fase?.items[0]).toMatchObject({ startsOn: '2026-03-15', endsOn: '2026-04-25' })
    expect(fase?.items[1]).toMatchObject({ startsOn: '2026-05-05', endsOn: '2026-05-05' })
  })

  it('não toca no plano que recebeu — o rollback depende disso', () => {
    mover({ itemId: 'item-1', startsOn: '2026-03-15', endsOn: '2026-04-25' })

    // Se este `expect` cair, o snapshot de `onMutate` está sendo alterado junto
    // e o desfazer do `onError` não desfaz nada.
    expect(PLANO.phases[0]?.items[0]?.startsOn).toBe('2026-03-10')
  })

  it('a fase estica quando o item passa do fim dela', () => {
    const novo = mover({ itemId: 'item-1', startsOn: '2026-03-10', endsOn: '2026-08-31' })
    // Barra-resumo menor que o filho seria a fase mentindo sobre o próprio
    // tamanho — e o pisca-pisca ao chegar a resposta leria como bug da tela.
    expect(novo.phases[0]?.endsOn).toBe('2026-08-31')
  })

  it('a fase estica também para trás', () => {
    const novo = mover({ itemId: 'item-1', startsOn: '2026-01-05', endsOn: '2026-04-20' })
    expect(novo.phases[0]?.startsOn).toBe('2026-01-05')
  })

  it('a fase NÃO encolhe quando o item se recolhe', () => {
    // Mesma escolha do mock: esticar é derivação do que o gantt precisa
    // desenhar; encolher seria inventar que a fase acabou porque uma barra
    // saiu da ponta. A fase tem datas próprias, e elas podem ser maiores.
    const novo = mover({ itemId: 'item-2', startsOn: '2026-04-01', endsOn: '2026-04-02' })
    expect(novo.phases[0]?.endsOn).toBe('2026-05-31')
  })

  it('a fase que não tem o item fica idêntica — mesma referência', () => {
    const novo = mover({ itemId: 'item-1', startsOn: '2026-03-15', endsOn: '2026-04-25' })
    // Referência, não conteúdo: fase intocada que vira objeto novo faz o React
    // remontar a linha inteira do gantt a cada arraste do vizinho.
    expect(novo.phases[1]).toBe(PLANO.phases[1])
  })

  it('item que não existe no plano deixa tudo como estava', () => {
    const novo = mover({ itemId: 'item-fantasma', startsOn: '2026-01-01', endsOn: '2026-01-02' })
    expect(novo.phases).toEqual(PLANO.phases)
  })
})
