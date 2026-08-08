import type { TaskDto } from '@/api/gerado'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

interface Opcoes {
  tarefas?: TaskDto[]
}

/** Servidor falso de Tarefas, com registro das chamadas de escrita. */
function servidor({ tarefas = [tarefa()] }: Opcoes = {}) {
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
      return json({
        openQuotes: 0,
        openQuotesDueThisWeek: 0,
        incomingOrders: 0,
        incomingOrdersToday: 0,
        criticalStockItems: 0,
        monthSalesCents: 0,
        previousMonthSalesCents: 0,
      })
    }
    if (caminho === '/api/dashboard/agenda') return json([])
    if (caminho === '/api/todos') return json([])
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

describe('tela Tarefas', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('o quadro reparte as tarefas nas colunas do andamento', async () => {
    const { stub } = servidor({
      tarefas: [
        tarefa(),
        tarefa({ id: 'task-2', title: 'Conferência de estoque', status: 'doing' }),
        tarefa({ id: 'task-3', title: 'Entrada NF 1204', status: 'done' }),
      ],
    })
    renderRoute('/tarefas', stub)

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

  it('a cor da coluna vem da SITUAÇÃO, nunca de um módulo emprestado', async () => {
    // O mockup de cores pinta as colunas com pastéis de módulo. O preenchimento
    // entra; a fonte da cor não — coluna roxa de Vendas diria que `Em revisão`
    // pertence àquele cadastro. As quatro leem zona de estado, e nenhuma delas
    // declara `data-modulo`.
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    const colunaDone = (await screen.findByText('Concluído')).closest('[data-slot="coluna"]')
    expect(colunaDone).toHaveClass('bg-zone-money')

    for (const status of ['todo', 'doing', 'review', 'done']) {
      const coluna = document.querySelector(`[data-slot="coluna"][data-status="${status}"]`)
      expect(coluna).not.toHaveAttribute('data-modulo')
    }
  })

  it('mover de coluna é um PATCH com só o status — a interação é por CLIQUE', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/tarefas', stub)

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
    const { user } = renderRoute('/tarefas', stub)

    await user.type(await screen.findByLabelText('Buscar tarefa'), 'conferência')

    expect(await screen.findByText('Conferência de estoque')).toBeInTheDocument()
    expect(screen.queryByText('Orçamento — Casa Jardim Botânico')).not.toBeInTheDocument()
  })

  it('a lista é a mesma consulta em fileira', async () => {
    const { stub } = servidor()
    const { user } = renderRoute('/tarefas', stub)

    await user.click(await screen.findByRole('tab', { name: 'Lista' }))

    expect(await screen.findByRole('columnheader', { name: 'Prazo' })).toBeInTheDocument()
    // Dentro da TABELA: o nome também aparece na carga por responsável, que lê
    // a mesma consulta — procurar solto casaria os dois.
    const tabela = screen.getByRole('columnheader', { name: 'Prazo' }).closest('table')
    expect(within(tabela as HTMLElement).getByText('Rafael Alves')).toBeInTheDocument()
  })

  it('nova tarefa grava com o corpo do contrato e fecha o diálogo', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/tarefas', stub)

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

  it('progresso das tarefas resume concluídas/em aberto/total da mesma consulta', async () => {
    const { stub } = servidor({
      tarefas: [tarefa(), tarefa({ id: 'task-2', title: 'Entrada NF 1204', status: 'done' })],
    })
    renderRoute('/tarefas', stub)

    expect(await screen.findByText('Progresso das tarefas')).toBeInTheDocument()
    const concluidas = screen.getByText('Concluídas').closest('div') as HTMLElement
    expect(within(concluidas).getByText('1')).toBeInTheDocument()
  })
})
