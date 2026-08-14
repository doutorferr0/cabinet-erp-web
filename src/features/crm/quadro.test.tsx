import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { URL_FUNIS, URL_OPORTUNIDADES } from '@/data/crm-api'
import { agruparPorEtapa, quemDoCartao, somaDaColuna } from '@/features/crm/funil-agrupa'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O quadro do funil: agrupamento puro primeiro, tela contra servidor falso
 * depois.
 *
 * O que os testes de tela vigiam é a INTENÇÃO: mover cartão tem de ser UM
 * `PATCH` no caminho do estágio, com `precedeId` dentro. Se um dia alguém
 * trocar isso por N escritas, quebra aqui.
 */

const FUNIL = { id: 'funil-1', name: 'Venda de projeto', sort: 1, isDefault: true, active: true }
const FUNIL_2 = { id: 'funil-2', name: 'Balcão', sort: 2, isDefault: false, active: true }

function etapa(id: string, name: string, sort: number, extra: Partial<CrmStageDto> = {}) {
  return {
    id,
    pipelineId: 'funil-1',
    name,
    sort,
    probability: 100_000,
    isWon: false,
    isLost: false,
    rotDays: null,
    ...extra,
  }
}

const ETAPAS: CrmStageDto[] = [
  etapa('e1', 'Contato', 1),
  etapa('e2', 'Proposta', 2),
  etapa('e3', 'Ganho', 3, { isWon: true }),
]

function cartao(over: Partial<CrmOpportunityDto> & { id: string }): CrmOpportunityDto {
  return {
    name: 'Oportunidade',
    pipelineId: 'funil-1',
    pipelineName: 'Venda de projeto',
    stageId: 'e1',
    stageName: 'Contato',
    order: 1,
    partnerId: null,
    partnerName: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    ownerEmployeeId: null,
    ownerName: null,
    expectedValueCents: null,
    expectedCloseDate: null,
    source: null,
    stageChangedAt: '2026-08-10T12:00:00Z',
    lostReasonId: null,
    lostReasonName: null,
    quoteId: null,
    closedAt: null,
    ...over,
  }
}

