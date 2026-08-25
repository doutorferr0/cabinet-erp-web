import type { CommissionTierDto, OrderParticipantDto, TechnicalReserveDto } from '@/api/gerado'
import {
  ORDENAVEIS_FAIXA,
  ORDENAVEIS_PARTICIPACAO,
  ORDENAVEIS_RESERVA_TECNICA,
  cancelarReservaTecnica,
  faixaDoContrato,
  faixaParaContrato,
  gravarParticipantes,
  lancarReservaTecnica,
  listarParticipantes,
  listarReservasTecnicas,
  participanteParaContrato,
} from '@/data/comissoes-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * FRONTEIRA DAS COMISSÕES contra servidor falso.
 *
 * O que se afirma aqui é a TRADUÇÃO, e nesta família ela vale dinheiro: o
 * percentual tem 4 casas ESCALADAS, o `null` do percentual significa "use o
 * perfil" e não zero, e o `id` da linha é o que preserva o congelamento. Nenhum
 * dos três quebra teste de tela quando erra — os três gravam o número errado,
 * calados.
 */

const PARTICIPANTE: OrderParticipantDto = {
  id: 'part-1',
  role: 'attendant',
  employeeId: 'emp-1',
  employeeName: 'ANA',
  partnerId: null,
  partnerName: null,
  personName: 'ANA',
  percent: 30_000,
  isPrincipal: true,
  validFrom: null,
  tiers: [
    {
      productGroupId: 'grp-1',
      productGroupName: 'PENDENTES',
      operator: '<=',
      discountPercent: 100_000,
      percent: 30_000,
    },
  ],
}

const FAIXA: CommissionTierDto = {
  id: 'faixa-1',
  productGroupId: null,
  productGroupName: null,
  operator: '>=',
  discountPercent: 0,
  percent: 25_000,
  active: true,
}

const RESERVA: TechnicalReserveDto = {
  id: 'rt-1',
  orderId: 'ped-1',
  orderNumber: '21653',
  partnerId: 'prof-1',
  partnerName: 'STUDIO X',
  kind: 'project',
  status: 'active',
  productCents: 120_000,
  serviceCents: 30_000,
  totalCents: 150_000,
  issuedAt: '2026-08-20',
  note: null,
  cancelledAt: null,
}

const URL_PARTICIPANTES = '/api/orders/ped-1/participants'
const URL_FAIXAS = '/api/partners/prof-1/commission-tiers'
const URL_RESERVAS = '/api/technical-reserves'

