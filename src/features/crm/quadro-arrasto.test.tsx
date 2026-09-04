import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { URL_FUNIS, URL_MOTIVOS_DE_PERDA, URL_OPORTUNIDADES } from '@/data/crm-api'
import { destinoDoArrasto } from '@/features/crm/quadro-do-funil'
import { arrastarPara, arrastarSobre } from '@/test/arrastar'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * O QUADRO DO FUNIL SE MOVE POR ARRASTO — e reordena, que o de Tarefas não faz.
 *
 * A diferença não é capricho de tela: `PATCH /stage` leva `precedeId`, então
 * aqui a POSIÇÃO é dado que o servidor sabe receber. `TaskPatchRequest` não tem
 * campo de ordem, e por isso lá o alvo do gesto é a coluna inteira.
 *
 * Três coisas esta bateria não deixa cair:
 *
 * 1. **Arrasto e clique desembocam na mesma escrita.** Um `PATCH`, com
 *    `stageId` e `precedeId` — nunca N escritas, nunca um caminho próprio.
 * 2. **O diálogo de motivo de perda vale para os dois.** Arrastar para etapa
 *    `isLost` sem motivo tem de PARAR no diálogo, e não mandar o 400.
 * 3. **O menu não saiu.** É o caminho de teclado, e é a base de comparação de
 *    acessibilidade que a issue mandou medir em vez de supor.
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

/** Três na etapa Contato, na ordem do servidor. */
const CARTOES = [
  cartao({ id: 'op-1', name: 'Casa Jardim', order: 1 }),
  cartao({ id: 'op-2', name: 'Loja Centro', order: 2 }),
  cartao({ id: 'op-3', name: 'Edifício Aurora', order: 3 }),
]

interface Escrita {
  metodo: string
  caminho: string
  corpo: unknown
}

function servidorDoFunil(escritas: Escrita[], cartoes = CARTOES): FetchStub {
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
      return json(cartao({ id: 'op-1', stageId: 'e2' }))
    }

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === URL_FUNIS) return json({ rows: [FUNIL], total: 1 })
    if (caminho === `${URL_FUNIS}/funil-1/stages`) return json(ETAPAS)
    if (caminho === URL_MOTIVOS_DE_PERDA) return json({ rows: MOTIVOS, total: MOTIVOS.length })
    if (caminho === URL_OPORTUNIDADES) return json({ rows: cartoes, total: cartoes.length })
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

function cartaoDe(nome: string): HTMLElement {
  const alvo = screen.getByText(nome).closest('[data-slot="cartao"]')
  if (!alvo) throw new Error(`cartão não encontrado: ${nome}`)
  return alvo as HTMLElement
}

async function colunaDe(titulo: string): Promise<HTMLElement> {
  return (await screen.findByRole('region', { name: titulo })) as HTMLElement
}

beforeEach(() => {
  localStorage.clear()
})

/**
 * O agrupamento deixou de ser um `<select>` e virou o chip da barra 2.0 (D9):
 * clicar abre a lista, e a opção é um botão com o rótulo. O gesto do operador é
 * o mesmo — escolher por onde a lista se divide —, e é isso que os casos abaixo
 * afirmam.
 */
async function agruparPorResponsavel(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(screen.getByRole('button', { name: /Agrup/ }))
  await user.click(await screen.findByRole('button', { name: 'Responsável' }))
}