describe('agrupamento do funil', () => {
  it('toda etapa configurada vira coluna, inclusive a VAZIA', () => {
    const porEtapa = agruparPorEtapa([cartao({ id: 'a' })], ETAPAS)

    expect(Object.keys(porEtapa)).toEqual(['e1', 'e2', 'e3'])
    expect(porEtapa.e2).toEqual([])
  })

  it('etapa desconhecida cai na PRIMEIRA coluna — some da tela seria pior', () => {
    const porEtapa = agruparPorEtapa([cartao({ id: 'a', stageId: 'etapa-que-nao-existe' })], ETAPAS)

    expect(porEtapa.e1?.map((c) => c.id)).toEqual(['a'])
  })

  it('a coluna respeita a ordem do SERVIDOR, não a de chegada', () => {
    const porEtapa = agruparPorEtapa(
      [cartao({ id: 'b', order: 2 }), cartao({ id: 'a', order: 1 })],
      ETAPAS,
    )

    expect(porEtapa.e1?.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('o total soma centavos e conta `null` como zero, não como buraco', () => {
    const total = somaDaColuna([
      cartao({ id: 'a', expectedValueCents: 150_000 }),
      cartao({ id: 'b', expectedValueCents: null }),
      cartao({ id: 'c', expectedValueCents: 50_000 }),
    ])

    expect(total).toBe(200_000)
  })

  it('quem: o parceiro cadastrado, senão o contato solto do lead, senão nada', () => {
    expect(quemDoCartao(cartao({ id: 'a', partnerName: 'MH ARQUITETURA' }))).toBe('MH ARQUITETURA')
    expect(quemDoCartao(cartao({ id: 'b', contactName: 'Marina' }))).toBe('Marina')
    expect(quemDoCartao(cartao({ id: 'c' }))).toBeNull()
  })
})

/** Sessão + funil + etapas + oportunidades; qualquer outro caminho rejeita alto. */
function servidorDoFunil(cartoes: CrmOpportunityDto[]): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (caminho === '/auth/me') return Promise.resolve(respostaSessao())
    if (caminho === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (caminho === URL_FUNIS) {
      return Promise.resolve(json({ rows: [FUNIL, FUNIL_2], total: 2 }))
    }
    if (caminho === `${URL_FUNIS}/funil-1/stages`) return Promise.resolve(json(ETAPAS))
    if (caminho === URL_OPORTUNIDADES) {
      return Promise.resolve(json({ rows: cartoes, total: cartoes.length }))
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

describe('quadro do funil', () => {
  const CARTOES = [
    cartao({
      id: 'op-1',
      name: 'Casa Jardim',
      partnerName: 'MH ARQUITETURA',
      expectedValueCents: 4_500_000,
      expectedCloseDate: '2026-09-30',
      order: 1,
    }),
    // Valor diferente do primeiro DE PROPÓSITO: com dois cartões de mesmo
    // valor, o total da coluna repetiria o texto do cartão e a asserção não
    // saberia dizer qual dos dois encontrou.
    cartao({
      id: 'op-2',
      name: 'Loja Centro',
      contactName: 'Marina',
      expectedValueCents: 1_250_000,
      order: 2,
    }),
  ]

  it('mostra as colunas, a contagem e o total da etapa em centavos', async () => {
    renderRoute('/crm/funil/funil-1', servidorDoFunil(CARTOES))

    const contato = await screen.findByRole('region', { name: 'Contato' })
    expect(within(contato).getByText('2')).toBeInTheDocument()
    // R$ 57.500,00 = 45.000 + 12.500 — soma da coluna em centavos, formatada
    // só na borda de exibição.
    expect(within(contato).getByText(/57\.500,00/)).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Proposta' })).toBeInTheDocument()
  })

  it('o cartão mostra os quatro campos escolhidos, e só eles', async () => {
    renderRoute('/crm/funil/funil-1', servidorDoFunil(CARTOES))

    expect(await screen.findByText('Casa Jardim')).toBeInTheDocument()
    expect(screen.getByText('MH ARQUITETURA')).toBeInTheDocument()
    expect(screen.getByText('R$ 45.000,00')).toBeInTheDocument()
    expect(screen.getByText('30/09/2026')).toBeInTheDocument()
    // Lead sem cadastro mostra o CONTATO no lugar do parceiro.
    expect(screen.getByText('Marina')).toBeInTheDocument()
  })

  it('coluna vazia diz que está vazia — espaço em branco não diz nada', async () => {
    renderRoute('/crm/funil/funil-1', servidorDoFunil(CARTOES))

    const proposta = await screen.findByRole('region', { name: 'Proposta' })
    expect(within(proposta).getByText('Nenhuma oportunidade nesta etapa.')).toBeInTheDocument()
  })

  it('mover pelo menu é UM PATCH, com stageId e precedeId', async () => {
    const escritas: { metodo: string; caminho: string; corpo: unknown }[] = []
    const base = servidorDoFunil(CARTOES)
    const stub: FetchStub = async (entrada) => {
      const requisicao = entrada instanceof Request ? entrada : null
      if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
        const texto = await requisicao.clone().text()
        escritas.push({
          metodo: requisicao.method.toUpperCase(),
          caminho: new URL(requisicao.url, 'http://localhost').pathname,
          corpo: texto ? JSON.parse(texto) : null,
        })
        return json(cartao({ id: 'op-1', stageId: 'e2' }))
      }
      return base(entrada)
    }

    const { user } = renderRoute('/crm/funil/funil-1', stub)
    await user.click(await screen.findByRole('button', { name: 'Ações de Casa Jardim' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Proposta' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({
      metodo: 'PATCH',
      caminho: `${URL_OPORTUNIDADES}/op-1/stage`,
    })
    // Pelo menu o cartão vai para o FIM da coluna de destino: o operador
    // escolheu a etapa, não a posição.
    expect(escritas[0]?.corpo).toEqual({ stageId: 'e2', precedeId: null })
  })

  it('dentro da coluna, o menu POSICIONA — é o precedeId por clique', async () => {
    const escritas: { corpo: unknown }[] = []
    const base = servidorDoFunil(CARTOES)
    const stub: FetchStub = async (entrada) => {
      const requisicao = entrada instanceof Request ? entrada : null
      if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
        escritas.push({ corpo: JSON.parse(await requisicao.clone().text()) })
        return json(cartao({ id: 'op-2' }))
      }
      return base(entrada)
    }

    const { user } = renderRoute('/crm/funil/funil-1', stub)
    await user.click(await screen.findByRole('button', { name: 'Ações de Loja Centro' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Topo desta etapa' }))

    // Vizinho, não índice: o cartão fica na frente do primeiro da coluna.
    await waitFor(() => expect(escritas[0]?.corpo).toEqual({ stageId: 'e1', precedeId: 'op-1' }))
  })

  it('funil sem etapa manda configurar, em vez de mostrar quadro vazio', async () => {
    const stub: FetchStub = (entrada) => {
      const caminho = new URL(
        String(entrada instanceof Request ? entrada.url : entrada),
        'http://localhost',
      ).pathname
      if (caminho === `${URL_FUNIS}/funil-1/stages`) return Promise.resolve(json([]))
      return servidorDoFunil([])(entrada)
    }

    renderRoute('/crm/funil/funil-1', stub)

    expect(await screen.findByText(/ainda não tem etapas/)).toBeInTheDocument()
  })
})
