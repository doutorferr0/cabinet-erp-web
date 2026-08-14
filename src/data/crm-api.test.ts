import type { CrmOpportunityDto, CrmPipelineDto, CrmStageDto } from '@/api/gerado'
import {
  createCrmOpportunity,
  getCrmOpportunity,
  listCrmOpportunities,
  listCrmStages,
  moveCrmOpportunityStage,
  updateCrmOpportunity,
} from '@/api/gerado'
import { ErroDaApi } from '@/data/api-provider'
import { dadosOuErro, itemOuNulo } from '@/data/api-provider'
import {
  FILTRAVEIS_OPORTUNIDADE,
  ORDENAVEIS_OPORTUNIDADE,
  funis,
  motivosDePerda,
  oportunidadesDoFunil,
} from '@/data/crm-api'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A fronteira do CRM contra SERVIDOR FALSO, nunca contra mock do módulo.
 *
 * O cliente gerado chama `fetch(new Request(...))`: verbo e corpo vêm do
 * `Request`, não do segundo argumento. Dublar o módulo gerado esconderia
 * exatamente o que este teste existe para vigiar — que o `PATCH` do movimento é
 * UM `PATCH`, no caminho certo, com o vizinho dentro.
 */

const FUNIL: CrmPipelineDto = {
  id: 'funil-1',
  name: 'Venda de projeto',
  sort: 1,
  isDefault: true,
  active: true,
}

const ESTAGIO: CrmStageDto = {
  id: 'estagio-1',
  pipelineId: 'funil-1',
  name: 'Contato',
  sort: 1,
  probability: 100_000,
  isWon: false,
  isLost: false,
  rotDays: 7,
}

function oportunidade(over: Partial<CrmOpportunityDto> = {}): CrmOpportunityDto {
  return {
    id: 'op-1',
    name: 'Casa Jardim — iluminação',
    pipelineId: 'funil-1',
    pipelineName: 'Venda de projeto',
    stageId: 'estagio-1',
    stageName: 'Contato',
    order: 1,
    partnerId: null,
    partnerName: null,
    contactName: 'Marina',
    contactEmail: null,
    contactPhone: null,
    ownerEmployeeId: null,
    ownerName: null,
    expectedValueCents: 4_500_000,
    expectedCloseDate: '2026-09-30',
    source: 'indicação',
    stageChangedAt: '2026-08-10T12:00:00Z',
    lostReasonId: null,
    lostReasonName: null,
    quoteId: null,
    closedAt: null,
    ...over,
  }
}

