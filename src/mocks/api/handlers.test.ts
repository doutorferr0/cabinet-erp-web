import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authLogout,
  authMe,
  authSetActiveTenant,
  createPartner,
  createStockMovement,
  listProducts,
  listStockMovements,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * Trava as SEMÂNTICAS do modo mock — não o dado do seed.
 *
 * O mock é o "backend" das telas enquanto o backend Node não existe, e estas
 * semânticas são as de `docs/integracao.md`: se o mock divergir delas, as telas
 * treinam contra um servidor errado e a re-integração cobra depois. Exercita
 * pelo CLIENTE GERADO, não por fetch cru — o caminho inteiro que a tela usa.
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

describe('sessão', () => {
  it('login abre a sessão, logout fecha — /auth/me conta a verdade', async () => {
    expect((await authMe()).status).toBe(401)

    const login = await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    expect(login.status).toBe(200)
    expect((await authMe()).status).toBe(200)

    await authLogout()
    expect((await authMe()).status).toBe(401)
  })

  it('senha "temporaria" liga mustChangePassword — o fluxo da guarda existe no mock', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'temporaria' })
    const sessao = await authMe()
    expect(sessao.status).toBe(200)
    if (sessao.status === 200) expect(sessao.data.mustChangePassword).toBe(true)
  })
})

describe('empresa ativa', () => {
  it('sem empresa o domínio responde VAZIO, não erro', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    const resposta = await listProducts({ page: 1, pageSize: 10 })
    expect(resposta.status).toBe(200)
    if (resposta.status === 200) {
      expect(resposta.data).toEqual({ rows: [], total: 0 })
    }
  })
})

describe('contrato de listagem', () => {
  it('pagina 1-based e devolve total COM o filtro', async () => {
    await entrarComEmpresa()

    const tudo = await listProducts({ page: 1, pageSize: 2 })
    expect(tudo.status).toBe(200)
    if (tudo.status === 200) {
      expect(tudo.data.rows).toHaveLength(2)
      expect(tudo.data.total).toBe(3)
    }

    const filtrado = await listProducts({ q: 'pendente', page: 1, pageSize: 10 })
    if (filtrado.status === 200) {
      expect(filtrado.data.total).toBe(1)
      expect(filtrado.data.rows[0]?.code).toBe('PD-1001')
    }
  })

  it('pageSize acima do teto de 100 é 400, não truncagem silenciosa', async () => {
    await entrarComEmpresa()
    const resposta = await listProducts({ page: 1, pageSize: 101 })
    expect(resposta.status).toBe(400)
  })

  it('sortBy fora da whitelist é 400', async () => {
    await entrarComEmpresa()
    const resposta = await listProducts({ page: 1, pageSize: 10, sortBy: 'paymentTerms' })
    expect(resposta.status).toBe(400)
  })
})

describe('409 de documento repetido', () => {
  it('carrega existingPartnerId — o membro de extensão que a tela usa', async () => {
    await entrarComEmpresa()
    const resposta = await createPartner({
      legalName: 'OUTRA RAZAO SOCIAL',
      tradeName: null,
      document: '11222333000144',
      email: null,
      isCustomer: false,
      isSupplier: true,
      isProfessional: false,
      code: null,
      paymentTerms: null,
      active: true,
    })
    expect(resposta.status).toBe(409)
    const corpo = resposta.data as { existingPartnerId?: string }
    expect(corpo.existingPartnerId).toBe('parc-0001')
  })
})

describe('kardex — o saldo é derivado do movimento (ADR-009)', () => {
  it('movimento muda o saldo e devolve balanceAfter; saldo negativo é 409', async () => {
    await entrarComEmpresa()

    const saida = await createStockMovement('var-0001', { delta: -2, reason: 'venda' })
    expect(saida.status).toBe(201)
    if (saida.status === 201) expect(saida.data.balanceAfter).toBe(10)

    const entrada = await createStockMovement('var-0001', { delta: 5, reason: 'compra' })
    if (entrada.status === 201) expect(entrada.data.balanceAfter).toBe(15)

    const invalido = await createStockMovement('var-0001', { delta: -999, reason: 'ajuste' })
    expect(invalido.status).toBe(409)

    const extrato = await listStockMovements('var-0001', { page: 1, pageSize: 10 })
    expect(extrato.status).toBe(200)
    if (extrato.status === 200) expect(extrato.data.total).toBe(2)
  })
})
