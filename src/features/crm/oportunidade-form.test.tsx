import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { URL_FUNIS, URL_OPORTUNIDADES } from '@/data/crm-api'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A tela da oportunidade contra servidor falso, pelo cliente gerado.
 *
 * O que estes testes vigiam, além de "gravou": que o `PUT` leva o registro
 * INTEIRO (inclusive o que a tela não edita), que o vínculo com o parceiro
 * grava o ID e não o nome, e que a etapa oferecida é a do funil escolhido —
 * etapa de outro funil é 400 no contrato.
 */

const ID = '5a0d6b21-9c3e-4a77-8f2b-1d4c5e6f7a80'
const PARCEIRO_ID = '9f8e7d6c-5b4a-4392-8172-0a1b2c3d4e5f'

const ETAPAS: CrmStageDto[] = [
  {
    id: 'e1',
    pipelineId: 'funil-1',
    name: 'Contato',
    sort: 1,
    probability: 100_000,
    isWon: false,
    isLost: false,
    rotDays: null,
  },
  {
    id: 'e2',
    pipelineId: 'funil-1',
    name: 'Proposta',
    sort: 2,
    probability: 500_000,
    isWon: false,
    isLost: false,
    rotDays: null,
  },
]

const DTO: CrmOpportunityDto = {
  id: ID,
  name: 'Casa Jardim',
  pipelineId: 'funil-1',
  pipelineName: 'Venda de projeto',
  stageId: 'e1',
  stageName: 'Contato',
  order: 1,
  partnerId: null,
  partnerName: null,
  contactName: 'Marina',
  contactEmail: 'marina@exemplo.dev',
  contactPhone: '11988887777',
  ownerEmployeeId: null,
  ownerName: null,
  expectedValueCents: 4_500_000,
  expectedCloseDate: '2026-09-30',
  source: 'indicação',
  stageChangedAt: '2026-08-10T12:00:00Z',
  lostReasonId: null,
  lostReasonName: null,
  // Vínculo com o orçamento: a TELA NÃO EDITA, e é justamente por isso que ele
  // está aqui — o `PUT` inteiro tem de devolvê-lo.
  quoteId: 'c0ffee00-1111-4222-8333-444455556666',
  closedAt: null,
}

function servidor(extra: Record<string, () => Response> = {}): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    const rota = extra[caminho]
    if (rota) return Promise.resolve(rota())

    if (caminho === URL_FUNIS) {
      return Promise.resolve(
        json({
          rows: [
            { id: 'funil-1', name: 'Venda de projeto', sort: 1, isDefault: true, active: true },
          ],
          total: 1,
        }),
      )
    }
    if (caminho === `${URL_FUNIS}/funil-1/stages`) return Promise.resolve(json(ETAPAS))
    if (caminho === '/api/crm/lost-reasons') return Promise.resolve(json({ rows: [], total: 0 }))
    if (caminho === '/api/employees') return Promise.resolve(json({ rows: [], total: 0 }))
    if (caminho === `${URL_OPORTUNIDADES}/${ID}`) return Promise.resolve(json(DTO))
    if (caminho === '/api/partners') {
      return Promise.resolve(
        json({
          rows: [
            {
              id: PARCEIRO_ID,
              code: 'C-010',
              legalName: 'MARIA HELENA ARQUITETURA ME',
              tradeName: 'MH ARQUITETURA',
              document: '55666777000188',
              email: null,
              isCustomer: true,
              isSupplier: false,
              isProfessional: false,
              registrationActive: true,
              active: true,
              paymentTerms: null,
            },
          ],
          total: 1,
        }),
      )
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

/** Servidor que aceita escrita e guarda verbo, caminho e corpo. */
function comEscrita() {
  const escritas: { metodo: string; caminho: string; corpo: unknown }[] = []
  const base = servidor()
  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const texto = await requisicao.clone().text()
      escritas.push({
        metodo: requisicao.method.toUpperCase(),
        caminho: new URL(requisicao.url, 'http://localhost').pathname,
        corpo: texto ? JSON.parse(texto) : null,
      })
      return json(DTO, requisicao.method.toUpperCase() === 'POST' ? 201 : 200)
    }
    return base(entrada)
  }
  return { stub, escritas }
}

