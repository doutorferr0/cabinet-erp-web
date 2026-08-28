import type { ApprovalRequestDto } from '@/api/gerado'
import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A TELA da fila de aprovações (F12), pelo router real.
 *
 * O que estes casos travam é o que a tela DECIDE — e ela decide pouco de
 * propósito, porque quem manda é o servidor:
 *
 * 1. O botão de decidir existe conforme o `canDecide` DA LINHA, não conforme o
 *    papel. É a diferença entre o pedido do colega e o próprio.
 * 2. Recusar sem motivo não sai da tela: o contrato exige, e mandar corpo
 *    sabidamente inválido faria o defeito daqui chegar com cara de erro do
 *    servidor.
 * 3. Recusar COM motivo manda `reason` no corpo do `POST .../reject` — asserir
 *    o textarea não prova nada: o campo pode estar preenchido e o corpo vazio.
 */

function pedido(over: Partial<ApprovalRequestDto> = {}): ApprovalRequestDto {
  return {
    id: 'apr-1',
    kind: 'quote-discount',
    status: 'pending',
    subjectType: 'quote',
    subjectId: 'orc-1',
    subjectLabel: '21653',
    customerName: 'ANDRÉ BATALHA',
    requestedByEmployeeId: 'emp-2',
    requestedByName: 'BEATRIZ CAMARGO',
    requestedAt: '2026-08-25T13:20:00.000Z',
    requestedPercent: 180000,
    limitPercent: 100000,
    discountCents: 45_000,
    documentTotalCents: 205_000,
    decidedAt: null,
    decidedByEmployeeId: null,
    decidedByName: null,
    decisionReason: null,
    canDecide: true,
    ...over,
  }
}

/** As chamadas de escrita, para asserir o CORPO e não a tela. */
let enviados: { caminho: string; corpo: unknown }[] = []

