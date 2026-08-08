import type { AgendaEventDto, DashboardSummaryDto, TaskDto, TodoDto } from '@/api/gerado'
import { diaLocalISO } from '@/lib/datas'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const RESUMO: DashboardSummaryDto = {
  openQuotes: 14,
  openQuotesDueThisWeek: 4,
  incomingOrders: 6,
  incomingOrdersToday: 1,
  criticalStockItems: 3,
  monthSalesCents: 18_240_000,
  previousMonthSalesCents: 16_285_000,
}

function tarefa(over: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 'task-1',
    title: 'Orçamento — Casa Jardim Botânico',
    description: 'Projeto luminotécnico completo.',
    status: 'todo',
    priority: 'high',
    dueOn: '2026-08-10',
    commentCount: 4,
    attachmentCount: 2,
    assignees: [{ id: 'u1', name: 'Rafael Alves', initials: 'RA' }],
    ...over,
  }
}

const AGENDA: AgendaEventDto[] = [
  {
    id: 'ev-1',
    // Hoje, seja qual for o dia em que a suíte rodar: a tela recorta por HOJE,
    // e data fixa faria o teste passar só no dia da captura.
    startsAt: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    title: 'Revisar orçamento',
    context: 'Residência Alphaville',
    kind: 'quote',
  },
  {
    id: 'ev-2',
    startsAt: `${diaLocalISO(new Date(Date.now() + 40 * 86400000))}T10:00:00.000Z`,
    title: 'Compromisso de outro mês',
    context: null,
    kind: 'delivery',
  },
]

const TODOS: TodoDto[] = [
  { id: 'todo-1', title: 'Conferir NF 1207 pendente', done: false },
  { id: 'todo-2', title: 'Atualizar tabela de preços', done: true },
]

interface Opcoes {
  tarefas?: TaskDto[]
  resumoFalha?: boolean
}

/** Servidor falso do Dashboard, com registro das chamadas de escrita. */
function servidor({ tarefas = [tarefa()], resumoFalha = false }: Opcoes = {}) {
  const escritas: Array<{ caminho: string; metodo: string; corpo: unknown }> = []

  const stub: FetchStub = async (input) => {
    const requisicao = input instanceof Request ? input : null
    const url = String(requisicao ? requisicao.url : input)
    const caminho = new URL(url, 'http://localhost').pathname
    const metodo = requisicao?.method ?? 'GET'
    const texto = requisicao ? await requisicao.clone().text() : ''
    if (metodo !== 'GET') {
      escritas.push({ caminho, metodo, corpo: texto ? JSON.parse(texto) : null })
    }

    const json = (valor: unknown, status = 200) =>
      new Response(JSON.stringify(valor), {
        status,
        headers: { 'content-type': 'application/json' },
      })

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/dashboard/summary') {
      return resumoFalha
        ? new Response(JSON.stringify({ detail: 'Apuração indisponível.' }), {
            status: 409,
            headers: { 'content-type': 'application/problem+json' },
          })
        : json(RESUMO)
    }
    if (caminho === '/api/dashboard/agenda') return json(AGENDA)
    if (caminho === '/api/todos') return json(TODOS)
    if (caminho.startsWith('/api/todos/')) return json({ ...TODOS[0], done: true })
    if (caminho === '/api/tasks') {
      if (metodo === 'POST') return json(tarefa({ id: 'task-novo' }), 201)
      const q = new URL(url, 'http://localhost').searchParams.get('q')
      const filtradas = q
        ? tarefas.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()))
        : tarefas
      return json(filtradas)
    }
    if (caminho.startsWith('/api/tasks/')) return json(tarefa({ status: 'doing' }))
    return new Response('', { status: 404 })
  }

  return { stub, escritas }
}

