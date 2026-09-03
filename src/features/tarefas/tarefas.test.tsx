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

/**
 * Prazos ancorados longe dos dois lados, porque a tela lê o relógio REAL.
 *
 * Fixar a data com `vi.setSystemTime` obrigaria a fake timers no meio do
 * `userEvent`, e a lógica de "o que conta como atrasada" já está falsificada em
 * `apuracao.test.ts` com `hoje` passado à mão. Aqui só importa que um prazo
 * esteja no passado e o outro no futuro em qualquer dia em que a suíte rode.
 */
const PRAZO_VELHO = '2020-03-10'
const PRAZO_LONGE = '2099-01-01'

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

  it('a coluna é tint n-50 sem borda — a cor da situação mora no quadradinho', async () => {
    // Reface 2.0: o 1.x pintava a coluna inteira com a pastel do estado e punha
    // um cartão de contorno grosso por cima; de longe o quadro virava quatro
    // blocos de cor. Agora a região se separa por TINT (a ferramenta mais
    // barata de §Hierarquia) e a cor da situação informa pelo quadradinho —
    // borda ali seria a segunda ferramenta na mesma fronteira.
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    const colunaDone = (await screen.findByText('Concluído')).closest('[data-slot="coluna"]')
    expect(colunaDone).toHaveClass('bg-[var(--n-50)]')
    expect(colunaDone?.className).not.toMatch(/\bborder\b/)

    // A cor continua vindo da SITUAÇÃO, nunca de um módulo emprestado: coluna
    // roxa de Vendas diria que `Em revisão` pertence àquele cadastro.
    for (const status of ['todo', 'doing', 'review', 'done']) {
      const coluna = document.querySelector(`[data-slot="coluna"][data-status="${status}"]`)
      expect(coluna).not.toHaveAttribute('data-modulo')
    }
  })

  it('o cartão levanta no hover — de --hard-soft parado para --hard-1', async () => {
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    const cartao = (await screen.findByText('Orçamento — Casa Jardim Botânico')).closest(
      '[data-slot="tarefa"]',
    )
    // Parado: sombra cinza e borda discreta. No hover: sombra de tinta e borda
    // n-900. É a única mudança de profundidade do quadro.
    expect(cartao).toHaveClass('shadow-[var(--hard-soft)]')
    expect(cartao).toHaveClass('hover:shadow-[var(--hard-1)]')
    expect(cartao).toHaveClass('hover:border-[var(--n-900)]')
  })

  it('a prioridade é pílula pastel, e a concluída sai riscada sem pílula', async () => {
    const { stub } = servidor({
      tarefas: [tarefa(), tarefa({ id: 'task-2', title: 'Entrada NF 1204', status: 'done' })],
    })
    renderRoute('/tarefas', stub)

    // O texto continua "Alta" no DOM: a caixa alta é `text-transform` de
    // `.t-rotulo`, e o jsdom não aplica CSS ao `textContent`.
    const pilula = await screen.findByText('Alta')
    expect(pilula.closest('[data-slot="prioridade"]')).toHaveAttribute('data-prioridade', 'high')

    // Concluída não repete prioridade: o que já fechou não disputa a fila do
    // dia, e o riscado é o que diz o estado (nunca só a cor — WCAG 1.4.1).
    const feita = screen.getByText('Entrada NF 1204')
    expect(feita).toHaveClass('line-through')
    const cartaoFeito = feita.closest('[data-slot="tarefa"]') as HTMLElement
    expect(cartaoFeito.querySelector('[data-slot="prioridade"]')).toBeNull()
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

  it('a faixa resume o quadro em três KPIs da MESMA consulta', async () => {
    const { stub } = servidor({
      tarefas: [
        tarefa(),
        tarefa({ id: 'task-2', title: 'Entrada NF 1204', status: 'done' }),
        tarefa({ id: 'task-3', title: 'Revisão do layout', status: 'review', dueOn: PRAZO_LONGE }),
      ],
    })
    renderRoute('/tarefas', stub)

    const faixa = (await screen.findByText('Concluídas')).closest(
      '[data-slot="faixa-de-kpi"]',
    ) as HTMLElement

    // O valor sai por `output` com o rótulo como nome acessível: é o que
    // permite afirmar sobre o NÚMERO do tile, e não sobre um "1" qualquer da
    // tela (a contagem da coluna também é 1).
    expect(within(faixa).getByLabelText('Concluídas')).toHaveTextContent('1')
    expect(within(faixa).getByLabelText('Em aberto')).toHaveTextContent('2')
    expect(within(faixa).getByText('1 em revisão')).toBeInTheDocument()
  })

  it('atrasada é prazo vencido em tarefa ABERTA — a faixa nomeia a pior', async () => {
    const { stub } = servidor({
      tarefas: [
        // Vencida há muito e ainda aberta: entra.
        tarefa({ id: 'task-1', title: 'Cotação trilhos', dueOn: PRAZO_VELHO }),
        // Vencida ainda mais cedo, MAS concluída: não entra, e não pode ser a
        // "pior" — foi o caso que a apuração existe para separar.
        tarefa({ id: 'task-2', title: 'Entrada NF 1204', status: 'done', dueOn: '2020-01-01' }),
        tarefa({ id: 'task-3', title: 'Revisão do layout', dueOn: PRAZO_LONGE }),
      ],
    })
    renderRoute('/tarefas', stub)

    const faixa = (await screen.findByText('Atrasadas')).closest(
      '[data-slot="faixa-de-kpi"]',
    ) as HTMLElement
    expect(within(faixa).getByLabelText('Atrasadas')).toHaveTextContent('1')
    expect(within(faixa).getByText(/Cotação trilhos/)).toBeInTheDocument()

    // E o cartão diz o mesmo, na tira de meta: a palavra junto da cor.
    const cartao = screen
      .getByText('Cotação trilhos')
      .closest('[data-slot="tarefa"]') as HTMLElement
    expect(within(cartao).getByText(/atrasada/)).toBeInTheDocument()
  })

  it('a carga por responsável mostra feitas/total de quem assumiu', async () => {
    const { stub } = servidor({
      tarefas: [
        tarefa({ id: 'task-1' }),
        tarefa({ id: 'task-2', title: 'Entrada NF 1204', status: 'done' }),
      ],
    })
    renderRoute('/tarefas', stub)

    const carga = (await screen.findByText('Carga por responsável')).closest(
      '[data-slot="carga-por-responsavel"]',
    ) as HTMLElement
    expect(within(carga).getByText('Rafael Alves')).toBeInTheDocument()
    expect(within(carga).getByText('1/2')).toBeInTheDocument()
  })

  it('o calendário é a MESMA consulta, e diz quantas ficaram de fora', async () => {
    const { stub } = servidor({
      tarefas: [
        tarefa({ id: 'task-1', dueOn: PRAZO_LONGE }),
        tarefa({ id: 'task-2', title: 'Sem prazo nenhum', dueOn: null }),
      ],
    })
    const { user } = renderRoute('/tarefas', stub)

    await user.click(await screen.findByRole('tab', { name: 'Calendário' }))

    // Tarefa sem prazo não cabe num calendário — e some CONTADA, não em
    // silêncio: um calendário que engole linhas mente sobre o conjunto.
    expect(await screen.findByText(/1 tarefa sem prazo não aparece aqui/)).toBeInTheDocument()
  })
})
