import type { ProjectDto, ProjectPlanDto } from '@/api/gerado'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

  it('desenha a grade de meses e as barras do primeiro projeto', async () => {
    renderRoute('/planner', servidor().stub)

    expect(await screen.findByRole('heading', { name: 'Planner' })).toBeInTheDocument()
    expect(await screen.findByText('Aquisição')).toBeInTheDocument()
    // A barra é um controle de verdade, com nome acessível: o gantt é operável
    // sem mouse.
    expect(
      await screen.findByRole('button', { name: /Pedido: Pedido de compra #479/ }),
    ).toBeInTheDocument()
    // O cabeçalho tem uma coluna por mês; março é a primeira.
    expect(screen.getAllByText(/mar/).length).toBeGreaterThan(0)
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

  it('projeto sem fase diz isso, em vez de mostrar grade vazia', async () => {
    const { stub } = servidor()
    const { user } = renderRoute('/planner', stub)

    await screen.findByText('Aquisição')
    await user.selectOptions(screen.getByLabelText(/Projeto/), 'proj-2')

    expect(
      await screen.findByText('Este projeto ainda não tem fases planejadas.'),
    ).toBeInTheDocument()
  })
})
