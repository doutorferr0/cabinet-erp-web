import { SEM_PERMISSAO, papelDaSessao, verificarEscrita } from '@/mocks/api/permissao'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore, store } from '@/mocks/api/store'
import { beforeEach, describe, expect, it } from 'vitest'

describe('papelDaSessao', () => {
  it('devolve null quando não há empresa ativa', () => {
    resetStore()
    expect(papelDaSessao()).toBeNull()
  })

  it('devolve o papel do vínculo ativo', () => {
    resetStore()
    store.activeTenantId = TENANT_MATRIZ
    expect(papelDaSessao()).toBe('admin')

    store.activeTenantId = TENANT_FILIAL
    expect(papelDaSessao()).toBe('viewer')
  })
})

describe('SEM_PERMISSAO', () => {
  /**
   * O `title` é o do TIPO, não o do status.
   *
   * `Sem permissão` é o rótulo genérico de qualquer 403 — o que o status já
   * dizia. Quem distingue é a URN, e o contrato fixa um título por URN
   * (`ProblemType`, #269). O 403 de papel e o de vínculo têm saídas diferentes
   * na tela (pedir a um admin · trocar de empresa) e não podem chegar com o
   * mesmo cabeçalho.
   */
  it('é uma resposta 403 com o type e o título do papel insuficiente', async () => {
    const resposta = SEM_PERMISSAO('products')
    expect(resposta.status).toBe(403)

    const corpo = await resposta.json()
    expect(corpo).toMatchObject({
      status: 403,
      type: 'urn:cabinet:erro:papel-insuficiente',
      detail: expect.stringContaining('products'),
      title: 'Papel insuficiente',
    })
  })
})

describe('verificarEscrita', () => {
  beforeEach(() => {
    resetStore()
  })

  it('devolve undefined quando o papel alcança a família', () => {
    store.activeTenantId = TENANT_MATRIZ // admin
    expect(verificarEscrita('products')).toBeUndefined()
    expect(verificarEscrita('employees')).toBeUndefined()
  })

  it('devolve SEM_PERMISSAO quando o papel não alcança', () => {
    store.activeTenantId = TENANT_FILIAL // viewer
    const resposta = verificarEscrita('products')
    expect(resposta).toBeDefined()
    expect(resposta?.status).toBe(403)
  })

  it('devolve SEM_PERMISSAO quando não há empresa ativa', () => {
    resetStore()
    const resposta = verificarEscrita('crm')
    expect(resposta).toBeDefined()
    expect(resposta?.status).toBe(403)
  })
})
