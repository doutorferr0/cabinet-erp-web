import type { AgendaEventDto, DashboardSummaryDto, TodoDto } from '@/api/gerado'
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
  resumoFalha?: boolean
  /** Resumo servido no lugar do padrão — o backend real zera dois campos. */
  resumo?: DashboardSummaryDto
}

/** Servidor falso do Dashboard, com registro das chamadas de escrita. */
function servidor({ resumoFalha = false, resumo = RESUMO }: Opcoes = {}) {
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
        : json(resumo)
    }
    if (caminho === '/api/dashboard/agenda') return json(AGENDA)
    if (caminho === '/api/todos') return json(TODOS)
    if (caminho.startsWith('/api/todos/')) return json({ ...TODOS[0], done: true })
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

  it('`Pedidos a receber` não imprime o zero que o servidor não apura', async () => {
    // O backend real devolve `incomingOrders`/`incomingOrdersToday` SEMPRE `0` —
    // o DTO os exige `integer` e não tem `null` para dizer "sem dado". Imprimir
    // `0` diria "nenhum pedido a receber" num sistema que tem ordem de compra.
    renderRoute('/dashboard', servidor({ resumo: { ...RESUMO, incomingOrders: 0 } }).stub)

    const rotulo = await screen.findByText('Pedidos a receber')
    const cartao = rotulo.closest('[data-slot="indicador"]') as HTMLElement
    expect(within(cartao).getByText('—')).toBeInTheDocument()
    expect(within(cartao).getByText('o servidor ainda não apura')).toBeInTheDocument()
    expect(within(cartao).queryByText('0')).not.toBeInTheDocument()

    // O cartão continua levando à lista, que é onde o número existe de verdade.
    expect(cartao.getAttribute('href')).toBe('/compras/pedidos')

    // E os outros três seguem mostrando o que o servidor apura: a declaração é
    // deste campo, não um modo "sem dado" da fileira inteira.
    expect(screen.getByText('4 vencem esta semana')).toBeInTheDocument()
  })

  it('a agenda mostra só o que é de HOJE; o calendário conhece o mês inteiro', async () => {
    renderRoute('/dashboard', servidor().stub)

    expect(await screen.findByText('Revisar orçamento')).toBeInTheDocument()
    expect(screen.getByText('Residência Alphaville')).toBeInTheDocument()
    expect(screen.queryByText('Compromisso de outro mês')).not.toBeInTheDocument()
  })

  it('painel que falha não derruba a tela, e diz o que o servidor disse', async () => {
    // 409 e não 5xx: 4xx não se repete (`repetirSeValeAPena`), então a tela
    // mostra a falha na primeira resposta em vez de ficar 7s em esqueleto.
    renderRoute('/dashboard', servidor({ resumoFalha: true }).stub)

    expect(await screen.findByText('Os indicadores não carregaram')).toBeInTheDocument()
    expect(screen.getByText('Apuração indisponível.')).toBeInTheDocument()
    // O resto da tela continua de pé: quem perdeu o KPI ainda precisa da agenda.
    expect(await screen.findByText('Revisar orçamento')).toBeInTheDocument()
  })

  it('marcar item da lista A fazer manda `done` ao servidor', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/dashboard', stub)

    await user.click(await screen.findByText('Conferir NF 1207 pendente'))

    const patch = escritas.find((e) => e.caminho.startsWith('/api/todos/'))
    expect(patch?.metodo).toBe('PATCH')
    expect(patch?.corpo).toEqual({ done: true })
  })
})
