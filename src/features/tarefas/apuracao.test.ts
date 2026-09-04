import type { TaskDto, TaskDtoStatus } from '@/api/gerado'
import { describe, expect, it } from 'vitest'
import { apurarQuadro, diasDeAtraso, estaAtrasada, hojeISO } from './apuracao'

function tarefa(parcial: Partial<TaskDto> & { id: string }): TaskDto {
  return {
    title: `Tarefa ${parcial.id}`,
    status: 'todo' as TaskDtoStatus,
    priority: 'medium',
    commentCount: 0,
    attachmentCount: 0,
    assignees: [],
    ...parcial,
  }
}

describe('atraso', () => {
  it('prazo vencido e tarefa aberta = atrasada', () => {
    expect(estaAtrasada(tarefa({ id: '1', dueOn: '2026-09-01' }), '2026-09-03')).toBe(true)
  })

  it('vencer HOJE ainda não é atrasar — o dia está correndo', () => {
    expect(estaAtrasada(tarefa({ id: '1', dueOn: '2026-09-03' }), '2026-09-03')).toBe(false)
  })

  it('concluída não atrasa, por mais velho que seja o prazo', () => {
    const fechada = tarefa({ id: '1', dueOn: '2026-01-01', status: 'done' })
    expect(estaAtrasada(fechada, '2026-09-03')).toBe(false)
  })

  it('sem prazo não há atraso a afirmar', () => {
    expect(estaAtrasada(tarefa({ id: '1' }), '2026-09-03')).toBe(false)
    expect(estaAtrasada(tarefa({ id: '2', dueOn: null }), '2026-09-03')).toBe(false)
  })

  it('conta dias de calendário, e prazo no futuro dá zero', () => {
    expect(diasDeAtraso('2026-08-31', '2026-09-03')).toBe(3)
    expect(diasDeAtraso('2026-09-10', '2026-09-03')).toBe(0)
  })

  it('atravessa a virada do mês sem errar o dia', () => {
    expect(diasDeAtraso('2026-02-27', '2026-03-02')).toBe(3)
  })
})

describe('apuração da faixa', () => {
  const quadro = [
    tarefa({ id: '1', status: 'todo', dueOn: '2026-09-05' }),
    tarefa({ id: '2', title: 'Cotação trilhos', status: 'todo', dueOn: '2026-08-31' }),
    tarefa({ id: '3', status: 'doing', dueOn: '2026-09-01' }),
    tarefa({ id: '4', status: 'review', dueOn: '2026-09-20' }),
    tarefa({ id: '5', status: 'done', dueOn: '2026-08-01' }),
  ]

  it('reparte concluídas, em aberto e revisão', () => {
    const apuracao = apurarQuadro(quadro, '2026-09-03')
    expect(apuracao.total).toBe(5)
    expect(apuracao.concluidas).toBe(1)
    expect(apuracao.emAberto).toBe(4)
    expect(apuracao.emRevisao).toBe(1)
  })

  it('conta só as atrasadas abertas e nomeia a de prazo mais antigo', () => {
    const apuracao = apurarQuadro(quadro, '2026-09-03')
    // A concluída de 01/08 é a mais velha do quadro e NÃO entra: fechou.
    expect(apuracao.atrasadas).toBe(2)
    expect(apuracao.piorAtraso).toEqual({ titulo: 'Cotação trilhos', dias: 3 })
  })

  it('quadro em dia não nomeia atrasada nenhuma', () => {
    const apuracao = apurarQuadro([tarefa({ id: '1', dueOn: '2026-12-01' })], '2026-09-03')
    expect(apuracao.atrasadas).toBe(0)
    expect(apuracao.piorAtraso).toBeNull()
  })

  it('quadro vazio apura zeros, sem quebrar', () => {
    const apuracao = apurarQuadro([], '2026-09-03')
    expect(apuracao).toMatchObject({ total: 0, concluidas: 0, emAberto: 0, atrasadas: 0 })
    expect(apuracao.piorAtraso).toBeNull()
  })
})

describe('hoje', () => {
  /**
   * O dia LOCAL, e não o UTC: às 21h de Campinas (UTC-3) o `toISOString` já
   * virou o dia, e a faixa acusaria atraso numa tarefa que vence amanhã.
   */
  it('lê o dia do fuso de quem olha a tela', () => {
    const noite = new Date(2026, 8, 3, 21, 30)
    expect(hojeISO(noite)).toBe('2026-09-03')
  })

  it('preenche mês e dia com zero à esquerda', () => {
    expect(hojeISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
