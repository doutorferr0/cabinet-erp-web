import type { ActivityDto, AgendaEventDto, DashboardSummaryDto, TodoDto } from '@/api/gerado'
import { diaLocalISO } from '@/lib/datas'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
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

const ATIVIDADES: ActivityDto[] = [
  {
    id: 'at-1',
    entityType: 'quote',
    entityId: 'orc-9',
    kind: 'call',
    title: 'enviou o orçamento ao cliente',
    assigneeName: 'Lívia Moraes',
    doneAt: new Date(new Date().setHours(12, 40, 0, 0)).toISOString(),
  },
  {
    // Alvo `partner`: NÃO vira link, porque o mesmo parceiro é cliente,
    // fornecedor ou profissional conforme o papel, e o DTO não publica o papel.
    id: 'at-2',
    entityType: 'partner',
    entityId: 'par-3',
    kind: 'call',
    title: 'confirmou a visita técnica',
    assigneeName: 'Rafael Alves',
    doneAt: new Date(new Date().setHours(11, 5, 0, 0)).toISOString(),
  },
]

interface Opcoes {
  resumoFalha?: boolean
}

/** Servidor falso do Dashboard, com registro das chamadas de escrita. */
function servidor({ resumoFalha = false }: Opcoes = {}) {
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
    // O feed de atividade do card largo (`useAtividadesRecentes`): as
    // CONCLUÍDAS da empresa, sem o par entityType/entityId.
    if (caminho === '/api/activities') return json({ rows: ATIVIDADES, total: ATIVIDADES.length })
    return new Response('', { status: 404 })
  }

  return { stub, escritas }
}

describe('tela Dashboard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra os quatro KPIs, com dinheiro formatado e a variação derivada', async () => {
    renderRoute('/dashboard', servidor().stub)

    const abertos = await screen.findByText('Orçamentos abertos')
    // O valor é procurado DENTRO do tile: "14" também é um dia do
    // mini-calendário, e um getByText solto casa os dois.
    //
    // E é procurado com ESPERA: a rodada 5 (#529) pôs contagem crescente de
    // 600 ms na entrada do tile, então o primeiro quadro tem zero e o número
    // pedido chega alguns quadros depois. Assertar síncrono aqui mediria o
    // começo da animação, não o dado.
    const tile = abertos.closest('[data-slot="kpi-tile"]') as HTMLElement
    await within(tile).findByText('14')
    expect(screen.getByText('4 vencem esta semana')).toBeInTheDocument()
    // Singular e plural são frases diferentes — "1 chegam hoje" é defeito visível.
    expect(screen.getByText('1 chega hoje')).toBeInTheDocument()
    // O dinheiro sai partido no tile (símbolo · inteiros · centavos, para os
    // centavos pesarem menos), então a asserção é por parte, não pela máscara
    // inteira. O `<output>` traz o rótulo em `aria-label`.
    const vendas = screen.getByLabelText('Vendas do mês')
    await waitFor(() => expect(vendas.textContent).toBe('R$182.400,00'))
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('vs. mês anterior')).toBeInTheDocument()
  })

  it('o bento abre pelo HERÓI, e a tinta continua sendo a do assunto', async () => {
    // A cor é do ASSUNTO, e é ela que substituiu o ornamento de módulo do 1.x.
    // A ORDEM mudou na rodada 5 (#529): `Vendas do mês` é o herói 1,6× e abre a
    // fileira, então mint vem primeiro — no DOM e na tela, juntos. Bento que
    // move o herói por `grid-row` deixaria a leitura discordar do que se vê.
    renderRoute('/dashboard', servidor().stub)

    await screen.findByText('Orçamentos abertos')
    const tiles = document.querySelectorAll('[data-slot="kpi-tile"]')
    expect([...tiles].map((t) => (t as HTMLElement).dataset.tint)).toEqual([
      'mint',
      'lilac',
      'sky',
      'sand',
    ])
    // O herói é o único fora do degrau padrão, e é ele que carrega os 40px.
    expect([...tiles].map((t) => (t as HTMLElement).dataset.escala)).toEqual([
      'heroi',
      'padrao',
      'padrao',
      'padrao',
    ])
  })

  it('o KPI de estoque crítico é ALERTA — o número vai para `--bad`', async () => {
    renderRoute('/dashboard', servidor().stub)

    const rotulo = await screen.findByText('Estoque crítico')
    const tile = rotulo.closest('[data-slot="kpi-tile"]') as HTMLElement
    const valor = tile.querySelector('[data-slot="kpi-valor"]') as HTMLElement
    expect(valor.style.color).toBe('var(--bad)')
  })

  it('a agenda mostra só o que é de HOJE; o calendário conhece o mês inteiro', async () => {
    renderRoute('/dashboard', servidor().stub)

    expect(await screen.findByText('Revisar orçamento')).toBeInTheDocument()
    expect(screen.getByText('Residência Alphaville')).toBeInTheDocument()
    expect(screen.queryByText('Compromisso de outro mês')).not.toBeInTheDocument()
    // A tag NOMEIA a cor da faixa do tipo — é o que cumpre WCAG 1.4.1 na lista.
    // Escopada na LINHA: `orçamento` também é rótulo da legenda do calendário,
    // e um `getByText` solto casa os dois.
    const linha = screen
      .getByText('Revisar orçamento')
      .closest('[data-slot="agenda-linha"]') as HTMLElement
    expect(within(linha).getByText('orçamento')).toBeInTheDocument()
  })

  it('o feed de atividade mostra quem, o quê e a hora; e só linka o que tem ficha', async () => {
    renderRoute('/dashboard', servidor().stub)

    expect(await screen.findByText(/enviou o orçamento ao cliente/)).toBeInTheDocument()
    expect(screen.getByText('12:40')).toBeInTheDocument()

    // `quote` tem ficha: a linha inteira é o link.
    const comFicha = screen.getByText(/enviou o orçamento ao cliente/).closest('a')
    expect(comFicha).toHaveAttribute('href', '/vendas/orcamentos/orc-9')

    // `partner` não tem endereço inequívoco (cliente/fornecedor/profissional
    // conforme o papel, e o DTO não publica o papel): some o CLIQUE, não o dado.
    const semFicha = screen.getByText(/confirmou a visita técnica/)
    expect(semFicha.closest('a')).toBeNull()
    expect(semFicha).toBeInTheDocument()
  })

  it('a cabeça da tela tem UM Gambarino e as duas ações do mockup', async () => {
    renderRoute('/dashboard', servidor().stub)

    const saudacao = await screen.findByRole('heading', { level: 1 })
    // `--t-display` é o único degrau Gambarino desta tela (régua: um por tela).
    expect(saudacao.className).toContain('t-display')

    // As duas ações são NAVEGAÇÃO, não diálogo: `Nova tarefa` leva à fila que a
    // alimenta, em vez de abrir um segundo formulário de tarefa.
    expect(screen.getByRole('link', { name: 'Boletim do dia' })).toHaveAttribute('href', '/boletim')
    expect(screen.getByRole('link', { name: '+ Nova tarefa' })).toHaveAttribute('href', '/tarefas')
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