function servidorDaFila(linhas: ApprovalRequestDto[], resumoPendentes = 1) {
  return async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const requisicao = entrada instanceof Request ? entrada : new Request(String(entrada), init)
    const caminho = new URL(requisicao.url, 'http://localhost').pathname
    const corpoJson = (valor: unknown) =>
      new Response(JSON.stringify(valor), { headers: { 'content-type': 'application/json' } })

    if (caminho === '/auth/me') {
      return corpoJson({
        organizationId: 'org-1',
        employeeId: 'emp-admin',
        activeTenantId: 'tenant-1',
        expiresAt: '2099-01-01T00:00:00.000Z',
        mustChangePassword: false,
      })
    }
    if (caminho === '/auth/tenants') {
      return corpoJson([{ tenantId: 'tenant-1', name: 'Vertz Matriz', role: 'admin' }])
    }
    if (caminho === '/api/catalog-lookups') return corpoJson({ rows: [], total: 0 })
    if (caminho === '/api/approval-requests/summary') {
      return corpoJson({ pendingCount: resumoPendentes, canDecide: true })
    }
    if (caminho === '/api/approval-requests') {
      return corpoJson({ rows: linhas, total: linhas.length })
    }
    if (requisicao.method === 'POST' && caminho.startsWith('/api/approval-requests/')) {
      enviados.push({ caminho, corpo: await requisicao.clone().json() })
      const decidido = caminho.endsWith('/approve') ? 'approved' : 'rejected'
      return corpoJson(pedido({ status: decidido, canDecide: false }))
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${requisicao.url}`))
  }
}

beforeEach(() => {
  enviados = []
})
afterEach(() => vi.unstubAllGlobals())

describe('a fila mostra o que espera decisão', () => {
  it('desenha a linha com documento, cliente, quem pediu e o desconto', async () => {
    renderRoute('/vendas/aprovacoes', servidorDaFila([pedido()]))

    expect(await screen.findByRole('heading', { name: 'Aprovações' })).toBeInTheDocument()
    expect(await screen.findByText('21653')).toBeInTheDocument()
    expect(screen.getByText('ANDRÉ BATALHA')).toBeInTheDocument()
    expect(screen.getByText('BEATRIZ CAMARGO')).toBeInTheDocument()
    // O desconto em DINHEIRO é a régua da decisão, e por isso tem coluna
    // própria: 18% de mil e 18% de duzentos mil são a mesma pílula e duas
    // decisões diferentes.
    expect(screen.getByText('R$ 450,00')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('o contador da barra aparece com o que ESTA sessão pode decidir', async () => {
    renderRoute('/vendas/aprovacoes', servidorDaFila([pedido()], 3))
    expect(await screen.findByLabelText('3 pedidos pendentes')).toBeInTheDocument()
  })

  it('sem pendência decidível o contador SOME — badge zerado é ruído permanente', async () => {
    renderRoute('/vendas/aprovacoes', servidorDaFila([pedido()], 0))

    await screen.findByText('21653')
    expect(screen.queryByLabelText(/pedidos? pendentes?/)).not.toBeInTheDocument()
  })
})

describe('decidir', () => {
  it('a linha ABRE o pedido, com os dois botões de quem pode decidir', async () => {
    const { user } = renderRoute('/vendas/aprovacoes', servidorDaFila([pedido()]))

    await user.click(await screen.findByText('21653'))

    const folha = await screen.findByRole('dialog')
    expect(within(folha).getByText('Orçamento 21653')).toBeInTheDocument()
    expect(within(folha).getByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
    expect(within(folha).getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
  })

  it('recusar SEM motivo não sai da tela — o contrato o exige', async () => {
    const { user } = renderRoute('/vendas/aprovacoes', servidorDaFila([pedido()]))

    await user.click(await screen.findByText('21653'))
    const folha = await screen.findByRole('dialog')
    await user.click(within(folha).getByRole('button', { name: 'Recusar' }))

    expect(
      await within(folha).findByText('Diga por que o desconto não passou.'),
    ).toBeInTheDocument()
    expect(enviados).toHaveLength(0)
  })

  it('recusar com motivo manda `reason` NO CORPO do POST de recusa', async () => {
    const { user } = renderRoute('/vendas/aprovacoes', servidorDaFila([pedido()]))

    await user.click(await screen.findByText('21653'))
    const folha = await screen.findByRole('dialog')
    await user.type(within(folha).getByLabelText(/Motivo/), 'Margem fica negativa.')
    await user.click(within(folha).getByRole('button', { name: 'Recusar' }))

    // O corpo, e não o textarea: o campo pode estar preenchido e a requisição
    // sair vazia, e nenhuma asserção sobre a tela pegaria isso.
    await waitFor(() => expect(enviados).toHaveLength(1))
    expect(enviados[0]?.caminho).toBe('/api/approval-requests/apr-1/reject')
    expect(enviados[0]?.corpo).toEqual({ reason: 'Margem fica negativa.' })
  })

  it('aprovar bate no caminho de APROVAR, e o motivo é opcional lá', async () => {
    const { user } = renderRoute('/vendas/aprovacoes', servidorDaFila([pedido()]))

    await user.click(await screen.findByText('21653'))
    const folha = await screen.findByRole('dialog')
    await user.click(within(folha).getByRole('button', { name: 'Aprovar' }))

    await waitFor(() => expect(enviados).toHaveLength(1))
    expect(enviados[0]?.caminho).toBe('/api/approval-requests/apr-1/approve')
    expect(enviados[0]?.corpo).toEqual({ reason: null })
  })

  it('o PRÓPRIO pedido abre sem botão, e diz por quê', async () => {
    const meu = pedido({ requestedByEmployeeId: 'emp-admin', canDecide: false })
    const { user } = renderRoute('/vendas/aprovacoes', servidorDaFila([meu]))

    await user.click(await screen.findByText('21653'))
    const folha = await screen.findByRole('dialog')

    // Sem esta frase a folha lê como defeito: o operador TEM o papel e não vê
    // botão. O que falta não é acesso, é outra pessoa.
    expect(within(folha).getByText(/quem pede o desconto não decide/i)).toBeInTheDocument()
    expect(within(folha).queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    expect(within(folha).queryByRole('button', { name: 'Recusar' })).not.toBeInTheDocument()
  })

  it('pedido já decidido mostra o MOTIVO e nenhuma saída', async () => {
    const decidido = pedido({
      status: 'rejected',
      canDecide: false,
      decidedAt: '2026-08-26T10:00:00.000Z',
      decidedByName: 'Henrique',
      decisionReason: 'Margem fica negativa. Refaça em 2%.',
    })
    const { user } = renderRoute('/vendas/aprovacoes', servidorDaFila([decidido]))

    await user.click(await screen.findByText('21653'))
    const folha = await screen.findByRole('dialog')

    expect(within(folha).getByText(/Refaça em 2%/)).toBeInTheDocument()
    expect(within(folha).queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
  })
})