describe('a decisão do gesto, sem DOM', () => {
  const coluna = CARTOES

  it('soltar em cartão de outra etapa: a etapa DELE e a posição na frente dele', () => {
    const destino = destinoDoArrasto(
      CARTOES[0] as CrmOpportunityDto,
      { tipo: 'cartao', id: 'op-9', stageId: 'e2' },
      ETAPAS,
      coluna,
    )

    expect(destino).toEqual({ stageId: 'e2', precedeId: 'op-9', rotulo: 'Proposta', perda: false })
  })

  it('soltar no vazio da coluna é o FIM dela — `precedeId` nulo', () => {
    const destino = destinoDoArrasto(
      CARTOES[0] as CrmOpportunityDto,
      { tipo: 'coluna', stageId: 'e2' },
      ETAPAS,
      coluna,
    )

    expect(destino?.precedeId).toBeNull()
  })

  it('reordenar DENTRO da etapa mantém o stageId e move o precedeId', () => {
    // O terceiro cartão vai para a frente do primeiro: mesma etapa, posição nova.
    const destino = destinoDoArrasto(
      CARTOES[2] as CrmOpportunityDto,
      { tipo: 'cartao', id: 'op-1', stageId: 'e1' },
      ETAPAS,
      coluna,
    )

    expect(destino).toMatchObject({ stageId: 'e1', precedeId: 'op-1' })
  })

  it('soltar em cima de SI MESMO não vira requisição', () => {
    // `precedeId` apontando para o próprio cartão é pedido que o servidor não
    // sabe responder.
    expect(
      destinoDoArrasto(
        CARTOES[0] as CrmOpportunityDto,
        { tipo: 'cartao', id: 'op-1', stageId: 'e1' },
        ETAPAS,
        coluna,
      ),
    ).toBeNull()
  })

  it('soltar ONDE JÁ ESTÁ não vira requisição', () => {
    // `op-1` na frente de `op-2` é exatamente a ordem de agora: a escrita
    // gastaria um `invalidate` para redesenhar a mesma coluna.
    expect(
      destinoDoArrasto(
        CARTOES[0] as CrmOpportunityDto,
        { tipo: 'cartao', id: 'op-2', stageId: 'e1' },
        ETAPAS,
        coluna,
      ),
    ).toBeNull()
  })

  it('o último cartão solto no fim da própria coluna também não escreve', () => {
    expect(
      destinoDoArrasto(
        CARTOES[2] as CrmOpportunityDto,
        { tipo: 'coluna', stageId: 'e1' },
        ETAPAS,
        coluna,
      ),
    ).toBeNull()
  })

  it('soltar fora de alvo nenhum não move nada', () => {
    expect(destinoDoArrasto(CARTOES[0] as CrmOpportunityDto, undefined, ETAPAS, coluna)).toBeNull()
  })

  it('a etapa de destino carrega o fato de ser de PERDA', () => {
    // É fato sobre a ETAPA, e é o que faz o diálogo do motivo aparecer.
    const destino = destinoDoArrasto(
      CARTOES[0] as CrmOpportunityDto,
      { tipo: 'coluna', stageId: 'e-perdido' },
      ETAPAS,
      coluna,
    )

    expect(destino?.perda).toBe(true)
  })
})

