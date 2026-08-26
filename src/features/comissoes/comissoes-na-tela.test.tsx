import type { CommissionTierDto, OrderParticipantDto, TechnicalReserveDto } from '@/api/gerado'
import { FaixasDeComissao } from '@/features/comissoes/faixas-de-comissao'
import {
  ParticipacaoDoPedido,
  umPrincipalPorPapel,
} from '@/features/comissoes/participacao-do-pedido'
import { TelaDeReservaTecnica } from '@/features/comissoes/reserva-tecnica'
import { instalarServidor, json } from '@/test/servidor'
import { renderWithQuery, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * AS TRÊS TELAS DE COMISSÃO contra servidor falso.
 *
 * O que estes casos vigiam não é o desenho: é o que a tela MANDA. A participação
 * tem de ecoar o `id` (senão o congelamento se perde), a Reserva Técnica não pode
 * mandar valor (senão o cliente afirma quanto o profissional ganha), e a faixa
 * de grupo nulo tem de aparecer como GERAL (senão vira grupo em branco, que é o
 * único jeito de o operador achar que falta dado onde há significado).
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

const FAIXA_GERAL: CommissionTierDto = {
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

let servidor: ReturnType<typeof instalarServidor>

beforeEach(() => {
  servidor = instalarServidor({
    [URL_PARTICIPANTES]: () => json({ rows: [PARTICIPANTE], total: 1 }),
    [URL_FAIXAS]: () => json({ rows: [FAIXA_GERAL], total: 1 }),
    [URL_RESERVAS]: () => json({ rows: [RESERVA], total: 1 }),
    // As listas de apoio das telas: colaboradores (combo do atendente),
    // parceiros com papel `professional` (combo do profissional) e o kind
    // `GRUPO_PRODUTO`, que hoje volta VAZIO — é o caso que a tela declara.
    '/api/employees': () => json({ rows: [{ id: 'emp-1', name: 'ANA', active: true }], total: 1 }),
    '/api/partners': () => json({ rows: [], total: 0 }),
    '/api/catalog-lookups': () => json({ rows: [], total: 0 }),
    // A tela da RT esconde controle por PAPEL (`useReadOnlyPorPapel`), e o papel
    // vem do vínculo — sem sessão e vínculos a tela nem monta.
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('participação do pedido', () => {
  it('mostra quem participa e as faixas congeladas do documento', async () => {
    renderWithQuery(<ParticipacaoDoPedido pedidoId="ped-1" />)

    expect((await screen.findAllByText('ANA')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Faixas congeladas neste pedido')).toBeInTheDocument()
    expect(await screen.findByText('PENDENTES')).toBeInTheDocument()
  })

  it('o Gravar ECOA o `id` da linha que veio do servidor', async () => {
    const { user } = renderWithQuery(<ParticipacaoDoPedido pedidoId="ped-1" />)

    await screen.findAllByText('ANA')
    await user.click(screen.getByRole('button', { name: 'Gravar participação' }))

    await waitFor(() => {
      expect(servidor.em(URL_PARTICIPANTES).some((c) => c.metodo === 'PUT')).toBe(true)
    })
    const escrita = servidor.em(URL_PARTICIPANTES).find((c) => c.metodo === 'PUT')
    const corpo = escrita?.corpo as { participants: Record<string, unknown>[] }
    // SEM este eco, o `PUT` integral recopiaria o perfil de hoje, e a apuração
    // do mês passado mudaria de valor sozinha.
    expect(corpo.participants[0]?.id).toBe('part-1')
  })

  it('sem documento gravado, diz por que a grade ainda não está lá', () => {
    renderWithQuery(<ParticipacaoDoPedido pedidoId={null} />)
    expect(screen.getByText(/pende do documento, que ainda não existe/)).toBeInTheDocument()
  })

  it('um principal por papel: a última marcada é a que vale', () => {
    const linhas = umPrincipalPorPapel([
      linha({ id: 'a', papel: 'attendant', principal: true }),
      linha({ id: 'b', papel: 'attendant', principal: true }),
      linha({ id: 'c', papel: 'professional', principal: true }),
    ])

    expect(linhas.map((l) => l.principal)).toEqual([false, true, true])
  })
})

describe('faixas do perfil', () => {
  it('a faixa de grupo nulo aparece como GERAL, e não como grupo em branco', async () => {
    renderWithQuery(<FaixasDeComissao porta="partner" pessoaId="prof-1" />)

    expect(await screen.findByText('Faixa geral')).toBeInTheDocument()
  })

  it('sem grupo de produto na empresa, a tela DIZ que só a faixa geral entra', async () => {
    renderWithQuery(<FaixasDeComissao porta="partner" pessoaId="prof-1" />)

    expect(await screen.findByText(/só a/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incluir faixa geral' })).toBeEnabled()
    // O botão do grupo existe e fica desabilitado enquanto não há grupo
    // escolhido — não some, para o operador saber que a faixa por grupo existe.
    expect(screen.getByRole('button', { name: 'Incluir faixa do grupo' })).toBeDisabled()
  })
})

describe('reserva técnica', () => {
  it('lista o lançamento com o valor quebrado por natureza', async () => {
    renderWithQuery(<TelaDeReservaTecnica />)

    expect(await screen.findByText('21653')).toBeInTheDocument()
    expect(screen.getByText('STUDIO X')).toBeInTheDocument()
    // Produto e serviço pagam por regras diferentes: um total único apagaria a
    // distinção que decide o número.
    expect(screen.getByRole('columnheader', { name: 'Produto' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Serviço' })).toBeInTheDocument()
  })

  it('o recorte de situação viaja como `status` do contrato', async () => {
    const { user } = renderWithQuery(<TelaDeReservaTecnica />)

    await screen.findByText('21653')
    await user.selectOptions(screen.getByLabelText('Situação'), 'cancelled')

    await waitFor(() => {
      const ultima = servidor.em(URL_RESERVAS).at(-1)
      expect(new URL(ultima?.url ?? '').searchParams.get('status')).toBe('cancelled')
    })
  })

  it('o diálogo de lançamento não pede valor', async () => {
    const { user } = renderWithQuery(<TelaDeReservaTecnica />)

    await screen.findByText('21653')
    await user.click(screen.getByRole('button', { name: /Lançar/ }))

    const dialogo = await screen.findByRole('dialog')
    expect(
      within(dialogo).getByText(/o servidor o calcula sobre a participação/),
    ).toBeInTheDocument()
    expect(within(dialogo).queryByLabelText(/Valor/i)).not.toBeInTheDocument()
  })
})

function linha(over: { id: string; papel: 'attendant' | 'professional'; principal: boolean }) {
  return {
    colaboradorId: null,
    parceiroId: null,
    nome: over.id,
    percentual: null,
    vigenciaDe: null,
    ...over,
  }
}
