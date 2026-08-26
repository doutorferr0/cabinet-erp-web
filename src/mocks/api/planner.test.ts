import { configurarApi } from '@/api/cliente'
import type { ProjectPlanDto } from '@/api/gerado'
import { authLogin, authSetActiveTenant, getProjectPlan, reschedulePlanItem } from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore, store } from './store'

/**
 * Trava as SEMÂNTICAS do reagendamento no modo mock.
 *
 * O caminho é `Proposto`: nenhum backend o serve ainda, então este arquivo e o
 * `planner.ts` ao lado são a primeira especificação executável da regra. É o
 * único lugar onde o desenho pode ser contestado antes de virar servidor — e um
 * mock que só ecoasse o corpo faria a tela nascer certa por acidente.
 *
 * **Os papéis são os do SEED, sem promoção.** A Matriz é `admin` e a Filial é
 * `viewer`; `projects` pede `admin` para escrever desde que ganhou a primeira
 * escrita. Isso deixa as duas pontas exercitáveis com o par local como ele é —
 * um teste que promovesse o vínculo à mão provaria um papel que ninguém tem.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/**
 * O plano de uma resposta que TEM de ter dado certo.
 *
 * A resposta gerada é união por `status`, e ler `.phases` direto não compila. O
 * `throw` no caminho de erro é melhor que um cast: teste que arranja um 403 na
 * leitura falha aqui dizendo o status, em vez de estourar num `undefined` três
 * linhas depois.
 */
function planoDe(resposta: Awaited<ReturnType<typeof getProjectPlan>>): ProjectPlanDto {
  if (resposta.status !== 200) throw new Error(`esperava 200 na leitura, veio ${resposta.status}`)
  return resposta.data
}

const ITEM = 'plan-0003'
const PROJETO = 'proj-0001'

describe('reagendar item do plano, no mock', () => {
  it('grava as duas datas e devolve o item como ficou', async () => {
    const resposta = await reschedulePlanItem(PROJETO, ITEM, {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })

    expect(resposta.status).toBe(200)
    expect(resposta.data).toMatchObject({
      id: ITEM,
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })
  })

  it('a leitura seguinte enxerga o que a escrita gravou', async () => {
    await reschedulePlanItem(PROJETO, ITEM, { startsOn: '2026-07-01', endsOn: '2026-07-31' })

    const plano = planoDe(await getProjectPlan(PROJETO))
    const item = plano.phases.flatMap((f) => f.items).find((i) => i.id === ITEM)
    expect(item?.startsOn).toBe('2026-07-01')
  })

  it('a FASE estica para conter o item que saiu dela', async () => {
    const antes = planoDe(await getProjectPlan(PROJETO))
    const faseAntes = antes.phases.find((f) => f.items.some((i) => i.id === ITEM))
    expect(faseAntes?.endsOn).toBeDefined()

    // Bem depois de qualquer data do seed, que é relativo a hoje: a fase não
    // tem como já conter este dia.
    await reschedulePlanItem(PROJETO, ITEM, { startsOn: '2099-01-01', endsOn: '2099-12-31' })

    const depois = planoDe(await getProjectPlan(PROJETO))
    const fase = depois.phases.find((f) => f.items.some((i) => i.id === ITEM))
    // Barra-resumo menor que o filho que ela resume seria a fase mentindo sobre
    // o próprio tamanho — e o operador leria encolhimento onde houve o oposto.
    expect(fase?.endsOn).toBe('2099-12-31')
  })

  it('data invertida é 400, e o 400 diz QUAL campo', async () => {
    const resposta = await reschedulePlanItem(PROJETO, ITEM, {
      startsOn: '2026-07-31',
      endsOn: '2026-07-01',
    })

    expect(resposta.status).toBe(400)
    // Aceitar produziria duração negativa, que o gantt desenha como barra que
    // some — e sumir é a única resposta que o operador não consegue interpretar.
    expect(resposta.data).toMatchObject({
      fields: [{ path: 'endsOn' }],
    })
  })

  it('data fora do formato de dia é 400, não 500', async () => {
    const resposta = await reschedulePlanItem(PROJETO, ITEM, {
      startsOn: '01/07/2026',
      endsOn: '2026-07-31',
    })

    expect(resposta.status).toBe(400)
    expect(resposta.data).toMatchObject({ fields: [{ path: 'startsOn' }] })
  })

  it('papel que não alcança a escrita é 403 — e o 403 vem ANTES do id', async () => {
    // A Filial é `viewer`; `projects` pede `admin` desde que ganhou escrita.
    await authSetActiveTenant({ tenantId: TENANT_FILIAL })

    const resposta = await reschedulePlanItem(PROJETO, 'plan-nao-existe', {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })

    // 404 aqui contaria a quem não pode escrever qual id existe e qual não.
    expect(resposta.status).toBe(403)
  })

  it('projeto inexistente é 404', async () => {
    const resposta = await reschedulePlanItem('proj-nao-existe', ITEM, {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })
    expect(resposta.status).toBe(404)
  })

  it('item de OUTRO projeto é 404 — o id é procurado dentro do plano da URL', async () => {
    const outro = Object.keys(store.planos).find((p) => p !== PROJETO)
    expect(outro, 'o seed precisa de um segundo projeto para este caso valer').toBeDefined()

    const resposta = await reschedulePlanItem(outro as string, ITEM, {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })
    expect(resposta.status).toBe(404)
  })

  it('sem empresa ativa não grava', async () => {
    store.activeTenantId = null

    const resposta = await reschedulePlanItem(PROJETO, ITEM, {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })
    expect(resposta.status).not.toBe(200)
  })

  it('sem sessão é 401', async () => {
    store.logado = false

    const resposta = await reschedulePlanItem(PROJETO, ITEM, {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })
    expect(resposta.status).toBe(401)
  })

  it('a MATRIZ reagenda e a FILIAL não — papel é por empresa, não por pessoa', async () => {
    // A mesma sessão, as duas empresas: `admin` na Matriz, `viewer` na Filial.
    const naMatriz = await reschedulePlanItem(PROJETO, ITEM, {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })
    expect(naMatriz.status).toBe(200)

    await authSetActiveTenant({ tenantId: TENANT_FILIAL })

    const resposta = await reschedulePlanItem(PROJETO, ITEM, {
      startsOn: '2026-07-01',
      endsOn: '2026-07-31',
    })
    expect(resposta.status).toBe(403)
  })
})
