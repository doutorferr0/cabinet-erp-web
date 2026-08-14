import { configurarApi } from '@/api/cliente'
import type { CrmOpportunityDto } from '@/api/gerado'
import {
  authLogin,
  authSetActiveTenant,
  createCrmOpportunity,
  listCrmOpportunities,
  listCrmPipelines,
  listCrmStages,
  listEmployees,
  moveCrmOpportunityStage,
  updateCrmOpportunity,
} from '@/api/gerado'
import { apiFetch } from '@/api/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetCrm } from './crm'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore, store } from './store'

/**
 * Trava as SEMÂNTICAS do funil no modo mock, não o dado do seed.
 *
 * O que se prova aqui é o desenho que o contrato pediu: mover cartão é UMA
 * requisição que reordena a coluna inteira, perda exige motivo, e estágio de
 * outro funil não é movimento de coluna. Se o mock divergir disso, o quadro
 * treina contra um servidor que não existe — e o preço aparece na integração.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetCrm()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/**
 * Listagem COM filtro estruturado, montada como o app monta.
 *
 * Não dá para usar a operação gerada aqui: o serializador do Orval faz
 * `String(value)` em todo parâmetro, e um array de condições viraria
 * `[object Object]`. Quem monta a query de listagem no app é
 * `createApiListProvider`, que serializa `filters` como **array JSON** — é essa
 * requisição que o servidor falso precisa saber responder.
 */
async function listarComFiltros(
  filtros: { field: string; operator: string; value?: string }[],
  juncao?: 'and' | 'or',
) {
  const query = new URLSearchParams({
    pipelineId: 'funil-projeto',
    pageSize: '100',
    filters: JSON.stringify(filtros),
  })
  if (juncao) query.set('joinOperator', juncao)
  return apiFetch<{ data?: { rows: CrmOpportunityDto[]; total: number }; status: number }>(
    `/api/crm/opportunities?${query.toString()}`,
    { method: 'GET' },
  )
}

/** Os ids da coluna, na ordem em que o quadro os mostraria. */
async function colunaDe(stageId: string): Promise<string[]> {
  const resposta = await listCrmOpportunities({ stageId, pageSize: 100 })
  if (resposta.status !== 200) throw new Error(`listagem falhou: ${resposta.status}`)
  return resposta.data.rows.map((o) => o.id)
}

describe('funil e estágios', () => {
  it('a empresa tem VÁRIOS funis, e um só é o padrão', async () => {
    const resposta = await listCrmPipelines({ pageSize: 100 })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    expect(resposta.data.rows.length).toBeGreaterThan(1)
    expect(resposta.data.rows.filter((f) => f.isDefault)).toHaveLength(1)
  })

  it('os estágios vêm do funil pedido, na ordem das colunas', async () => {
    const resposta = await listCrmStages('funil-projeto')
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return

    expect(resposta.data.every((e) => e.pipelineId === 'funil-projeto')).toBe(true)
    expect(resposta.data.map((e) => e.sort)).toEqual([...resposta.data.map((e) => e.sort)].sort())
    // Ganho e perda são propriedade do ESTÁGIO, e existem neste funil.
    expect(resposta.data.some((e) => e.isWon)).toBe(true)
    expect(resposta.data.some((e) => e.isLost)).toBe(true)
  })
})