describe('fronteira do CRM', () => {
  let servidor: ReturnType<typeof instalarServidor>

  beforeEach(() => {
    servidor = instalarServidor({
      '/api/crm/pipelines': () => json({ rows: [FUNIL], total: 1 }),
      '/api/crm/pipelines/funil-1/stages': () => json([ESTAGIO]),
      '/api/crm/lost-reasons': () =>
        json({ rows: [{ id: 'motivo-1', name: 'Preço', active: true }], total: 1 }),
      '/api/crm/opportunities': (chamada) =>
        chamada.metodo === 'POST'
          ? json(oportunidade({ id: 'op-nova' }), 201)
          : json({ rows: [oportunidade()], total: 1 }),
      '/api/crm/opportunities/op-1': (chamada) =>
        chamada.metodo === 'PUT'
          ? json(oportunidade({ name: 'Casa Jardim — revisão' }))
          : json(oportunidade()),
      '/api/crm/opportunities/op-1/stage': () =>
        json(oportunidade({ stageId: 'estagio-2', stageName: 'Proposta', order: 2 })),
      '/api/crm/opportunities/op-sumida': () => problema(404, 'Oportunidade não encontrada.'),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('a listagem de funis manda a consulta da tabela e devolve {rows,total}', async () => {
    const pagina = await funis.list(tableState({ q: 'projeto', page: 2, pageSize: 25 }))

    const url = new URL(servidor.em('/api/crm/pipelines')[0]?.url ?? '')
    expect(url.searchParams.get('q')).toBe('projeto')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('pageSize')).toBe('25')
    expect(pagina).toEqual({ rows: [FUNIL], total: 1 })
  })

  it('as oportunidades de um funil levam o pipelineId em TODA consulta', async () => {
    await oportunidadesDoFunil('funil-1').list(tableState({ q: 'jardim' }))

    const url = new URL(servidor.em('/api/crm/opportunities')[0]?.url ?? '')
    expect(url.searchParams.get('pipelineId')).toBe('funil-1')
    expect(url.searchParams.get('q')).toBe('jardim')
  })

  it('o filtro estruturado viaja em `filters`, com o campo em INGLÊS', async () => {
    await oportunidadesDoFunil('funil-1').list(
      tableState({
        filtros: [
          {
            filtroId: 'linha-1',
            id: 'stageName',
            variante: 'select',
            operador: 'eq',
            valor: 'Proposta',
          },
        ],
      }),
    )

    const url = new URL(servidor.em('/api/crm/opportunities')[0]?.url ?? '')
    expect(JSON.parse(url.searchParams.get('filters') ?? '[]')).toEqual([
      { field: 'stageName', operator: 'eq', value: 'Proposta' },
    ])
    // `and` é o padrão do contrato e não viaja — mandá-lo sujaria a chave de
    // cache da consulta sem mudar resposta.
    expect(url.searchParams.get('joinOperator')).toBeNull()
  })

  /**
   * Dinheiro fica FORA da whitelist por regra escrita (`filtro-de-consulta.ts`,
   * §Dinheiro): o valor trafega em centavos e não há variante que converta na
   * borda. A fronteira barra ANTES de sair — o 400 do servidor chegaria à tela
   * com cara de erro do servidor, quando o defeito é de quem chamou.
   */
  it('valor previsto NÃO é filtrável, e a recusa é alta', async () => {
    await expect(
      oportunidadesDoFunil('funil-1').list(
        tableState({
          filtros: [
            {
              filtroId: 'linha-1',
              id: 'expectedValueCents',
              variante: 'number',
              operador: 'gt',
              valor: '100',
            },
          ],
        }),
      ),
    ).rejects.toThrow(/não filtrável/i)
  })

  it('motivo de perda é listagem paginada, como todo cadastro', async () => {
    const pagina = await motivosDePerda.list(tableState())
    expect(pagina.total).toBe(1)
    expect(pagina.rows[0]?.name).toBe('Preço')
  })

  it('os estágios do funil vêm em array inteiro — o quadro não pagina coluna', async () => {
    const resposta = await listCrmStages('funil-1')
    const estagios = dadosOuErro<CrmStageDto[]>(resposta, 'falhou')

    expect(estagios).toHaveLength(1)
    expect(servidor.em('/api/crm/pipelines/funil-1/stages')[0]?.metodo).toBe('GET')
  })

  it('mover cartão é UM PATCH, com o VIZINHO dentro — não um PUT por linha', async () => {
    await moveCrmOpportunityStage('op-1', { stageId: 'estagio-2', precedeId: 'op-7' })

    const chamadas = servidor.em('/api/crm/opportunities/op-1/stage')
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]?.metodo).toBe('PATCH')
    expect(chamadas[0]?.corpo).toEqual({ stageId: 'estagio-2', precedeId: 'op-7' })
    // Nenhuma reindexação: o servidor reordena a coluna, o cliente não.
    expect(servidor.chamadas).toHaveLength(1)
  })

  it('`precedeId: null` é o FIM da coluna, e viaja explícito', async () => {
    await moveCrmOpportunityStage('op-1', { stageId: 'estagio-2', precedeId: null })

    expect(servidor.em('/api/crm/opportunities/op-1/stage')[0]?.corpo).toEqual({
      stageId: 'estagio-2',
      precedeId: null,
    })
  })

  it('a criação é POST e a alteração é PUT no MESMO recurso', async () => {
    await createCrmOpportunity({ name: 'Nova' })
    await updateCrmOpportunity('op-1', { name: 'Casa Jardim — revisão' })

    expect(servidor.em('/api/crm/opportunities')[0]?.metodo).toBe('POST')
    expect(servidor.em('/api/crm/opportunities/op-1')[0]?.metodo).toBe('PUT')
  })

  it('404 de oportunidade é RESPOSTA (null), não falha', async () => {
    const resposta = await getCrmOpportunity('op-sumida')
    expect(itemOuNulo<CrmOpportunityDto>(resposta, 'a oportunidade')).toBeNull()
  })

  it('a perda sem motivo volta 400 com o detail do servidor, não "algo deu errado"', async () => {
    vi.unstubAllGlobals()
    instalarServidor({
      '/api/crm/opportunities/op-1/stage': () =>
        problema(400, 'Estágio de perda exige motivo (`lostReasonId`).'),
    })

    const resposta = await moveCrmOpportunityStage('op-1', { stageId: 'estagio-perdido' })
    expect(() => dadosOuErro(resposta, 'Falha ao mover a oportunidade.')).toThrowError(ErroDaApi)
    try {
      dadosOuErro(resposta, 'Falha ao mover a oportunidade.')
    } catch (erro) {
      expect((erro as ErroDaApi).status).toBe(400)
      expect((erro as ErroDaApi).detail).toBe('Estágio de perda exige motivo (`lostReasonId`).')
    }
  })

  it('a listagem de oportunidades respeita o teto de pageSize do contrato', async () => {
    await listCrmOpportunities({ page: 1, pageSize: 100 })
    const url = new URL(servidor.em('/api/crm/opportunities')[0]?.url ?? '')
    expect(url.searchParams.get('pageSize')).toBe('100')
  })
})

/**
 * A ordenação da tabela é a whitelist do SERVIDOR, e a divergência é muda: o
 * `sortBy` fora da lista responde 400 só quando o operador clica no cabeçalho.
 * Por isso a lista deste módulo se confere contra o texto do contrato, não
 * contra uma cópia mantida à mão.
 */
describe('whitelist de ordenação', () => {
  it('ORDENAVEIS_OPORTUNIDADE é o que o contrato declara aceitar', () => {
    const descricao = (
      contrato as unknown as { paths: Record<string, { get: { description: string } }> }
    ).paths['/api/crm/opportunities']?.get?.description
    for (const campo of ORDENAVEIS_OPORTUNIDADE) {
      expect(descricao, `campo ${campo} não está na descrição do contrato`).toContain(
        `\`${campo}\``,
      )
    }
  })

  /**
   * Mesma trava para o FILTRO, e com a subtração explícita: a whitelist de
   * `filters` é a de `sortBy` menos o dinheiro. Ler as duas do mesmo texto do
   * contrato impede a divergência muda — filtro barrado aqui e aceito lá (ou o
   * contrário) é 400 que só aparece com o operador na frente.
   */
  it('FILTRAVEIS_OPORTUNIDADE é a whitelist do contrato, sem o dinheiro', () => {
    const parametros = (
      contrato as unknown as {
        paths: Record<string, { get: { parameters: { name: string; description?: string }[] } }>
      }
    ).paths['/api/crm/opportunities']?.get?.parameters
    const filtro = parametros?.find((p) => p.name === 'filters')

    expect(filtro, 'o contrato precisa publicar `filters` para o recurso').toBeDefined()
    for (const campo of FILTRAVEIS_OPORTUNIDADE) {
      expect(filtro?.description, `campo ${campo} não está na whitelist do contrato`).toContain(
        `\`${campo}\``,
      )
    }
    expect(FILTRAVEIS_OPORTUNIDADE).not.toContain('expectedValueCents')
  })
})
