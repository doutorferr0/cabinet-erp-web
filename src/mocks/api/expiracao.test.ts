import { configurarApi } from '@/api/cliente'
import { authLogin, authMe, authSetActiveTenant, createPartner, listProducts } from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import {
  TENANT_MATRIZ,
  armarExpiracaoDaProximaEscrita,
  expirarSessaoAgora,
  resetStore,
  store,
} from './store'

/**
 * O ensaio de expiração de sessão (#124, ponto 4).
 *
 * Prova pelo CLIENTE GERADO, como o resto dos handlers: é o caminho que a tela
 * percorre. Um teste que chamasse o handler direto provaria a função, não o
 * comportamento que o operador vai ver no navegador.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  configurarApi('http://mock.teste')
})

async function entrarComEmpresa() {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
}

/**
 * Documento inédito no seed (que usa `11222333000144`, `55666777000188` e
 * `99888777000166`): aqui o 201 é o sinal de "a escrita passou", e um documento
 * repetido daria 409 sem que o gatilho tivesse nada a ver com isso.
 */
const parceiroNovo = {
  legalName: 'CLIENTE DO ENSAIO LTDA',
  tradeName: null,
  document: '10203040000150',
  email: null,
  isCustomer: true,
  isSupplier: false,
  isProfessional: false,
  code: null,
  paymentTerms: null,
  active: true,
}

describe('expirar a PRÓXIMA escrita', () => {
  it('a escrita seguinte responde 401 e o gatilho se desarma', async () => {
    await entrarComEmpresa()
    armarExpiracaoDaProximaEscrita()

    expect((await createPartner(parceiroNovo)).status).toBe(401)
    // Desarmado: a segunda tentativa passa. É o que permite o reenvio depois da
    // reentrada — gatilho permanente provaria o contrário do que se quer mostrar.
    expect((await createPartner(parceiroNovo)).status).toBe(201)
  })

  it('a LEITURA continua de pé — a tela não pode ser desmontada no meio', async () => {
    await entrarComEmpresa()
    armarExpiracaoDaProximaEscrita()

    // O alvo é o envio. Se a leitura caísse junto, a guarda desmontaria o
    // formulário antes de ele reagir, apagando o que o ensaio quer observar.
    expect((await listProducts({ page: 1, pageSize: 10 })).status).toBe(200)
    expect((await authMe()).status).toBe(200)
    // E o gatilho continua armado, esperando a escrita.
    expect(store.expiraProximaEscrita).toBe(true)
    expect((await createPartner(parceiroNovo)).status).toBe(401)
  })

  it('o LOGIN nunca expira — é por ele que o operador reentra', async () => {
    await entrarComEmpresa()
    armarExpiracaoDaProximaEscrita()

    // `/auth/login` é POST e cairia no gatilho se ele não o poupasse: a tela
    // pediria para entrar de novo, e a reentrada tomaria 401 também — ensaio
    // sem saída.
    expect((await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })).status).toBe(200)
    expect(store.expiraProximaEscrita).toBe(true)
  })

  it('sem armar, escrita nenhuma é afetada', async () => {
    await entrarComEmpresa()

    expect((await createPartner(parceiroNovo)).status).toBe(201)
  })
})

describe('expirar a sessão inteira', () => {
  it('derruba a sessão: /auth/me passa a 401, como cookie vencido', async () => {
    await entrarComEmpresa()
    expect((await authMe()).status).toBe(200)

    expirarSessaoAgora()

    expect((await authMe()).status).toBe(401)
    // A empresa ativa cai junto: sessão derrubada não guarda contexto.
    expect(store.activeTenantId).toBeNull()
  })

  it('entrar de novo devolve a sessão', async () => {
    await entrarComEmpresa()
    expirarSessaoAgora()

    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })

    expect((await authMe()).status).toBe(200)
  })
})