describe('tela Dashboard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra os quatro indicadores, com dinheiro formatado e a variação derivada', async () => {
    renderRoute('/dashboard', servidor().stub)

    const abertos = await screen.findByText('Orçamentos abertos')
    // O valor é procurado DENTRO do cartão: "14" também é um dia do
    // mini-calendário, e um getByText solto casa os dois.
    const cartao = abertos.closest('[data-slot="indicador"]') as HTMLElement
    expect(within(cartao).getByText('14')).toBeInTheDocument()
    expect(screen.getByText('4 vencem esta semana')).toBeInTheDocument()
    // Singular e plural são frases diferentes — "1 chegam hoje" é defeito visível.
    expect(screen.getByText('1 chega hoje')).toBeInTheDocument()
    expect(screen.getByText('R$ 182.400,00')).toBeInTheDocument()
    expect(screen.getByText('+12% vs mês anterior')).toBeInTheDocument()
  })

  it('a agenda mostra só o que é de HOJE; o calendário conhece o mês inteiro', async () => {
    renderRoute('/dashboard', servidor().stub)

    expect(await screen.findByText('Revisar orçamento')).toBeInTheDocument()
    expect(screen.getByText('Residência Alphaville')).toBeInTheDocument()
    expect(screen.queryByText('Compromisso de outro mês')).not.toBeInTheDocument()
  })

  it('o quadro reparte as tarefas nas colunas do andamento', async () => {
    const { stub } = servidor({
      tarefas: [
        tarefa(),
        tarefa({ id: 'task-2', title: 'Conferência de estoque', status: 'doing' }),
        tarefa({ id: 'task-3', title: 'Entrada NF 1204', status: 'done' }),
      ],
    })
    renderRoute('/dashboard', stub)

    const emAndamento = await screen
      .findByRole('region', { name: /Em andamento/i })
      .catch(() => null)
    // A coluna é uma <section> com cabeçalho próprio; a asserção que importa é
    // que cada tarefa apareceu na coluna certa.
    expect(emAndamento ?? screen.getByText('Conferência de estoque')).toBeTruthy()

    const colunaDoing = document.querySelector('[data-slot="coluna"][data-status="doing"]')
    expect(colunaDoing).not.toBeNull()
    expect(
      within(colunaDoing as HTMLElement).getByText('Conferência de estoque'),
    ).toBeInTheDocument()

    const colunaTodo = document.querySelector('[data-slot="coluna"][data-status="todo"]')
    expect(
      within(colunaTodo as HTMLElement).getByText('Orçamento — Casa Jardim Botânico'),
    ).toBeInTheDocument()
  })

  it('mover de coluna é um PATCH com só o status — a interação é por CLIQUE', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/dashboard', stub)

    await user.click(await screen.findByRole('button', { name: /Ações de Orçamento/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Em andamento' }))

    const patch = escritas.find((e) => e.caminho.startsWith('/api/tasks/'))
    expect(patch?.metodo).toBe('PATCH')
    expect(patch?.corpo).toEqual({ status: 'doing' })
  })

  it('a busca filtra NO SERVIDOR e vale para as duas vistas', async () => {
    const { stub } = servidor({
      tarefas: [tarefa(), tarefa({ id: 'task-2', title: 'Conferência de estoque' })],
    })
    const { user } = renderRoute('/dashboard', stub)

    await user.type(await screen.findByLabelText('Buscar tarefa'), 'conferência')

    expect(await screen.findByText('Conferência de estoque')).toBeInTheDocument()
    expect(screen.queryByText('Orçamento — Casa Jardim Botânico')).not.toBeInTheDocument()
  })

  it('a lista é a mesma consulta em fileira', async () => {
    const { stub } = servidor()
    const { user } = renderRoute('/dashboard', stub)

    await user.click(await screen.findByRole('tab', { name: 'Lista' }))

    expect(await screen.findByRole('columnheader', { name: 'Prazo' })).toBeInTheDocument()
    // Dentro da TABELA: o nome também aparece na carga por responsável, que lê
    // a mesma consulta — procurar solto casaria os dois.
    const tabela = screen.getByRole('columnheader', { name: 'Prazo' }).closest('table')
    expect(within(tabela as HTMLElement).getByText('Rafael Alves')).toBeInTheDocument()
  })

  it('marcar item da lista A fazer manda `done` ao servidor', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/dashboard', stub)

    await user.click(await screen.findByText('Conferir NF 1207 pendente'))

    const patch = escritas.find((e) => e.caminho.startsWith('/api/todos/'))
    expect(patch?.metodo).toBe('PATCH')
    expect(patch?.corpo).toEqual({ done: true })
  })

  it('painel que falha não derruba a tela, e diz o que o servidor disse', async () => {
    // 409 e não 5xx: 4xx não se repete (`repetirSeValeAPena`), então a tela
    // mostra a falha na primeira resposta em vez de ficar 7s em esqueleto.
    renderRoute('/dashboard', servidor({ resumoFalha: true }).stub)

    expect(await screen.findByText('Os indicadores não carregaram')).toBeInTheDocument()
    expect(screen.getByText('Apuração indisponível.')).toBeInTheDocument()
    // O resto da tela continua de pé: quem perdeu o KPI ainda precisa do quadro.
    expect(await screen.findByText('Orçamento — Casa Jardim Botânico')).toBeInTheDocument()
  })

  it('nova tarefa grava com o corpo do contrato e fecha o diálogo', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/dashboard', stub)

    await user.click(await screen.findByRole('button', { name: /Nova tarefa/ }))
    await user.type(await screen.findByLabelText('Título'), 'Cotação de trilhos')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    const post = escritas.find((e) => e.caminho === '/api/tasks' && e.metodo === 'POST')
    expect(post?.corpo).toMatchObject({
      title: 'Cotação de trilhos',
      status: 'todo',
      priority: 'medium',
    })
  })
})
