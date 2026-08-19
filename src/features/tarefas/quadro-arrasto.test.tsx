import type { TaskDto } from '@/api/gerado'
import { colunaDoArrasto } from '@/features/tarefas/quadro'
import { arrastarPara, arrastarSobre } from '@/test/arrastar'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * O QUADRO DE TAREFAS SE MOVE POR ARRASTO — sem perder o clique.
 *
 * O que esta bateria vigia é a ORDEM da frase: o menu `⋯` continua sendo o
 * caminho completo e o arrasto é atalho por cima. Por isso os dois primeiros
 * casos são de teclado: se um dia alguém trocar o menu pelo gesto, a regressão
 * de acessibilidade quebra aqui antes de chegar na tela de alguém.
 *
 * A decisão do gesto mora numa função pura (`colunaDoArrasto`), e é ela que
 * carrega os casos que NÃO podem virar requisição. O resto é a fiação, medida
 * contra o DOM de verdade — ver `src/test/arrastar.ts` para por que o jsdom
 * precisa de ajuda.
 */

function tarefa(over: Partial<TaskDto> & { id: string }): TaskDto {
  return {
    title: 'Tarefa',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueOn: null,
    commentCount: 0,
    attachmentCount: 0,
    assignees: [],
    ...over,
  }
}

const TAREFAS = [
  tarefa({ id: 't1', title: 'Medir a sala', status: 'todo' }),
  tarefa({ id: 't2', title: 'Cotar arandelas', status: 'todo' }),
  tarefa({ id: 't3', title: 'Revisar a proposta', status: 'doing' }),
]

function servidor(tarefas: TaskDto[] = TAREFAS) {
  const escritas: Array<{ caminho: string; metodo: string; corpo: unknown }> = []

  const json = (valor: unknown, status = 200) =>
    new Response(JSON.stringify(valor), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  const stub: FetchStub = async (input) => {
    const requisicao = input instanceof Request ? input : null
    const url = String(requisicao ? requisicao.url : input)
    const caminho = new URL(url, 'http://localhost').pathname
    const metodo = requisicao?.method ?? 'GET'
    if (metodo !== 'GET') {
      const texto = requisicao ? await requisicao.clone().text() : ''
      escritas.push({ caminho, metodo, corpo: texto ? JSON.parse(texto) : null })
      return json(tarefa({ id: 't1', status: 'doing' }))
    }

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/tasks') return json(tarefas)
    if (caminho === '/api/todos') return json([])
    if (caminho === '/api/dashboard/agenda') return json([])
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
    return new Response('', { status: 404 })
  }

  return { stub, escritas }
}

/** O cartão pelo título — é o `<li>` que a biblioteca registra como arrastável. */
function cartaoDe(titulo: string): HTMLElement {
  const alvo = screen.getByText(titulo).closest('[data-slot="tarefa"]')
  if (!alvo) throw new Error(`cartão não encontrado: ${titulo}`)
  return alvo as HTMLElement
}

describe('a decisão do gesto, sem DOM', () => {
  it('coluna diferente é a coluna de destino', () => {
    expect(colunaDoArrasto({ status: 'todo' }, { status: 'doing' })).toBe('doing')
  })

  it('soltar fora de qualquer coluna não move nada', () => {
    // Sem isto o `dropTargets[0]` vazio viraria `undefined` no corpo do PATCH.
    expect(colunaDoArrasto({ status: 'todo' }, undefined)).toBeNull()
  })

  it('soltar na coluna de ORIGEM não vira requisição', () => {
    // Um PATCH que grava o status que já estava lá responde 200, não muda nada
    // e não deixa rastro — o defeito mais caro de achar depois.
    expect(colunaDoArrasto({ status: 'doing' }, { status: 'doing' })).toBeNull()
  })
})

describe('quadro de tarefas: o arrasto', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('arrastar para outra coluna é UM PATCH com só o status', async () => {
    const { stub, escritas } = servidor()
    renderRoute('/tarefas', stub)

    await screen.findByText('Medir a sala')
    const andamento = document.querySelector('[data-slot="coluna"][data-status="doing"]')
    if (!andamento) throw new Error('coluna `doing` não está na tela')

    await arrastarPara(cartaoDe('Medir a sala'), andamento)

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ caminho: '/api/tasks/t1', metodo: 'PATCH' })
    // Só o status: um PUT a partir do cartão apagaria descrição e responsáveis,
    // que o cartão não carrega.
    expect(escritas[0]?.corpo).toEqual({ status: 'doing' })
  })

  it('soltar na própria coluna NÃO escreve — nem uma requisição', async () => {
    const { stub, escritas } = servidor()
    renderRoute('/tarefas', stub)

    await screen.findByText('Medir a sala')
    const aFazer = document.querySelector('[data-slot="coluna"][data-status="todo"]')
    if (!aFazer) throw new Error('coluna `todo` não está na tela')

    await arrastarPara(cartaoDe('Medir a sala'), aFazer)

    // Espera de propósito: a asserção é sobre AUSÊNCIA, e sem dar tempo ela
    // passaria mesmo se a requisição estivesse a caminho.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(escritas).toHaveLength(0)
  })

  it('a coluna de destino sobe um degrau enquanto o cartão está no ar', async () => {
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    await screen.findByText('Medir a sala')
    const andamento = document.querySelector('[data-slot="coluna"][data-status="doing"]')
    if (!andamento) throw new Error('coluna `doing` não está na tela')

    const gesto = await arrastarSobre(cartaoDe('Medir a sala'), andamento)

    // `waitFor` porque o realce é estado do React: os eventos de arrasto são
    // nativos e caem fora do lote do `act`, então a classe aparece no render
    // seguinte, não no mesmo tique.
    await waitFor(() => expect(andamento).toHaveAttribute('data-sob-voo'))
    expect(andamento.className).toContain('shadow-el2')
    // O cartão em trânsito some pela metade, senão o operador vê duas cópias.
    expect(cartaoDe('Medir a sala')).toHaveAttribute('data-arrastando')

    await gesto.soltar()
    await waitFor(() => expect(andamento).not.toHaveAttribute('data-sob-voo'))
  })

  it('a coluna de ORIGEM não acende — ela não é destino de nada', async () => {
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    await screen.findByText('Medir a sala')
    const aFazer = document.querySelector('[data-slot="coluna"][data-status="todo"]')
    if (!aFazer) throw new Error('coluna `todo` não está na tela')

    await arrastarSobre(cartaoDe('Medir a sala'), aFazer)

    // Espera para a asserção de AUSÊNCIA valer alguma coisa: sem tempo, ela
    // passaria mesmo se o realce estivesse a um render de distância.
    await waitFor(() => expect(cartaoDe('Medir a sala')).toHaveAttribute('data-arrastando'))
    // Acender prometeria um movimento que a decisão pura vai descartar.
    expect(aFazer).not.toHaveAttribute('data-sob-voo')
  })
})