describe('quadro do funil: o arrasto', () => {
  it('arrastar para outra coluna é UM PATCH, com stageId e precedeId nulo', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Casa Jardim')
    await arrastarPara(cartaoDe('Casa Jardim'), await colunaDe('Proposta'))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({
      metodo: 'PATCH',
      caminho: `${URL_OPORTUNIDADES}/op-1/stage`,
    })
    expect(escritas[0]?.corpo).toEqual({ stageId: 'e2', precedeId: null })
  })

  it('soltar em cima de um cartão põe o arrastado NA FRENTE dele', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Edifício Aurora')
    // Reordenar dentro da própria etapa — o que o quadro de Tarefas não tem.
    await arrastarPara(cartaoDe('Edifício Aurora'), cartaoDe('Casa Jardim'))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.corpo).toEqual({ stageId: 'e1', precedeId: 'op-1' })
  })

  it('soltar onde o cartão já está NÃO escreve', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Casa Jardim')
    await arrastarPara(cartaoDe('Casa Jardim'), cartaoDe('Loja Centro'))

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(escritas).toHaveLength(0)
  })

  it('arrastar para etapa de PERDA abre o diálogo — não manda o 400', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Casa Jardim')
    await arrastarPara(cartaoDe('Casa Jardim'), await colunaDe('Perdido'))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByRole('heading', { name: 'Marcar como perdida' })).toBeVisible()
    // O motivo é dado NOVO, e só o operador o tem: mandar sem ele era o 400 que
    // deixava o cartão parado com um recado que ninguém podia atender.
    expect(escritas).toHaveLength(0)
  })

  it('a marca de encaixe aparece no cartão que vai receber, e some ao soltar', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Edifício Aurora')
    const alvo = cartaoDe('Casa Jardim')
    const gesto = await arrastarSobre(cartaoDe('Edifício Aurora'), alvo)

    await waitFor(() => expect(alvo.querySelector('[data-slot="encaixe"]')).toBeInTheDocument())
    // Decorativa: o traço é desenho, e um leitor de tela anunciando "encaixe"
    // no meio da lista seria ruído.
    expect(alvo.querySelector('[data-slot="encaixe"]')).toHaveAttribute('aria-hidden', 'true')

    await gesto.soltar()
    await waitFor(() => expect(alvo.querySelector('[data-slot="encaixe"]')).toBeNull())
  })

  it('agrupado por RESPONSÁVEL o cartão nem arrasta — a coluna não é destino', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Casa Jardim')
    await agruparPorResponsavel(user)

    // Mesma razão que tira `Topo desta etapa` do menu: soltar numa coluna de
    // responsável pediria posição relativa a cartões de etapas diferentes, e o
    // contrato não tem como responder. Sem alvo E sem arrasto, em vez de um
    // gesto que parece funcionar e não faz nada.
    await waitFor(() => expect(cartaoDe('Casa Jardim')).not.toHaveAttribute('draggable'))
  })

  it('a coluna sobe um degrau quando o cartão paira no vazio dela', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Casa Jardim')
    const proposta = await colunaDe('Proposta')
    await arrastarSobre(cartaoDe('Casa Jardim'), proposta)

    await waitFor(() => expect(proposta).toHaveAttribute('data-sob-voo'))
    // Um DEGRAU de elevação, nunca uma cor — a sombra dura de tinta 2.0.
    expect(proposta.className).toContain('shadow-[var(--hard-1)]')
  })
})

describe('o teclado não regrediu — o menu é a base de comparação', () => {
  it('o menu de ações continua em todo cartão', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    expect(await screen.findByRole('button', { name: 'Ações de Casa Jardim' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ações de Loja Centro' })).toBeInTheDocument()
  })

  it('mover pelo menu, só com o teclado, continua sendo UM PATCH', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    const acoes = await screen.findByRole('button', { name: 'Ações de Casa Jardim' })
    acoes.focus()
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('menuitem', { name: 'Proposta' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.corpo).toEqual({ stageId: 'e2', precedeId: null })
  })

  it('reposicionar dentro da etapa continua no menu, sem gesto nenhum', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await user.click(await screen.findByRole('button', { name: 'Ações de Loja Centro' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Topo desta etapa' }))

    await waitFor(() => expect(escritas[0]?.corpo).toEqual({ stageId: 'e1', precedeId: 'op-1' }))
  })

  it('o cartão não entra na ordem de tabulação por causa do arrasto', async () => {
    const escritas: Escrita[] = []
    renderRoute('/crm/funil/funil-1', servidorDoFunil(escritas))

    await screen.findByText('Casa Jardim')
    expect(cartaoDe('Casa Jardim')).toHaveAttribute('draggable', 'true')
    expect(cartaoDe('Casa Jardim')).not.toHaveAttribute('tabindex')
    // O título continua sendo o link de sempre: o arrasto não engoliu a
    // navegação por teclado até a ficha da oportunidade.
    expect(screen.getByRole('link', { name: 'Casa Jardim' })).toBeInTheDocument()
  })
})