describe('formulário da oportunidade', () => {
  it('carrega o registro do servidor, com o contato do lead', async () => {
    renderRoute(`/crm/oportunidades/${ID}`, servidor())

    expect(await screen.findByLabelText('Título do negócio')).toHaveValue('Casa Jardim')
    expect(screen.getByLabelText('Contato')).toHaveValue('Marina')
    // Centavos no dado, reais na borda de exibição.
    expect(screen.getByLabelText('Valor previsto')).toHaveValue('45000,00')
    expect(screen.getByLabelText('Previsão de fechamento')).toHaveValue('2026-09-30')
  })

  it('a ETAPA oferecida é a do funil escolhido — a de outro funil é 400', async () => {
    renderRoute(`/crm/oportunidades/${ID}`, servidor())

    const etapa = await screen.findByLabelText('Etapa')
    expect(etapa).toHaveValue('e1')
    expect(await screen.findByRole('option', { name: 'Proposta' })).toBeInTheDocument()
  })

  it('o PUT leva o registro INTEIRO, inclusive o que a tela não edita', async () => {
    const { stub, escritas } = comEscrita()
    const { user } = renderRoute(`/crm/oportunidades/${ID}`, stub)

    const titulo = await screen.findByLabelText('Título do negócio')
    await user.clear(titulo)
    await user.type(titulo, 'Casa Jardim — fase 2')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'PUT', caminho: `${URL_OPORTUNIDADES}/${ID}` })
    expect(escritas[0]?.corpo).toEqual({
      name: 'Casa Jardim — fase 2',
      pipelineId: 'funil-1',
      stageId: 'e1',
      partnerId: null,
      contactName: 'Marina',
      contactEmail: 'marina@exemplo.dev',
      contactPhone: '11988887777',
      ownerEmployeeId: null,
      expectedValueCents: 4_500_000,
      expectedCloseDate: '2026-09-30',
      source: 'indicação',
      lostReasonId: null,
      // A prova do carregado-não-editado: sem ele, gravar o título apagaria o
      // vínculo com o orçamento e ninguém veria.
      quoteId: 'c0ffee00-1111-4222-8333-444455556666',
    })
  })

  it('a janela de busca grava o ID do parceiro, não o nome', async () => {
    const { stub, escritas } = comEscrita()
    const { user } = renderRoute(`/crm/oportunidades/${ID}`, stub)

    await user.click(await screen.findByRole('button', { name: 'Buscar parceiro' }))
    await user.click(await screen.findByText('MARIA HELENA ARQUITETURA ME'))
    await user.click(screen.getByRole('button', { name: 'Selecionar' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Parceiro escolhido')).toHaveValue(
        'MARIA HELENA ARQUITETURA ME',
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Gravar' }))
    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.corpo).toMatchObject({ partnerId: PARCEIRO_ID })
  })

  it('Incluir vindo do quadro nasce na etapa da coluna clicada', async () => {
    const { stub, escritas } = comEscrita()
    const { user } = renderRoute('/crm/oportunidades/novo?funilId=funil-1&etapaId=e2', stub)

    await user.type(await screen.findByLabelText('Título do negócio'), 'Lead do site')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'POST', caminho: URL_OPORTUNIDADES })
    expect(escritas[0]?.corpo).toMatchObject({
      name: 'Lead do site',
      pipelineId: 'funil-1',
      stageId: 'e2',
    })
  })

  it('campo de texto vazio vira null, não string vazia', async () => {
    const { stub, escritas } = comEscrita()
    const { user } = renderRoute('/crm/oportunidades/novo', stub)

    await user.type(await screen.findByLabelText('Título do negócio'), 'Só o título')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    // Ausência é `null`: string vazia no banco viraria um contato que existe e
    // é branco, diferente de contato que não existe.
    expect(escritas[0]?.corpo).toMatchObject({
      contactName: null,
      source: null,
      expectedCloseDate: null,
      pipelineId: null,
      stageId: null,
    })
  })

  it('modo consulta abre sem Gravar e sem a lupa da busca', async () => {
    renderRoute(`/crm/oportunidades/${ID}?modo=consulta`, servidor())

    expect(await screen.findByLabelText('Título do negócio')).toHaveValue('Casa Jardim')
    expect(screen.queryByRole('button', { name: 'Gravar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buscar parceiro' })).not.toBeInTheDocument()
  })
})