describe('o teclado não regrediu — o menu é a base de comparação', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('todo cartão continua trazendo o menu de ações', async () => {
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    expect(await screen.findByRole('button', { name: 'Ações de Medir a sala' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ações de Cotar arandelas' })).toBeInTheDocument()
  })

  it('mover pelo menu, só com o teclado, continua sendo UM PATCH', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/tarefas', stub)

    const acoes = await screen.findByRole('button', { name: 'Ações de Medir a sala' })
    // Sem `click`: o gesto aqui é tecla, que é justamente o que o arrasto não
    // oferece e o que esta bateria existe para proteger.
    acoes.focus()
    await user.keyboard('{Enter}')
    const item = await screen.findByRole('menuitem', { name: 'Em andamento' })
    await user.keyboard('{ArrowDown}')
    await user.click(item)

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.corpo).toEqual({ status: 'doing' })
  })

  it('o cartão não entra na ordem de tabulação por causa do arrasto', async () => {
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    await screen.findByText('Medir a sala')
    // `draggable` é atributo do elemento, não foco: pôr o cartão inteiro no
    // caminho do Tab encheria a navegação de paradas que não fazem nada.
    expect(cartaoDe('Medir a sala')).toHaveAttribute('draggable', 'true')
    expect(cartaoDe('Medir a sala')).not.toHaveAttribute('tabindex')
  })

  it('a marca de encaixe é decorativa — leitor de tela não a anuncia', async () => {
    const { stub } = servidor()
    renderRoute('/tarefas', stub)

    await screen.findByText('Medir a sala')
    const coluna = document.querySelector('[data-slot="coluna"][data-status="doing"]')
    if (!coluna) throw new Error('coluna `doing` não está na tela')

    await arrastarSobre(cartaoDe('Medir a sala'), coluna)

    // O quadro de tarefas não desenha posição (o contrato não tem ordem), então
    // aqui não há marca nenhuma — o realce é a coluna inteira.
    expect(within(coluna as HTMLElement).queryByTestId('encaixe')).toBeNull()
  })
})
