import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { URL_FUNIS, URL_MOTIVOS_DE_PERDA, URL_OPORTUNIDADES } from '@/data/crm-api'
import { json, problema } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * PERDER O NEGÓCIO, com motivo catalogado (#88).
 *
 * O que estes testes vigiam é a INTENÇÃO do contrato chegando inteira: o
 * `PATCH …/stage` para etapa `isLost` tem de sair COM `lostReasonId`. Antes
 * desta issue ele saía sem, o servidor recusava com 400 e o cartão não se
 * mexia — regra certa, caminho inexistente.
 */

const FUNIL = { id: 'funil-1', name: 'Venda de projeto', sort: 1, isDefault: true, active: true }

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
  etapa('e-perdido', 'Perdido', 3, { isLost: true }),
]

const MOTIVOS = [
  { id: 'm-preco', name: 'Preço', active: true },
  { id: 'm-prazo', name: 'Prazo de entrega', active: true },
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

const ABERTA = cartao({ id: 'op-1', name: 'Casa Jardim' })
const PERDIDA = cartao({
  id: 'op-2',
  name: 'Loja Centro',
  stageId: 'e-perdido',
  stageName: 'Perdido',
  lostReasonId: 'm-preco',
  lostReasonName: 'Preço',
  closedAt: '2026-08-01T10:00:00Z',
})

interface Escrita {
  metodo: string
  caminho: string
  corpo: unknown
}

function servidorDoFunil(
  escritas: Escrita[],
  {
    cartoes = [ABERTA],
    motivos = MOTIVOS,
  }: { cartoes?: CrmOpportunityDto[]; motivos?: unknown[] } = {},
): FetchStub {
  return async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = String(requisicao ? requisicao.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const texto = await requisicao.clone().text()
      escritas.push({
        metodo: requisicao.method.toUpperCase(),
        caminho,
        corpo: texto ? JSON.parse(texto) : null,
      })
      return json(cartao({ id: 'op-1', stageId: 'e-perdido', stageName: 'Perdido' }))
    }

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === URL_FUNIS) return json({ rows: [FUNIL], total: 1 })
    if (caminho === `${URL_FUNIS}/funil-1/stages`) return json(ETAPAS)
    if (caminho === URL_MOTIVOS_DE_PERDA) return json({ rows: motivos, total: motivos.length })
    if (caminho === URL_OPORTUNIDADES) return json({ rows: cartoes, total: cartoes.length })
    if (caminho === '/api/crm/reports/lost-reasons') {
      const busca = new URL(url, 'http://localhost').searchParams
      return json({
        from: busca.get('from'),
        to: busca.get('to'),
        total: 5,
        rows: [
          { lostReasonId: 'm-preco', lostReasonName: 'Preço', count: 3 },
          { lostReasonId: 'm-prazo', lostReasonName: 'Prazo de entrega', count: 2 },
        ],
      })
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('marcar como perdida', () => {
  it('o menu para etapa de perda ABRE o diálogo em vez de mandar o PATCH', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await user.click(await screen.findByRole('button', { name: 'Ações de Casa Jardim' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Perdido' }))

    const dialogo = await screen.findByRole('dialog')
    // Pelo TÍTULO, não pelo texto solto: "Marcar como perdida" é também o
    // rótulo do botão de confirmar, e casar os dois não provaria nada.
    expect(
      within(dialogo).getByRole('heading', { name: 'Marcar como perdida' }),
    ).toBeInTheDocument()
    // NADA foi mandado ainda: sem motivo o servidor responderia 400, e é
    // exatamente esse 400 que esta issue existe para não acontecer.
    expect(escritas).toHaveLength(0)
  })

  it('sem motivo escolhido não dá para confirmar', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    await user.click(await screen.findByRole('button', { name: 'Ações de Casa Jardim' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Perdido' }))

    expect(await screen.findByRole('button', { name: 'Marcar como perdida' })).toBeDisabled()
  })

  it('confirmar manda UM PATCH com o lostReasonId escolhido', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await user.click(await screen.findByRole('button', { name: 'Ações de Casa Jardim' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Perdido' }))
    await user.selectOptions(await screen.findByLabelText('Motivo da perda'), 'm-prazo')
    await user.click(screen.getByRole('button', { name: 'Marcar como perdida' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({
      metodo: 'PATCH',
      caminho: `${URL_OPORTUNIDADES}/op-1/stage`,
    })
    expect(escritas[0]?.corpo).toEqual({
      stageId: 'e-perdido',
      precedeId: null,
      lostReasonId: 'm-prazo',
    })
  })

  /**
   * Etapa de perda com UMA opção não pede escolha: o seletor de etapa só
   * aparece quando o funil tem mais de uma, senão seria clique cobrado sem
   * decisão nenhuma.
   */
  it('com uma etapa de perda só, a etapa não vira pergunta', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    await user.click(await screen.findByRole('button', { name: 'Ações de Casa Jardim' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Perdido' }))

    await screen.findByLabelText('Motivo da perda')
    expect(screen.queryByLabelText('Etapa')).not.toBeInTheDocument()
  })

  it('catálogo vazio diz o que fazer, em vez de oferecer lista vazia', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([], { motivos: [] }))

    await user.click(await screen.findByRole('button', { name: 'Ações de Casa Jardim' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Perdido' }))

    expect(await screen.findByRole('link', { name: /Motivos de Perda/ })).toBeInTheDocument()
  })

  /**
   * Cartão JÁ perdido: reposicionar na coluna e trocar de etapa de perda
   * continuam sendo `PATCH` com destino `isLost`, e o contrato cobra o motivo
   * nos dois. Perguntar de novo o que a tela tem em mãos seria diálogo para
   * confirmar o já dito — então o motivo gravado VIAJA junto, calado.
   */
  it('cartão já perdido reenvia o motivo gravado, sem abrir diálogo', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute(
      '/crm/funil/funil-1',
      servidorDoFunil(escritas, { cartoes: [ABERTA, PERDIDA] }),
    )

    await user.click(await screen.findByRole('button', { name: 'Ações de Loja Centro' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Contato' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    // Voltar para etapa ABERTA não manda motivo: reabrir limpa, e quem limpa é
    // o servidor. Mandar o motivo de volta reabriria o negócio com a razão da
    // perda ainda pendurada.
    expect(escritas[0]?.corpo).toEqual({ stageId: 'e1', precedeId: null })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a visão Lista também perde, pela barra de ações', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await user.click(await screen.findByRole('radio', { name: 'Lista' }))
    await user.click(await screen.findByText('Casa Jardim'))
    await user.click(screen.getByRole('button', { name: 'Perder…' }))

    await user.selectOptions(await screen.findByLabelText('Motivo da perda'), 'm-preco')
    await user.click(screen.getByRole('button', { name: 'Marcar como perdida' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.corpo).toMatchObject({ lostReasonId: 'm-preco' })
  })
})

describe('perdas por motivo', () => {
  it('mostra os motivos com a contagem e o total do período', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    await user.click(await screen.findByRole('button', { name: 'Perdas por motivo' }))

    // Dentro do DIÁLOGO: o quadro atrás dele também tem contagens de coluna, e
    // um `3` solto na tela não diz de quem é.
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('Preço')).toBeInTheDocument()
    expect(within(dialogo).getByText('3')).toBeInTheDocument()
    expect(within(dialogo).getByText('Prazo de entrega')).toBeInTheDocument()
    expect(within(dialogo).getByText(/5 negócios perdidos no período/)).toBeInTheDocument()
  })

  it('o período abre no ano corrente, e viaja na consulta', async () => {
    const consultas: string[] = []
    const base = servidorDoFunil([])
    const stub: FetchStub = (entrada) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      if (url.includes('/api/crm/reports/lost-reasons')) consultas.push(url)
      return base(entrada)
    }

    const { user } = renderRoute('/crm/funil/funil-1', stub)
    await user.click(await screen.findByRole('button', { name: 'Perdas por motivo' }))
    await screen.findByText('Preço')

    const busca = new URL(consultas[0] as string, 'http://localhost').searchParams
    expect(busca.get('from')).toBe(`${new Date().getFullYear()}-01-01`)
    expect(busca.get('pipelineId')).toBe('funil-1')
  })

  /**
   * Período invertido é barrado na TELA. O servidor recusaria com 400, mas o
   * erro chegaria com cara de falha do servidor quando o que está errado são os
   * dois campos logo acima.
   */
  it('início depois do fim não vira requisição', async () => {
    const consultas: string[] = []
    const base = servidorDoFunil([])
    const stub: FetchStub = (entrada) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      if (url.includes('/api/crm/reports/lost-reasons')) consultas.push(url)
      return base(entrada)
    }

    const { user } = renderRoute('/crm/funil/funil-1', stub)
    await user.click(await screen.findByRole('button', { name: 'Perdas por motivo' }))
    await screen.findByText('Preço')
    const antes = consultas.length

    // `fireEvent.change`, e não `type`: digitar num `<input type="date">` passa
    // por datas intermediárias válidas, e cada uma delas seria uma consulta —
    // o teste mediria o debounce, não a guarda.
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2027-12-31' } })

    expect(await screen.findByText(/início do período é depois do fim/)).toBeInTheDocument()
    expect(consultas).toHaveLength(antes)
  })

  it('falha do relatório aparece como falha, não como zero perdas', async () => {
    const base = servidorDoFunil([])
    const stub: FetchStub = (entrada) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      if (url.includes('/api/crm/reports/lost-reasons')) {
        // 400 e não 500: 4xx não se repete (`repetirSeValeAPena`), e com as três
        // tentativas do 5xx a tela ficaria em esqueleto além do tempo do teste —
        // que é justamente o comportamento correto, e não o que se afirma aqui.
        return Promise.resolve(problema(400, 'Apuração indisponível.'))
      }
      return base(entrada)
    }

    const { user } = renderRoute('/crm/funil/funil-1', stub)
    await user.click(await screen.findByRole('button', { name: 'Perdas por motivo' }))

    expect(await screen.findByText(/Apuração indisponível/)).toBeInTheDocument()
    expect(screen.queryByText(/Nenhum negócio perdido/)).not.toBeInTheDocument()
  })
})
