import type { DashboardSummaryDto, TaskDto } from '@/api/gerado'
import { createTask, listTasks, patchTask, patchTodo } from '@/api/gerado'
import { ErroDaApi, dadosOuErro } from '@/data/api-provider'
import { agruparPorColuna, variacaoDoMes } from '@/data/dashboard-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A fronteira do Dashboard contra SERVIDOR FALSO, nunca contra mock do módulo:
 * o cliente gerado chama `fetch(new Request(...))`, e é o `Request` que carrega
 * verbo e corpo. Stub que casa só por caminho deixaria o `PATCH` cair na
 * resposta do `GET` e o teste passaria sem asserir nada.
 */

function tarefa(over: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 'task-1',
    title: 'Orçamento — Casa Jardim',
    description: null,
    status: 'todo',
    priority: 'high',
    dueOn: '2026-08-10',
    commentCount: 0,
    attachmentCount: 0,
    assignees: [],
    ...over,
  }
}

const RESUMO: DashboardSummaryDto = {
  openQuotes: 14,
  openQuotesDueThisWeek: 4,
  incomingOrders: 6,
  incomingOrdersToday: 2,
  criticalStockItems: 3,
  monthSalesCents: 18_240_000,
  previousMonthSalesCents: 16_285_000,
}

describe('fronteira do dashboard', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      '/api/tasks': (chamada) =>
        chamada.metodo === 'POST'
          ? json(tarefa({ id: 'task-novo', title: 'Nova' }), 201)
          : json([tarefa(), tarefa({ id: 'task-2', status: 'done' })]),
      '/api/tasks/task-1': () => json(tarefa({ status: 'doing' })),
      '/api/todos/todo-1': () => json({ id: 'todo-1', title: 'Conferir NF', done: true }),
      '/api/dashboard/summary': () => json(RESUMO),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('a busca viaja para o SERVIDOR, não filtra no cliente', async () => {
    await listTasks({ q: 'orçamento' })
    const url = servidor.em('/api/tasks')[0]?.url ?? ''
    expect(new URL(url).searchParams.get('q')).toBe('orçamento')
  })

  it('mover de coluna é PATCH parcial: só o status viaja', async () => {
    await patchTask('task-1', { status: 'doing' })

    const chamada = servidor.em('/api/tasks/task-1')[0]
    expect(chamada?.metodo).toBe('PATCH')
    // Um PUT a partir do cartão apagaria o que o cartão não carrega.
    expect(chamada?.corpo).toEqual({ status: 'doing' })
  })

  it('criar tarefa é POST com o corpo do contrato', async () => {
    await createTask({ title: 'Nova', status: 'todo', priority: 'medium' })

    const chamada = servidor.em('/api/tasks').find((c) => c.metodo === 'POST')
    expect(chamada?.corpo).toEqual({ title: 'Nova', status: 'todo', priority: 'medium' })
  })

  it('marcar item da lista A fazer manda só `done`', async () => {
    await patchTodo('todo-1', { done: true })
    const chamada = servidor.em('/api/todos/todo-1')[0]
    expect(chamada?.metodo).toBe('PATCH')
    expect(chamada?.corpo).toEqual({ done: true })
  })

  it('falha do servidor não vira lista vazia', async () => {
    vi.unstubAllGlobals()
    instalarServidor({ '/api/tasks': () => problema(500, 'Banco fora do ar.') })

    const resposta = await listTasks()
    expect(() => dadosOuErro<TaskDto[]>(resposta, 'Falha ao carregar as tarefas.')).toThrow(
      ErroDaApi,
    )
    // O `detail` do problem+json é a única informação acionável da resposta.
    try {
      dadosOuErro<TaskDto[]>(resposta, 'Falha ao carregar as tarefas.')
    } catch (erro) {
      expect((erro as ErroDaApi).detail).toBe('Banco fora do ar.')
    }
  })
})

describe('regras puras do quadro', () => {
  it('agrupa nas quatro colunas e preserva a ordem do servidor', () => {
    const grupos = agruparPorColuna([
      tarefa({ id: 'a', status: 'todo' }),
      tarefa({ id: 'b', status: 'done' }),
      tarefa({ id: 'c', status: 'todo' }),
    ])

    expect(grupos.todo.map((t) => t.id)).toEqual(['a', 'c'])
    expect(grupos.done.map((t) => t.id)).toEqual(['b'])
    expect(grupos.doing).toEqual([])
    expect(grupos.review).toEqual([])
  })

  it('status fora do enum é descartado, não vira coluna nova', () => {
    const grupos = agruparPorColuna([
      { ...tarefa({ id: 'x' }), status: 'arquivada' as never },
      tarefa({ id: 'y' }),
    ])
    expect(Object.keys(grupos)).toEqual(['todo', 'doing', 'review', 'done'])
    expect(grupos.todo.map((t) => t.id)).toEqual(['y'])
  })

  it('a variação do mês é derivada, e some sem base de comparação', () => {
    expect(variacaoDoMes(RESUMO)).toBe(12)
    expect(variacaoDoMes({ ...RESUMO, monthSalesCents: 8_000_000 })).toBe(-51)
    // Não existe "cresceu 100%" sobre base zero.
    expect(variacaoDoMes({ ...RESUMO, previousMonthSalesCents: 0 })).toBeNull()
  })
})