describe('o movimento do quadro', () => {
  it('mover cartão para o topo de outra coluna reordena as DUAS, numa chamada', async () => {
    const contatoAntes = await colunaDe('etapa-contato')
    const propostaAntes = await colunaDe('etapa-proposta')
    const movido = contatoAntes[1] as string

    const resposta = await moveCrmOpportunityStage(movido, {
      stageId: 'etapa-proposta',
      precedeId: propostaAntes[0] ?? null,
    })
    expect(resposta.status).toBe(200)

    expect(await colunaDe('etapa-proposta')).toEqual([movido, ...propostaAntes])
    expect(await colunaDe('etapa-contato')).toEqual(contatoAntes.filter((id) => id !== movido))
  })

  it('`precedeId: null` põe o cartão no FIM da coluna', async () => {
    const propostaAntes = await colunaDe('etapa-proposta')
    const movido = (await colunaDe('etapa-contato'))[0] as string

    await moveCrmOpportunityStage(movido, { stageId: 'etapa-proposta', precedeId: null })

    expect(await colunaDe('etapa-proposta')).toEqual([...propostaAntes, movido])
  })

  it('a ordem fica DENSA depois do movimento — sem dois cartões no mesmo lugar', async () => {
    const movido = (await colunaDe('etapa-contato'))[0] as string
    await moveCrmOpportunityStage(movido, { stageId: 'etapa-proposta', precedeId: null })

    const resposta = await listCrmOpportunities({ stageId: 'etapa-proposta', pageSize: 100 })
    if (resposta.status !== 200) throw new Error('listagem falhou')
    const ordens = resposta.data.rows.map((o) => o.order)
    expect(ordens).toEqual(ordens.map((_, i) => i + 1))
  })

  it('estágio de PERDA sem motivo é 400 — perda sem motivo não vira análise', async () => {
    const cartao = (await colunaDe('etapa-contato'))[0] as string

    const semMotivo = await moveCrmOpportunityStage(cartao, { stageId: 'etapa-perdido' })
    expect(semMotivo.status).toBe(400)

    const comMotivo = await moveCrmOpportunityStage(cartao, {
      stageId: 'etapa-perdido',
      lostReasonId: 'perda-preco',
    })
    expect(comMotivo.status).toBe(200)
    if (comMotivo.status !== 200) return
    expect(comMotivo.data.lostReasonName).toBe('Preço acima do orçamento do cliente')
    // Fechamento é do SERVIDOR: o cliente não manda `closedAt`.
    expect(comMotivo.data.closedAt).not.toBeNull()
  })

  it('estágio de outro funil é 400: mover de funil não é movimento de coluna', async () => {
    const cartao = (await colunaDe('etapa-contato'))[0] as string
    const resposta = await moveCrmOpportunityStage(cartao, { stageId: 'balcao-atendimento' })
    expect(resposta.status).toBe(400)
  })

  it('vizinho que não está na coluna de destino é 400, não posição inventada', async () => {
    const cartao = (await colunaDe('etapa-contato'))[0] as string
    const forasteiro = (await colunaDe('etapa-visita'))[0] as string

    const resposta = await moveCrmOpportunityStage(cartao, {
      stageId: 'etapa-proposta',
      precedeId: forasteiro,
    })
    expect(resposta.status).toBe(400)
  })

  it('voltar para estágio aberto limpa o fechamento', async () => {
    const perdido = (await colunaDe('etapa-perdido'))[0] as string
    const resposta = await moveCrmOpportunityStage(perdido, { stageId: 'etapa-negociacao' })

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.closedAt).toBeNull()
    expect(resposta.data.lostReasonId).toBeNull()
  })
})

describe('colaboradores', () => {
  it('`/api/employees` responde de verdade — o combo de Responsável depende dele', async () => {
    const resposta = await listEmployees({ pageSize: 100 })

    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.rows.length).toBeGreaterThan(0)
    expect(resposta.data.rows.every((c) => c.name.length > 0)).toBe(true)
  })
})

