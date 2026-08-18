import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { URL_FUNIS, URL_OPORTUNIDADES } from '@/data/crm-api'
import { colunasDoQuadro } from '@/features/crm/funil-agrupa'
import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * VIEW MODES do funil (#86): a mesma listagem, dois desenhos.
 *
 * O que estes testes vigiam é o "MESMO" da issue — mesma consulta, mesmo
 * filtro, mesma resposta. Um quadro com consulta própria passaria em todos os
 * testes de aparência e falharia exatamente aqui: alternar a visão mudaria os
 * parâmetros da requisição.
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

const ETAPAS: CrmStageDto[] = [etapa('e1', 'Contato', 1), etapa('e2', 'Proposta', 2)]

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

const CARTOES = [
  cartao({
    id: 'op-1',
    name: 'Casa Jardim',
    partnerName: 'MH ARQUITETURA',
    ownerName: 'Ana',
    source: 'Indicação',
    expectedValueCents: 4_500_000,
    order: 1,
  }),
  cartao({
    id: 'op-2',
    name: 'Loja Centro',
    contactName: 'Marina',
    ownerName: 'Bruno',
    stageId: 'e2',
    stageName: 'Proposta',
    expectedValueCents: 1_250_000,
    order: 1,
  }),
]

/** Guarda TODA consulta de oportunidade — é sobre elas que os testes asseguram. */
function servidorDoFunil(consultas: URL[], cartoes = CARTOES): FetchStub {
  return (entrada) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const endereco = new URL(url, 'http://localhost')

    if (endereco.pathname === '/auth/me') return Promise.resolve(respostaSessao())
    if (endereco.pathname === '/auth/tenants') return Promise.resolve(respostaVinculos())
    if (endereco.pathname === URL_FUNIS) return Promise.resolve(json({ rows: [FUNIL], total: 1 }))
    if (endereco.pathname === `${URL_FUNIS}/funil-1/stages`) return Promise.resolve(json(ETAPAS))
    if (endereco.pathname === URL_OPORTUNIDADES) {
      consultas.push(endereco)
      return Promise.resolve(json({ rows: cartoes, total: cartoes.length }))
    }
    return Promise.reject(new Error(`fetch sem stub no teste: ${url}`))
  }
}

const CHAVE_FAVORITOS = 'cabinet.consultas-favoritas.v1'

beforeEach(() => {
  localStorage.clear()
})

describe('colunasDoQuadro', () => {
  it('por ETAPA usa as configuradas, na ordem do funil e incluindo as vazias', () => {
    const colunas = colunasDoQuadro([CARTOES[0] as CrmOpportunityDto], ETAPAS, 'stageName')

    expect(colunas.map((c) => c.titulo)).toEqual(['Contato', 'Proposta'])
    expect(colunas[1]?.cartoes).toEqual([])
    // A etapa viaja junto: é ela que autoriza o `Incluir` da coluna e a zona de
    // ganho/perda.
    expect(colunas[0]?.etapa?.id).toBe('e1')
  })

  it('por RESPONSÁVEL as colunas saem do dado, e sem etapa pendurada', () => {
    const colunas = colunasDoQuadro(CARTOES, ETAPAS, 'ownerName')

    expect(colunas.map((c) => c.titulo)).toEqual(['Ana', 'Bruno'])
    expect(colunas[0]?.etapa).toBeUndefined()
  })

  it('quem não tem valor vira coluna PRÓPRIA, no fim — não some do quadro', () => {
    const colunas = colunasDoQuadro(
      [...CARTOES, cartao({ id: 'op-3', name: 'Sem dono' })],
      ETAPAS,
      'ownerName',
    )

    expect(colunas.map((c) => c.titulo)).toEqual(['Ana', 'Bruno', 'Sem responsável'])
    expect(colunas[2]?.cartoes.map((c) => c.id)).toEqual(['op-3'])
  })

  it('campo desconhecido cai na ETAPA — quadro em branco seria pior', () => {
    const colunas = colunasDoQuadro(CARTOES, ETAPAS, 'campoQueNaoExiste')

    expect(colunas.map((c) => c.titulo)).toEqual(['Contato', 'Proposta'])
  })
})