describe('fronteira das comissões', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      [URL_PARTICIPANTES]: () => json({ rows: [PARTICIPANTE], total: 1 }),
      [URL_FAIXAS]: () => json({ rows: [FAIXA], total: 1 }),
      [URL_RESERVAS]: () => json({ rows: [RESERVA], total: 1 }),
      [`${URL_RESERVAS}/rt-1/cancel`]: () => json({ ...RESERVA, status: 'cancelled' }),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('a leitura da participação traz as faixas congeladas junto', async () => {
    const linhas = await listarParticipantes('ped-1')

    expect(linhas[0]).toMatchObject({
      id: 'part-1',
      papel: 'attendant',
      colaboradorId: 'emp-1',
      nome: 'ANA',
      percentual: 30_000,
      principal: true,
    })
    expect(linhas[0]?.faixas).toEqual([
      {
        grupoId: 'grp-1',
        grupoNome: 'PENDENTES',
        operador: '<=',
        descontoPercentual: 100_000,
        percentual: 30_000,
      },
    ])
  })

  /**
   * O ECO DE `id` — o teste que existe para o congelamento não se perder.
   *
   * Linha que veio da leitura volta com o mesmo `id`, e é isso que diz ao
   * servidor "mantenha as faixas desta linha". Se um dia a tradução resolver
   * limpar o `id` (por parecer campo de leitura), o `PUT` recopiaria o perfil de
   * hoje num documento antigo — e nenhuma tela mostraria diferença.
   */
  it('o PUT ecoa o `id` de cada linha que já existe', async () => {
    const linhas = await listarParticipantes('ped-1')
    await gravarParticipantes('ped-1', linhas)

    const escrita = servidor.em(URL_PARTICIPANTES).find((c) => c.metodo === 'PUT')
    expect(escrita?.corpo).toEqual({
      participants: [
        {
          id: 'part-1',
          role: 'attendant',
          employeeId: 'emp-1',
          partnerId: null,
          percent: 30_000,
          isPrincipal: true,
          validFrom: null,
        },
      ],
    })
  })

  it('linha nova vai SEM `id` — é nela que o servidor copia o perfil de hoje', () => {
    const corpo = participanteParaContrato({
      id: null,
      papel: 'professional',
      colaboradorId: null,
      parceiroId: 'prof-1',
      nome: 'STUDIO X',
      percentual: null,
      principal: false,
      vigenciaDe: null,
    })

    expect(corpo.id).toBeNull()
    // `null` no percentual NÃO é zero: é "use o perfil". Trocar um pelo outro é
    // a diferença entre pagar o cadastro e não pagar nada.
    expect(corpo.percent).toBeNull()
    expect(corpo.employeeId).toBeNull()
    expect(corpo.partnerId).toBe('prof-1')
  })

  it('as faixas NÃO viajam na escrita da participação', async () => {
    const linhas = await listarParticipantes('ped-1')
    await gravarParticipantes('ped-1', linhas)

    const escrita = servidor.em(URL_PARTICIPANTES).find((c) => c.metodo === 'PUT')
    const corpo = escrita?.corpo as { participants: Record<string, unknown>[] }
    expect(corpo.participants[0]).not.toHaveProperty('tiers')
    expect(corpo.participants[0]).not.toHaveProperty('faixas')
  })

  it('a faixa GERAL do perfil é a de grupo nulo, e ela volta como tal', () => {
    const linha = faixaDoContrato(FAIXA)
    expect(linha.grupoId).toBeNull()
    expect(faixaParaContrato(linha)).toEqual({
      id: 'faixa-1',
      productGroupId: null,
      operator: '>=',
      discountPercent: 0,
      percent: 25_000,
      active: true,
    })
  })

  it('o recorte da Reserva Técnica viaja nos parâmetros que o contrato publica', async () => {
    await listarReservasTecnicas(tableState({ page: 1, pageSize: 25 }), {
      situacao: 'active',
      de: '2026-08-01',
      ate: '2026-08-31',
      parceiroId: 'prof-1',
    })

    const url = new URL(servidor.em(URL_RESERVAS)[0]?.url ?? '')
    expect(url.searchParams.get('status')).toBe('active')
    expect(url.searchParams.get('from')).toBe('2026-08-01')
    expect(url.searchParams.get('to')).toBe('2026-08-31')
    expect(url.searchParams.get('partnerId')).toBe('prof-1')
  })

  it('o lançamento da RT não manda valor — quem calcula é o servidor', async () => {
    await lancarReservaTecnica({ orderId: 'ped-1', partnerId: 'prof-1', kind: 'project' })

    const escrita = servidor.em(URL_RESERVAS).find((c) => c.metodo === 'POST')
    const corpo = escrita?.corpo as Record<string, unknown>
    expect(corpo).toEqual({ orderId: 'ped-1', partnerId: 'prof-1', kind: 'project' })
    expect(corpo).not.toHaveProperty('totalCents')
    expect(corpo).not.toHaveProperty('productCents')
  })

  it('cancelar é POST no caminho próprio — não há DELETE nem PUT de situação', async () => {
    const cancelada = await cancelarReservaTecnica('rt-1')

    const chamada = servidor.em(`${URL_RESERVAS}/rt-1/cancel`)[0]
    expect(chamada?.metodo).toBe('POST')
    expect(cancelada.status).toBe('cancelled')
  })

  it('falha do servidor não vira lista vazia', async () => {
    vi.unstubAllGlobals()
    instalarServidor({
      [URL_PARTICIPANTES]: () => problema(500, 'Falhou.'),
    })

    await expect(listarParticipantes('ped-1')).rejects.toThrow()
  })

  /**
   * A whitelist publicada × a que o front manda.
   *
   * É a mesma régua de `whitelist-do-contrato.test.ts`, aplicada aqui porque
   * estas três listagens acabaram de ganhar tela: coluna cujo `sortBy` o
   * servidor não aceita quebra a ordenação com 400 só ao clicar no cabeçalho.
   */
  it.each([
    ['/api/orders/{id}/participants', ORDENAVEIS_PARTICIPACAO],
    ['/api/partners/{id}/commission-tiers', ORDENAVEIS_FAIXA],
    ['/api/employees/{id}/commission-tiers', ORDENAVEIS_FAIXA],
    ['/api/technical-reserves', ORDENAVEIS_RESERVA_TECNICA],
  ])('a whitelist de %s é a que o contrato escreve', (caminho, ordenaveis) => {
    const caminhos = contrato.paths as Record<string, Record<string, unknown>>
    const operacao = caminhos[caminho]?.get as {
      parameters?: { name: string; description?: string }[]
    }
    const descricao = operacao?.parameters?.find((p) => p.name === 'sortBy')?.description ?? ''

    for (const campo of ordenaveis) {
      expect(descricao).toContain(`\`${campo}\``)
    }
  })
})
