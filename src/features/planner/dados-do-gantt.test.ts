import type { ProjectPlanDto } from '@/api/gerado'
import { describe, expect, it } from 'vitest'
import {
  TIPOS,
  idDaFase,
  idDoItem,
  idOriginal,
  janelaDoPlano,
  periodoDaFase,
  progressoDoProjeto,
  tarefasDoPlano,
  totalDeItens,
} from './dados-do-gantt'

/**
 * SUBSTITUI `escala.test.ts`, e a mudança de alvo é a mesma da troca de motor.
 *
 * O arquivo antigo provava GEOMETRIA — em que porcentagem a barra começa, que a
 * barra de um dia não some, onde a linha de hoje cai. Aquilo era nosso porque a
 * grade era nossa; agora é do SVAR, e reimplementar o teste dele aqui provaria a
 * lib de outra pessoa com números que ela pode mudar numa versão menor.
 *
 * O que sobrou nosso — e é o que esta bateria cobre — é a TRADUÇÃO: duas camadas
 * do contrato viram uma árvore, dois espaços de id viram um, e a convenção de
 * fim inclusivo vira exclusiva. Errar qualquer uma delas dá barra no lugar
 * errado sem erro nenhum no caminho, que é o defeito que o gantt caseiro também
 * tinha e a razão de o arquivo antigo existir.
 */

const PLANO: ProjectPlanDto = {
  projectId: 'proj-1',
  phases: [
    {
      id: 'fase-1',
      name: 'Aquisição',
      startsOn: '2026-03-10',
      endsOn: '2026-05-20',
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
      endsOn: '2026-07-15',
      items: [
        {
          id: 'item-3',
          label: 'Montagem',
          kind: 'task',
          startsOn: '2026-06-01',
          endsOn: '2026-07-15',
          progressPercent: 100,
        },
      ],
    },
  ],
}

describe('o plano vira árvore de tarefas', () => {
  it('fase é tarefa-resumo e item é filho dela', () => {
    const tarefas = tarefasDoPlano(PLANO)

    const fase = tarefas.find((t) => t.text === 'Aquisição')
    expect(fase?.type).toBe('summary')
    // Aberta: fechada faria o Planner abrir com uma lista de fases e nenhuma
    // barra, que é o oposto do que a tela existe para mostrar.
    expect(fase?.open).toBe(true)

    const filhos = tarefas.filter((t) => t.parent === idDaFase('fase-1'))
    expect(filhos.map((t) => t.text)).toEqual(['Pedido de compra #479', 'Entrega das luminárias'])
  })

  it('os ids ganham espaço de nome — fase e item vêm de tabelas diferentes', () => {
    // Os dois uuids podem coincidir. Sem prefixo, no conjunto único do SVAR o
    // filho viraria pai de si mesmo.
    expect(idDaFase('x')).not.toBe(idDoItem('x'))
    expect(idOriginal(idDaFase('fase-1'))).toBe('fase-1')
    expect(idOriginal(idDoItem('item-1'))).toBe('item-1')
    expect(idOriginal('sem-prefixo')).toBeNull()
  })

  it('o fim vira EXCLUSIVO — item de um dia não pode ter duração zero', () => {
    // `endsOn` do contrato é inclusivo; o `end` do SVAR não é. Repassar o mesmo
    // valor daria barra de largura zero, que some da tela — e o operador
    // concluiria que a entrega não está planejada.
    const entrega = tarefasDoPlano(PLANO).find((t) => t.text === 'Entrega das luminárias')

    expect(entrega?.start).toEqual(new Date(2026, 4, 5))
    expect(entrega?.end).toEqual(new Date(2026, 4, 6))
    expect(entrega?.end.getTime()).toBeGreaterThan(entrega?.start.getTime() ?? 0)
  })

  it('a ordem é a do contrato, e não a das datas', () => {
    // `phases` é a sequência que o projeto tem. Ordenar por início faria uma
    // fase de preparo que começa tarde saltar para o meio da obra.
    expect(tarefasDoPlano(PLANO).map((t) => t.text)).toEqual([
      'Aquisição',
      'Pedido de compra #479',
      'Entrega das luminárias',
      'Instalação',
      'Montagem',
    ])
  })

  it('o item leva o TIPO, que é o que pinta a barra', () => {
    const tarefas = tarefasDoPlano(PLANO)

    expect(tarefas.find((t) => t.text === 'Pedido de compra #479')?.tipo).toBe('order')
    // A fase não tem tipo: cor de módulo é do item, e a fase é lida pela coluna.
    expect(tarefas.find((t) => t.text === 'Aquisição')?.tipo).toBeUndefined()
  })

  it('cada tipo tem rótulo e módulo — a cor não é inventada na barra', () => {
    expect(TIPOS.order).toEqual({ rotulo: 'Pedido', modulo: 'compras' })
    expect(TIPOS.delivery).toEqual({ rotulo: 'Entrega', modulo: 'estoque' })
    expect(TIPOS.task).toEqual({ rotulo: 'Tarefa', modulo: 'vendas' })
  })

  it('plano sem fase não vira árvore vazia com grade — vira nada', () => {
    expect(tarefasDoPlano({ projectId: 'p', phases: [] })).toEqual([])
  })
})

describe('a janela da grade', () => {
  it('fecha em MÊS INTEIRO nas duas pontas', () => {
    // Plano de 10/03 a 15/07. Abrir a grade no dia 10 deixaria a primeira coluna
    // do cabeçalho mais estreita que as outras, e o olho lê largura como duração.
    const janela = janelaDoPlano(PLANO.phases)

    expect(janela?.inicio).toEqual(new Date(2026, 2, 1))
    // Dia 1 de agosto: o "último dia de julho" escrito na convenção exclusiva.
    expect(janela?.fim).toEqual(new Date(2026, 7, 1))
  })

  it('plano sem fase devolve `null`, e a tela diz outra frase', () => {
    // Grade de zero mês não é grade vazia — é "este projeto não tem plano".
    expect(janelaDoPlano([])).toBeNull()
  })
})

describe('o que a tela resume, e o SVAR não sabe', () => {
  it('o período da fase é escrito para humano', () => {
    // O `Intl` do Node escreve `mar. de 2026`; a asserção acompanha o formato
    // real em vez de fixar o que eu imaginei que ele fosse.
    expect(periodoDaFase(PLANO.phases[0] as never)).toBe('mar. de 2026 — mai. de 2026')
  })

  it('conta as barras do plano inteiro', () => {
    expect(totalDeItens(PLANO)).toBe(3)
  })

  it('o andamento separa concluído, em andamento e não iniciado', () => {
    const p = progressoDoProjeto(PLANO)

    expect(p).toMatchObject({ concluidos: 1, emAndamento: 1, naoIniciados: 1, total: 3 })
    // Média SIMPLES dos itens (60 + 0 + 100) / 3 — o operador confere contando
    // as barras. Ponderar por duração bate com uma conta que ele não tem como
    // fazer no olho.
    expect(p.percentual).toBe(53)
  })

  it('plano vazio não é 0% — é projeto sem plano', () => {
    expect(progressoDoProjeto({ projectId: 'p', phases: [] }).percentual).toBeNull()
  })
})