describe('alternador de visão', () => {
  it('a tela ABRE no quadro, e o alternador leva à tabela', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    // Quadro: as colunas são regiões com o nome da etapa.
    expect(await screen.findByRole('region', { name: 'Contato' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Lista' }))

    // Tabela: os mesmos negócios, agora em cabeçalho e linha.
    expect(await screen.findByRole('columnheader', { name: /Título/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Valor previsto/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Contato' })).not.toBeInTheDocument()
    expect(screen.getByText('Casa Jardim')).toBeInTheDocument()
  })

  /**
   * O ponto da issue: **o mesmo filtro**. Trocar a visão não pode mexer em
   * nenhum parâmetro da consulta que decide QUAIS registros aparecem — só
   * `pageSize` muda, porque o quadro precisa do conjunto inteiro para não
   * desenhar coluna falsa.
   */
  it('trocar de visão não refaz a pergunta — só o tamanho do lote muda', async () => {
    const consultas: URL[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(consultas))

    await screen.findByRole('region', { name: 'Contato' })
    const noQuadro = consultas[consultas.length - 1] as URL

    await user.click(screen.getByRole('radio', { name: 'Lista' }))
    await screen.findByRole('columnheader', { name: /Título/ })
    const naLista = consultas[consultas.length - 1] as URL

    for (const parametro of ['pipelineId', 'q', 'filters', 'joinOperator', 'sortBy']) {
      expect(naLista.searchParams.get(parametro)).toBe(noQuadro.searchParams.get(parametro))
    }
    // O quadro pede o teto do contrato; a tabela, a página que a tela escolheu.
    expect(noQuadro.searchParams.get('pageSize')).toBe('100')
    expect(naLista.searchParams.get('pageSize')).toBe('20')
  })

  it('agrupar por responsável troca as colunas, sem tocar na consulta', async () => {
    const consultas: URL[] = []
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil(consultas))

    await screen.findByRole('region', { name: 'Contato' })
    const antes = consultas.length

    await user.selectOptions(screen.getByLabelText('Agrupar por:'), 'ownerName')

    expect(await screen.findByRole('region', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Bruno' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Contato' })).not.toBeInTheDocument()
    // Agrupamento é desenho, não pergunta: nenhuma requisição nova.
    expect(consultas).toHaveLength(antes)
  })

  /**
   * Agrupado por responsável, a coluna deixou de dizer a etapa — e sem ela o
   * item `Mover para` do menu levaria o cartão para um lugar que a tela não
   * mostra.
   */
  it('fora do agrupamento por etapa, o cartão carrega a etapa escrita', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    await screen.findByRole('region', { name: 'Contato' })
    await user.selectOptions(screen.getByLabelText('Agrupar por:'), 'ownerName')

    const colunaDaAna = await screen.findByRole('region', { name: 'Ana' })
    expect(within(colunaDaAna).getByText('Contato')).toBeInTheDocument()
  })

  /**
   * `precedeId` aponta o vizinho DENTRO DA ETAPA. Numa coluna de responsável,
   * "topo desta etapa" pediria posição relativa a cartões de etapas
   * diferentes — pergunta que o contrato não responde.
   */
  it('reposicionar dentro da coluna some quando a coluna não é a etapa', async () => {
    const doisNaMesmaEtapa = [
      CARTOES[0] as CrmOpportunityDto,
      cartao({ id: 'op-3', name: 'Sala Norte', ownerName: 'Ana', order: 2 }),
    ]
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([], doisNaMesmaEtapa))

    await screen.findByRole('region', { name: 'Contato' })
    await user.click(await screen.findByRole('button', { name: 'Ações de Sala Norte' }))
    expect(await screen.findByRole('menuitem', { name: 'Topo desta etapa' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.selectOptions(screen.getByLabelText('Agrupar por:'), 'ownerName')
    await user.click(await screen.findByRole('button', { name: 'Ações de Sala Norte' }))

    expect(await screen.findByRole('menuitem', { name: 'Proposta' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Topo desta etapa' })).not.toBeInTheDocument()
  })
})

describe('consulta favorita guarda a visão', () => {
  it('salvar guarda visão e agrupamento junto com o filtro', async () => {
    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    await screen.findByRole('region', { name: 'Contato' })
    await user.selectOptions(screen.getByLabelText('Agrupar por:'), 'ownerName')

    await user.click(screen.getByRole('button', { name: /Salvar consulta/ }))
    await user.type(screen.getByLabelText('Nome'), 'Por vendedor')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => {
      const guardado = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS) ?? '{}')
      const daTela = guardado['crm.oportunidades.listagem.funil-1']
      expect(daTela?.[0]).toMatchObject({
        nome: 'Por vendedor',
        visao: 'quadro',
        agruparPor: 'ownerName',
      })
    })
  })

  it('aplicar um favorito restaura a VISÃO, não só o filtro', async () => {
    localStorage.setItem(
      CHAVE_FAVORITOS,
      JSON.stringify({
        'crm.oportunidades.listagem.funil-1': [
          {
            id: 'fav-1',
            nome: 'Tabelão',
            filtros: [],
            juncao: 'and',
            sort: null,
            visao: 'lista',
            agruparPor: 'stageName',
            padrao: false,
          },
        ],
      }),
    )

    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    await screen.findByRole('region', { name: 'Contato' })
    await user.click(screen.getByRole('tab', { name: 'Tabelão' }))

    expect(await screen.findByRole('columnheader', { name: /Título/ })).toBeInTheDocument()
  })

  /**
   * Favorito gravado ANTES dos view modes não tem os dois campos, e a leitura
   * tolerante os devolve vazios. Vazio não pode significar "volte ao padrão":
   * aplicá-lo mudaria o desenho da tela sem ninguém ter pedido.
   */
  it('favorito antigo, sem visão, não muda a visão da tela', async () => {
    localStorage.setItem(
      CHAVE_FAVORITOS,
      JSON.stringify({
        'crm.oportunidades.listagem.funil-1': [
          { id: 'fav-velho', nome: 'De antes', filtros: [], juncao: 'and', sort: null },
        ],
      }),
    )

    const { user } = renderRoute('/crm/funil/funil-1', servidorDoFunil([]))

    await screen.findByRole('region', { name: 'Contato' })
    await user.click(screen.getByRole('tab', { name: 'De antes' }))

    expect(await screen.findByRole('region', { name: 'Contato' })).toBeInTheDocument()
  })
})
