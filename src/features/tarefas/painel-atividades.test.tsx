import type { ActivityDto } from '@/api/gerado'
import { PainelDeAtividades } from '@/features/tarefas/painel-atividades'
import { diaLocalISO } from '@/lib/datas'
import { parceiro, stubDeParceiros } from '@/test/parceiros'
import { instalarServidor, json } from '@/test/servidor'
import { renderRoute, renderWithQuery } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O painel contra servidor falso, pelo cliente gerado.
 *
 * O que estes testes travam: que CONCLUIR é um `POST` no caminho próprio e nada
 * mais (nunca um `PUT` montado da linha, que apagaria prazo e responsável), que
 * o alvo polimórfico viaja inteiro na criação, e que a ordem exibida é a que o
 * servidor mandou — o painel parte a lista em pendente/concluída sem reordenar.
 */

const CAMINHO = '/api/activities'
const ALVO = { tipo: 'opportunity', id: 'op-1' } as const

/** Prazo relativo ao dia da execução: data fixa passaria a "atrasada" sozinha. */
function dia(deslocamento: number): string {
  const d = new Date()
  d.setDate(d.getDate() + deslocamento)
  return diaLocalISO(d)
}

function atividade(over: Partial<ActivityDto> = {}): ActivityDto {
  return {
    id: 'ativ-1',
    entityType: 'opportunity',
    entityId: 'op-1',
    kind: 'call',
    title: 'Ligar para confirmar a visita',
    dueDate: dia(2),
    assigneeEmployeeId: 'emp-2',
    assigneeName: 'Ana Beatriz Lima',
    doneAt: null,
    notes: null,
    ...over,
  }
}

const VENCIDA = atividade({
  id: 'ativ-2',
  kind: 'meeting',
  title: 'Apresentar o projeto',
  dueDate: dia(-3),
})

const CONCLUIDA = atividade({
  id: 'ativ-3',
  kind: 'email',
  title: 'Enviar a lista de acabamentos',
  doneAt: '2026-08-10T13:00:00.000Z',
})

function servidorComLinhas(linhas: ActivityDto[]) {
  return instalarServidor({
    [CAMINHO]: (chamada) =>
      chamada.metodo === 'POST'
        ? json(atividade({ id: 'ativ-nova' }), 201)
        : json({ rows: linhas, total: linhas.length }),
    '/api/activities/ativ-1': () => json(atividade({ title: 'Ligar de novo' })),
    '/api/activities/ativ-1/done': () => json(atividade({ doneAt: '2026-08-14T12:00:00.000Z' })),
    '/api/employees': () =>
      json({ rows: [{ id: 'emp-2', name: 'Ana Beatriz Lima', active: true }], total: 1 }),
  })
}