describe('oportunidade — lead e negócio no mesmo registro', () => {
  it('criar sem funil nem estágio cai no funil padrão e no primeiro estágio', async () => {
    const resposta = await createCrmOpportunity({ name: 'Lead do site' })
    expect(resposta.status).toBe(201)
    if (resposta.status !== 201) return

    expect(resposta.data.pipelineId).toBe('funil-projeto')
    expect(resposta.data.stageId).toBe('etapa-contato')
    expect((await colunaDe('etapa-contato')).at(-1)).toBe(resposta.data.id)
  })

  it('o servidor resolve os nomes — o cartão não carrega lista de apoio', async () => {
    const resposta = await listCrmOpportunities({ pipelineId: 'funil-projeto', pageSize: 100 })
    if (resposta.status !== 200) throw new Error('listagem falhou')

    const comParceiro = resposta.data.rows.find((o) => o.partnerId !== null)
    expect(comParceiro?.partnerName).toBeTruthy()
    expect(resposta.data.rows.every((o) => o.stageName.length > 0)).toBe(true)
  })

  it('`open=true` esconde ganho e perda — filtro por propriedade do estágio', async () => {
    const todas = await listCrmOpportunities({ pipelineId: 'funil-projeto', pageSize: 100 })
    const abertas = await listCrmOpportunities({
      pipelineId: 'funil-projeto',
      open: true,
      pageSize: 100,
    })
    if (todas.status !== 200 || abertas.status !== 200) throw new Error('listagem falhou')

    expect(abertas.data.total).toBeLessThan(todas.data.total)
    expect(abertas.data.rows.some((o) => o.stageId === 'etapa-perdido')).toBe(false)
  })

  /**
   * O filtro estruturado tem de ESTREITAR de verdade no modo mock.
   *
   * Aceitar `filters` e descartá-lo em silêncio é pior que não ter filtro: a
   * listagem devolveria tudo enquanto o painel mostra a condição aplicada, e o
   * operador leria "atende ao filtro" numa lista que não atende. É o que o
   * site demo serviria, já que ele roda em modo mock.
   */
  it('`filters` ESTREITA a listagem — aceitar e ignorar seria pior', async () => {
    const todas = await listCrmOpportunities({ pipelineId: 'funil-projeto', pageSize: 100 })
    if (todas.status !== 200) throw new Error('listagem falhou')
    const alvo = todas.data.rows[0]?.stageName as string

    const filtrada = await listarComFiltros([{ field: 'stageName', operator: 'eq', value: alvo }])
    if (filtrada.status !== 200) throw new Error(`listagem filtrada falhou: ${filtrada.status}`)

    expect(filtrada.data?.total).toBeLessThan(todas.data.total)
    expect(filtrada.data?.rows.every((o) => o.stageName === alvo)).toBe(true)
  })

  it('campo fora da whitelist é 400, e não filtro ignorado', async () => {
    const resposta = await listarComFiltros([
      { field: 'expectedValueCents', operator: 'gt', value: '1' },
    ])

    expect(resposta.status).toBe(400)
  })

  it('`joinOperator=or` soma as condições com OU, não com E', async () => {
    const contato = await listarComFiltros([
      { field: 'stageName', operator: 'eq', value: 'Contato' },
    ])
    const proposta = await listarComFiltros([
      { field: 'stageName', operator: 'eq', value: 'Proposta' },
    ])
    const ambas = await listarComFiltros(
      [
        { field: 'stageName', operator: 'eq', value: 'Contato' },
        { field: 'stageName', operator: 'eq', value: 'Proposta' },
      ],
      'or',
    )

    expect(ambas.data?.total).toBe((contato.data?.total ?? 0) + (proposta.data?.total ?? 0))
  })

  it('o PUT substitui o registro inteiro: campo omitido é campo apagado', async () => {
    const antes = await listCrmOpportunities({ stageId: 'etapa-negociacao', pageSize: 100 })
    if (antes.status !== 200) throw new Error('listagem falhou')
    const cartao = antes.data.rows[0]
    expect(cartao?.expectedValueCents).not.toBeNull()

    const resposta = await updateCrmOpportunity(cartao?.id as string, { name: 'Só o título' })
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.expectedValueCents).toBeNull()
    expect(resposta.data.partnerId).toBeNull()
  })

  it('sortBy fora da whitelist é 400 — ordem errada não passa calada', async () => {
    const resposta = await listCrmOpportunities({ sortBy: 'contactPhone' })
    expect(resposta.status).toBe(400)
  })

  it('sem empresa ativa a listagem é VAZIA, não erro', async () => {
    // Sessão aberta e nenhuma empresa escolhida é estado legítimo do cliente
    // (`docs/integracao.md`) — e não há caminho de API para "desescolher".
    store.activeTenantId = null
    const resposta = await listCrmOpportunities({})
    expect(resposta.status).toBe(200)
    if (resposta.status !== 200) return
    expect(resposta.data.rows).toEqual([])
  })
})
