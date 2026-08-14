import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createQuoteFromOpportunity,
  getCrmOpportunity,
  listQuotes,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { crm, resetCrm } from './crm'
import { handlers } from './handlers'
import { resetQuotes } from './quotes'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * CONVERSÃO oportunidade → orçamento, no mock.
 *
 * O que se prova aqui é o desenho que o contrato pediu: a criação do documento
 * e a gravação do vínculo são UMA operação. Se o mock divergir disso, a tela
 * treina contra um servidor que não existe — e o preço aparece na integração,
 * na forma de orçamento órfão.
 */

const servidor = setupServer(...handlers)
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetCrm()
  resetQuotes()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/** A oportunidade do seed que TEM parceiro cadastrado. */
const COM_PARCEIRO = 'op-0001'
/** A que tem só contato solto — lead sem cadastro. */
const SEM_PARCEIRO = 'op-0002'

describe('gerar orçamento a partir da oportunidade', () => {
  it('cria o documento e grava o vínculo na MESMA operação', async () => {
    const antes = await listQuotes({ page: 1, pageSize: 100 })
    if (antes.status !== 200) throw new Error('listagem falhou')
    const totalAntes = antes.data.total

    const resposta = await createQuoteFromOpportunity(COM_PARCEIRO)
    expect(resposta.status).toBe(201)
    if (resposta.status !== 201) return

    // O documento existe...
    const depois = await listQuotes({ page: 1, pageSize: 100 })
    if (depois.status !== 200) throw new Error('listagem falhou')
    expect(depois.data.total).toBe(totalAntes + 1)

    // ...e a oportunidade já aponta para ele. Sem uma segunda requisição.
    const oportunidade = await getCrmOpportunity(COM_PARCEIRO)
    if (oportunidade.status !== 200) throw new Error('oportunidade sumiu')
    expect(oportunidade.data.quoteId).toBe(resposta.data.id)
  })

  it('o documento nasce SEM ITEM — a oportunidade não congela preço', async () => {
    const resposta = await createQuoteFromOpportunity(COM_PARCEIRO)
    expect(resposta.status).toBe(201)
    if (resposta.status !== 201) return

    expect(resposta.data.items).toEqual([])
    expect(resposta.data.environments).toEqual([])
    expect(resposta.data.totalCents).toBe(0)
  })

  it('copia cliente e nome do projeto da oportunidade', async () => {
    const origem = crm.oportunidades.find((o) => o.id === COM_PARCEIRO)
    const resposta = await createQuoteFromOpportunity(COM_PARCEIRO)
    if (resposta.status !== 201) throw new Error('conversão falhou')

    expect(resposta.data.customerId).toBe(origem?.partnerId)
    expect(resposta.data.projectName).toBe(origem?.name)
    // O NÚMERO é do servidor, e continua a sequência dos orçamentos que já existem.
    expect(resposta.data.number).toBeTruthy()
  })

  it('lead SEM cadastro é 400 — o orçamento exige cliente', async () => {
    const resposta = await createQuoteFromOpportunity(SEM_PARCEIRO)
    expect(resposta.status).toBe(400)
  })

  it('converter a JÁ convertida é 409, não um segundo documento', async () => {
    const primeira = await createQuoteFromOpportunity(COM_PARCEIRO)
    expect(primeira.status).toBe(201)

    const segunda = await createQuoteFromOpportunity(COM_PARCEIRO)
    expect(segunda.status, 'dois documentos para o mesmo negócio é o que o vínculo impede').toBe(
      409,
    )

    const lista = await listQuotes({ page: 1, pageSize: 100 })
    if (lista.status !== 200) throw new Error('listagem falhou')
    const doNegocio = lista.data.rows.filter(
      (o) => o.projectName === crm.oportunidades.find((x) => x.id === COM_PARCEIRO)?.name,
    )
    expect(doNegocio).toHaveLength(1)
  })

  it('oportunidade inexistente é 404', async () => {
    const resposta = await createQuoteFromOpportunity('op-que-nao-existe')
    expect(resposta.status).toBe(404)
  })

  it('sem empresa ativa a escrita é 409, como toda escrita do domínio', async () => {
    await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
    const { store } = await import('./store')
    store.activeTenantId = null

    const resposta = await createQuoteFromOpportunity(COM_PARCEIRO)
    expect(resposta.status).toBe(409)
  })
})