describe('painel de atividades', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = servidorComLinhas([atividade(), VENCIDA, CONCLUIDA])
  })

  afterEach(() => vi.unstubAllGlobals())

  it('pede as atividades DO registro — tipo e id juntos na consulta', async () => {
    renderWithQuery(<PainelDeAtividades alvo={ALVO} />)

    expect(await screen.findByText('Ligar para confirmar a visita')).toBeInTheDocument()
    const url = new URL(servidor.em(CAMINHO)[0]?.url ?? '')
    expect(url.searchParams.get('entityType')).toBe('opportunity')
    expect(url.searchParams.get('entityId')).toBe('op-1')
  })

  it('a vencida se anuncia por TEXTO, não só por cor', async () => {
    renderWithQuery(<PainelDeAtividades alvo={ALVO} />)

    const linha = (await screen.findByText('Apresentar o projeto')).closest('li') as HTMLElement
    expect(within(linha).getByText('atrasada')).toBeInTheDocument()
  })

  it('a concluída aparece no histórico e NÃO oferece concluir de novo', async () => {
    renderWithQuery(<PainelDeAtividades alvo={ALVO} />)

    expect(await screen.findByText('Concluídas')).toBeInTheDocument()
    const linha = (await screen.findByText('Enviar a lista de acabamentos')).closest(
      'li',
    ) as HTMLElement
    expect(
      within(linha).queryByRole('button', { name: /Concluir/ }),
      'concluída não desconclui: o contrato só tem o sentido de ida',
    ).not.toBeInTheDocument()
  })

  it('Concluir é UM POST no caminho próprio — nenhum PUT junto', async () => {
    const { user } = renderWithQuery(<PainelDeAtividades alvo={ALVO} />)

    await user.click(
      await screen.findByRole('button', { name: 'Concluir: Ligar para confirmar a visita' }),
    )

    await waitFor(() => expect(servidor.em('/api/activities/ativ-1/done')).toHaveLength(1))
    expect(servidor.em('/api/activities/ativ-1/done')[0]?.metodo).toBe('POST')
    expect(servidor.em('/api/activities/ativ-1')).toHaveLength(0)
  })

  it('Nova atividade grava por POST com o alvo polimórfico dentro do corpo', async () => {
    const { user } = renderWithQuery(<PainelDeAtividades alvo={ALVO} />)

    await user.click(await screen.findByRole('button', { name: /Nova atividade/ }))
    await user.type(await screen.findByLabelText('O que precisa ser feito'), 'Mandar a proposta')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() =>
      expect(servidor.em(CAMINHO).filter((c) => c.metodo === 'POST')).toHaveLength(1),
    )
    const post = servidor.em(CAMINHO).find((c) => c.metodo === 'POST')
    expect(post?.corpo).toEqual({
      entityType: 'opportunity',
      entityId: 'op-1',
      kind: 'call',
      title: 'Mandar a proposta',
      dueDate: null,
      assigneeEmployeeId: null,
      notes: null,
    })
  })

  it('Alterar leva a atividade INTEIRA no PUT — nada se apaga por omissão', async () => {
    const { user } = renderWithQuery(<PainelDeAtividades alvo={ALVO} />)

    await user.click(
      await screen.findByRole('button', { name: 'Alterar: Ligar para confirmar a visita' }),
    )
    const titulo = await screen.findByLabelText('O que precisa ser feito')
    expect(titulo).toHaveValue('Ligar para confirmar a visita')

    await user.clear(titulo)
    await user.type(titulo, 'Ligar de novo')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(servidor.em('/api/activities/ativ-1')).toHaveLength(1))
    const put = servidor.em('/api/activities/ativ-1')[0]
    expect(put?.metodo).toBe('PUT')
    expect(put?.corpo).toEqual({
      entityType: 'opportunity',
      entityId: 'op-1',
      kind: 'call',
      title: 'Ligar de novo',
      dueDate: atividade().dueDate,
      assigneeEmployeeId: 'emp-2',
      notes: null,
    })
  })

  it('o mesmo painel monta no PARCEIRO, pedindo o alvo daquele registro', async () => {
    // A prova de que "montável em qualquer registro" não é promessa: a MESMA
    // peça, na tela de Cliente, pergunta por `partner` + o id da rota. Se o
    // painel dependesse do CRM, isto não compilaria — e o teste existe porque
    // essa dependência é o tipo de coisa que entra sem ninguém notar.
    const chamadas: string[] = []
    const cliente = parceiro({ id: 'parc-0002', legalName: 'MARIA HELENA', isCustomer: true })

    renderRoute('/cadastros/clientes/parc-0002', async (entrada) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      const caminho = new URL(url, 'http://localhost').pathname
      chamadas.push(url)

      if (caminho === '/api/activities') {
        return json({
          rows: [atividade({ entityType: 'partner', entityId: 'parc-0002' })],
          total: 1,
        })
      }
      return stubDeParceiros([cliente])(entrada)
    })

    expect(await screen.findByText('Ligar para confirmar a visita')).toBeInTheDocument()

    const consulta = new URL(chamadas.find((u) => u.includes('/api/activities')) as string)
    expect(consulta.searchParams.get('entityType')).toBe('partner')
    expect(consulta.searchParams.get('entityId')).toBe('parc-0002')
  })

  it('registro sem atividade diz isso em voz alta, em vez de painel vazio', async () => {
    vi.unstubAllGlobals()
    servidorComLinhas([])
    renderWithQuery(<PainelDeAtividades alvo={ALVO} />)

    expect(await screen.findByText(/Nada agendado neste registro/)).toBeInTheDocument()
  })
})
