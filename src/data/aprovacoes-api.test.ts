import type { ApprovalRequestDto } from '@/api/gerado'
import { ErroDaApi } from '@/data/api-provider'
import { ORDENAVEIS_APROVACAO, filaDeAprovacoes } from '@/data/aprovacoes-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A fronteira da fila contra SERVIDOR FALSO, nunca contra mock do módulo.
 *
 * O cliente gerado chama `fetch(new Request(...))`: verbo e corpo vêm do
 * `Request`. Aqui isso importa porque o recurso tem `POST` em DOIS caminhos que
 * só diferem na última palavra (`…/approve` e `…/reject`) — stub que casasse só
 * pelo prefixo deixaria aprovar responder pela recusa, e o teste passaria sem
 * asserir nada.
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

const ESTADO_VAZIO = { q: '', sort: null, page: 1, pageSize: 20 }

describe('fronteira da fila de aprovações', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      '/api/approval-requests': () => json({ rows: [pedido()], total: 1 }),
      '/api/approval-requests/summary': () => json({ pendingCount: 2, canDecide: true }),
      '/api/approval-requests/apr-1/approve': () => json(pedido({ status: 'approved' })),
      '/api/approval-requests/apr-1/reject': () => json(pedido({ status: 'rejected' })),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('a listagem manda page/pageSize e devolve o envelope do contrato', async () => {
    const resultado = await filaDeAprovacoes('todos')(ESTADO_VAZIO)

    expect(resultado.total).toBe(1)
    expect(resultado.rows[0]?.id).toBe('apr-1')
    const url = new URL(servidor.em('/api/approval-requests')[0]?.url ?? '')
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('pageSize')).toBe('20')
  })

  it('o status vai como PARÂMETRO PRÓPRIO, e some quando é `todos`', async () => {
    // A operação não publica `filters`: mandar o status por lá seria 400. E
    // `todos` não é valor do enum — mandá-lo devolveria fila vazia com cara de
    // "não há pedido nenhum".
    await filaDeAprovacoes('pending')(ESTADO_VAZIO)
    await filaDeAprovacoes('todos')(ESTADO_VAZIO)

    const chamadas = servidor.em('/api/approval-requests')
    expect(new URL(chamadas[0]?.url ?? '').searchParams.get('status')).toBe('pending')
    expect(new URL(chamadas[1]?.url ?? '').searchParams.get('status')).toBeNull()
  })

  it('a busca e a ordenação viajam com os nomes do contrato', async () => {
    await filaDeAprovacoes('todos')({
      ...ESTADO_VAZIO,
      q: 'batalha',
      sort: { id: 'discountCents', desc: true },
    })

    const url = new URL(servidor.em('/api/approval-requests')[0]?.url ?? '')
    expect(url.searchParams.get('q')).toBe('batalha')
    expect(url.searchParams.get('sortBy')).toBe('discountCents')
    expect(url.searchParams.get('sortDesc')).toBe('true')
  })

  it('sem ordenação escolhida, `sortBy` NÃO viaja — quem tem padrão é o servidor', async () => {
    await filaDeAprovacoes('todos')(ESTADO_VAZIO)
    const url = new URL(servidor.em('/api/approval-requests')[0]?.url ?? '')
    expect(url.searchParams.get('sortBy')).toBeNull()
  })

  it('falha do servidor NUNCA vira lista vazia', async () => {
    vi.unstubAllGlobals()
    instalarServidor({
      '/api/approval-requests': () => problema(500, 'Banco indisponível.'),
    })

    // "Deu erro" e "não há pedido nenhum" pedem reações opostas de quem aprova:
    // uma manda tentar de novo, a outra manda ir trabalhar.
    await expect(filaDeAprovacoes('todos')(ESTADO_VAZIO)).rejects.toBeInstanceOf(ErroDaApi)
  })

  it('pageSize acima do teto falha AQUI, não no 400 do servidor', async () => {
    await expect(filaDeAprovacoes('todos')({ ...ESTADO_VAZIO, pageSize: 500 })).rejects.toThrow(
      /teto de 100/,
    )
  })
})

describe('a whitelist do front é a MESMA do contrato', () => {
  it('`sortBy` publicado bate com `ORDENAVEIS_APROVACAO`', () => {
    const doc = contrato as unknown as {
      paths: Record<string, { get?: { parameters?: { name: string; description?: string }[] } }>
    }
    const parametro = doc.paths['/api/approval-requests']?.get?.parameters?.find(
      (p) => p.name === 'sortBy',
    )
    const publicados = [...(parametro?.description ?? '').matchAll(/`([a-zA-Z]+)`/g)].map(
      (m) => m[1] as string,
    )

    // Os quatro primeiros crases da descrição são a whitelist; o que vem depois
    // do travessão é a explicação de quem ficou de fora.
    expect(publicados.slice(0, 4)).toEqual([...ORDENAVEIS_APROVACAO])
  })

  it('os três nomes CONGELADOS ficam de fora — cabeçalho clicável neles seria 400', () => {
    for (const campo of ['subjectLabel', 'customerName', 'requestedByName']) {
      expect(ORDENAVEIS_APROVACAO).not.toContain(campo)
    }
  })
})
