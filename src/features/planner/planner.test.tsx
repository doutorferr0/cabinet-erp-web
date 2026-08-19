import type { ProjectDto, ProjectPlanDto } from '@/api/gerado'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * O QUE ESTA BATERIA PODE PROVAR MUDOU COM A TROCA DE MOTOR — e o limite é
 * MEDIDO, não suposto.
 *
 * **O miolo do SVAR não renderiza em jsdom.** Medido nesta sessão, em três
 * tentativas: sem stub de canvas ele nem monta (`HTMLCanvasElement.prototype.
 * getContext` não existe no jsdom, e o SVAR usa canvas para MEDIR TEXTO — o erro
 * é `Cannot read properties of null (reading 'translate')`). Com o canvas
 * stubado ele monta e sai a casca — `wx-gantt`, `wx-grid`, `wx-header`, e até
 * `wx-bar` vazio por tarefa —, mas o CONTEÚDO da barra não: nem o texto do item,
 * nem o `taskTemplate`. Também não sai com `clientWidth`, `clientHeight`,
 * `getBoundingClientRect` e `ResizeObserver` stubados: o corpo do gráfico é
 * virtualizado por medida real e jsdom não faz layout.
 *
 * Isso apaga três asserções que o arquivo antigo tinha: o nome acessível da
 * barra, o rótulo do item e as colunas do cabeçalho de meses. Elas não foram
 * "removidas para o teste passar" — deixaram de ser alcançáveis neste runner, e
 * fingir o contrário seria pior: um teste que monta o Gantt dublado provaria o
 * dublê.
 *
 * O que continua provado aqui é a CASCA, que é nossa: o recorte de projeto, o
 * toggle, os estados vazios e o fato de o gantt ser montado com as tarefas
 * certas. O miolo — geometria e desenho da barra — é do SVAR e se confere
 * RENDERIZANDO: o preview da Cloudflare desta PR é a conferência.
 *
 * A tradução que alimenta tudo isso está coberta em `dados-do-gantt.test.ts`,
 * com 13 casos, e é lá que mora o que quebra em silêncio.
 */

beforeAll(() => {
  // Ver o cabeçalho: sem isto o SVAR lança na montagem e a tela inteira some.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    measureText: (texto: string) => ({ width: texto.length * 7 }),
    translate: () => {},
    save: () => {},
    restore: () => {},
    scale: () => {},
    clearRect: () => {},
    fillRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    setTransform: () => {},
    font: '',
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext
})

const PROJETOS: ProjectDto[] = [
  { id: 'proj-1', name: 'Residência Alphaville', status: 'active' },
  { id: 'proj-2', name: 'Loja Iguatemi', status: 'proposed' },
]

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
      ],
    },
  ],
}

function servidor({ encerrados = [] as ProjectDto[] } = {}) {
  const chamadas: string[] = []
  const stub: FetchStub = async (input) => {
    const url = String(input instanceof Request ? input.url : input)
    const alvo = new URL(url, 'http://localhost')
    chamadas.push(alvo.pathname + alvo.search)

    const json = (valor: unknown) =>
      new Response(JSON.stringify(valor), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })

    if (alvo.pathname === '/auth/me') return respostaSessao()
    if (alvo.pathname === '/auth/tenants') return respostaVinculos()
    if (alvo.pathname === '/api/projects') {
      return json(alvo.searchParams.get('status') === 'closed' ? encerrados : PROJETOS)
    }
    if (alvo.pathname === '/api/projects/proj-1/plan') return json(PLANO)
    if (alvo.pathname === '/api/projects/proj-2/plan') {
      return json({ projectId: 'proj-2', phases: [] })
    }
    return new Response('', { status: 404 })
  }
  return { stub, chamadas }
}

describe('tela Planner', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('monta o gantt do primeiro projeto, com uma linha por tarefa', async () => {
    renderRoute('/planner', servidor().stub)

    expect(await screen.findByRole('heading', { name: 'Planner' })).toBeInTheDocument()
    // O nome da fase sai na coluna da esquerda, que é grade e não gráfico — é a
    // parte do SVAR que jsdom alcança.
    expect(await screen.findByText('Aquisição')).toBeInTheDocument()

    const gantt = document.querySelector('[data-slot="gantt"]')
    expect(gantt, 'a moldura do gantt é NOSSA e precisa existir').not.toBeNull()
    // Uma barra por tarefa: a fase-resumo e o item. Zero barras significaria
    // que o plano não chegou ao componente — que é o defeito que importa aqui.
    expect(gantt?.querySelectorAll('.wx-bar').length).toBe(2)
  })

  it('a moldura carrega a cor da SEÇÃO — a troca de motor não muda onde estamos', async () => {
    renderRoute('/planner', servidor().stub)
    await screen.findByText('Aquisição')

    // `s120`, laranja #FF6B2C: quem lê a cor sabe em que parte do sistema está.
    expect(document.querySelector('[data-slot="gantt"]')?.getAttribute('data-secao')).toBe(
      'dashboard',
    )
  })

  it('o Andamento resume o plano, e é NOSSO — o SVAR não sabe resumir projeto', async () => {
    renderRoute('/planner', servidor().stub)

    expect(await screen.findByText('Andamento')).toBeInTheDocument()
    expect(await screen.findByText('60%')).toBeInTheDocument()
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
  })

  it('o toggle troca o recorte e o servidor recebe os dois status juntos', async () => {
    const { stub, chamadas } = servidor()
    const { user } = renderRoute('/planner', stub)

    await screen.findByText('Aquisição')
    expect(chamadas.some((c) => c.includes('status=active%2Cproposed'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Encerrados' }))

    expect(await screen.findByText('Nenhum projeto neste recorte.')).toBeInTheDocument()
    expect(chamadas.some((c) => c.includes('status=closed'))).toBe(true)
  })

  it('projeto sem fase diz isso, em vez de montar um gantt vazio', async () => {
    const { stub } = servidor()
    const { user } = renderRoute('/planner', stub)

    await screen.findByText('Aquisição')
    await user.selectOptions(screen.getByLabelText(/Projeto/), 'proj-2')

    expect(
      await screen.findByText('Este projeto ainda não tem fases planejadas.'),
    ).toBeInTheDocument()
    // Grade de zero mês seria pior que a frase: o operador leria "não há nada
    // acontecendo" onde o certo é "este projeto não tem plano".
    expect(document.querySelector('[data-slot="gantt"]')).toBeNull()
  })
})
