import type { CrmOpportunityDto } from '@/api/gerado'
import { json, problema } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A conversão vista da TELA.
 *
 * O que estes testes travam: que a regra conhecida (lead sem cadastro não vira
 * orçamento) é antecipada pela tela em vez de virar 400 na cara do operador, e
 * que a conversão é UMA requisição — se a tela mandasse `POST /api/quotes` e
 * depois `PUT` na oportunidade, este teste veria as duas.
 */

const ETAPA = {
  id: 'etapa-1',
  pipelineId: 'funil-1',
  name: 'Contato',
  sort: 1,
  probability: 100_000,
  isWon: false,
  isLost: false,
  rotDays: null,
}

function oportunidade(over: Partial<CrmOpportunityDto> = {}): CrmOpportunityDto {
  return {
    id: 'op-1',
    name: 'Casa Jardim — iluminação',
    pipelineId: 'funil-1',
    pipelineName: 'Venda de projeto',
    stageId: 'etapa-1',
    stageName: 'Contato',
    order: 1,
    partnerId: 'parc-1',
    partnerName: 'MARIA HELENA',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    ownerEmployeeId: null,
    ownerName: null,
    expectedValueCents: 4_500_000,
    expectedCloseDate: '2026-09-30',
    source: null,
    stageChangedAt: '2026-08-10T12:00:00Z',
    lostReasonId: null,
    lostReasonName: null,
    quoteId: null,
    closedAt: null,
    ...over,
  }
}

function servidor(registro: CrmOpportunityDto) {
  const chamadas: { metodo: string; caminho: string }[] = []

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = String(requisicao ? requisicao.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname
    const metodo = (requisicao?.method ?? 'GET').toUpperCase()
    if (metodo !== 'GET') chamadas.push({ metodo, caminho })

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/crm/pipelines') {
      return json({
        rows: [{ id: 'funil-1', name: 'Venda de projeto', sort: 1, isDefault: true, active: true }],
        total: 1,
      })
    }
    if (caminho === '/api/crm/pipelines/funil-1/stages') return json([ETAPA])
    if (caminho === '/api/crm/lost-reasons') return json({ rows: [], total: 0 })
    if (caminho === '/api/employees') return json({ rows: [], total: 0 })
    if (caminho === '/api/crm/opportunities/op-1') return json(registro)
    if (caminho === '/api/crm/opportunities/op-1/quote') {
      return json({ id: 'orc-99', number: '21700', items: [], environments: [] }, 201)
    }
    return problema(404, `sem stub: ${caminho}`)
  }

  return { stub, chamadas }
}

describe('gerar orçamento na tela da oportunidade', () => {
  it('lead SEM cadastro não oferece o botão ativo — a regra é antecipada', async () => {
    const { stub } = servidor(
      oportunidade({ partnerId: null, partnerName: null, contactName: 'Marina' }),
    )
    renderRoute('/crm/oportunidades/op-1', stub)

    const botao = await screen.findByRole('button', { name: /Gerar orçamento/ })
    expect(botao).toBeDisabled()
    expect(screen.getByText(/Lead sem cadastro não vira orçamento/)).toBeInTheDocument()
  })

  it('com cliente, gerar é UMA requisição no caminho próprio', async () => {
    const { stub, chamadas } = servidor(oportunidade())
    const { user } = renderRoute('/crm/oportunidades/op-1', stub)

    await user.click(await screen.findByRole('button', { name: /Gerar orçamento/ }))

    await waitFor(() => expect(chamadas.length).toBeGreaterThan(0))
    expect(chamadas).toEqual([{ metodo: 'POST', caminho: '/api/crm/opportunities/op-1/quote' }])
    // Nenhum `POST /api/quotes` nem `PUT` na oportunidade: a atomicidade é do
    // servidor, e a tela não a simula com duas chamadas.
    expect(chamadas.some((c) => c.caminho === '/api/quotes')).toBe(false)
  })

  it('já convertida mostra o LINK, e não o botão', async () => {
    const { stub } = servidor(oportunidade({ quoteId: 'orc-42' }))
    renderRoute('/crm/oportunidades/op-1', stub)

    const link = await screen.findByRole('link', { name: /abrir o documento/ })
    expect(link).toHaveAttribute('href', '/vendas/orcamentos/orc-42')
    expect(screen.queryByRole('button', { name: /Gerar orçamento/ })).not.toBeInTheDocument()
  })
})
