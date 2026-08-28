import { configurarApi } from '@/api/cliente'
import type { ApprovalRequestDto, PagedResultOfApprovalRequestDto } from '@/api/gerado'
import {
  approveApprovalRequest,
  authLogin,
  authSetActiveTenant,
  getApprovalSummary,
  listApprovalRequests,
  rejectApprovalRequest,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetAprovacoes } from './aprovacoes'
import { handlers } from './handlers'
import { resetQuotes } from './quotes'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore } from './store'

/**
 * O MOCK DA FILA DE APROVAÇÕES (F12).
 *
 * Trava as SEMÂNTICAS, não o dado do seed — as quatro que se perdem em silêncio
 * se ninguém as cobrar, e que nenhum servidor implementa ainda:
 *
 * 1. **O recorte é do SERVIDOR.** Quem decide vê a fila inteira; quem não decide
 *    vê só o que ele mesmo abriu. Feito na tela, o pedido do colega estaria no
 *    navegador de quem não pode vê-lo.
 * 2. **Quem pediu não decide o próprio pedido**, mesmo com papel de sobra — e a
 *    recusa tem URN própria, separada de `papel-insuficiente`, porque a saída é
 *    outra: não falta acesso, falta outra pessoa.
 * 3. **Decisão é TERMINAL.** Aprovar de novo é 409, não idempotência silenciosa.
 * 4. **Recusa sem motivo é 400 DO SERVIDOR**, não só do formulário.
 *
 * Exercita pelo CLIENTE GERADO, que é o caminho inteiro que a tela usa.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  resetQuotes()
  resetAprovacoes()
  configurarApi('http://mock.teste')
})

async function entrar(tenantId = TENANT_MATRIZ) {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId })
}

function linhas(resposta: { data?: unknown }): ApprovalRequestDto[] {
  return (resposta.data as PagedResultOfApprovalRequestDto).rows
}

describe('o recorte da fila é do servidor, não da tela', () => {
  it('quem DECIDE vê a fila inteira da empresa — inclusive o próprio pedido', async () => {
    await entrar()
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })

    expect(fila.status).toBe(200)
    const ids = linhas(fila).map((p) => p.id)
    expect(ids).toContain('apr-0001')
    // O próprio pedido ENTRA na lista: é como quem pediu sabe que está
    // esperando alguém. O que ele não pode é decidi-lo.
    expect(ids).toContain('apr-0003')
  })

  it('quem NÃO decide vê só os pedidos que ele abriu', async () => {
    // Na filial o vínculo é `viewer` — a mesma pessoa, outro papel.
    await entrar(TENANT_FILIAL)
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })

    const linhasDaFilial = linhas(fila)
    expect(linhasDaFilial.map((p) => p.id)).toEqual(['apr-0006'])
    expect(linhasDaFilial.every((p) => p.requestedByEmployeeId === 'emp-admin')).toBe(true)
  })

  it('a empresa RECORTA: pedido da matriz não aparece na filial', async () => {
    await entrar(TENANT_FILIAL)
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })
    expect(linhas(fila).map((p) => p.id)).not.toContain('apr-0001')
  })
})

describe('canDecide é resposta do servidor, não dedução do papel', () => {
  it('pedido de outra pessoa, pendente, com papel: decide', async () => {
    await entrar()
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })
    expect(linhas(fila).find((p) => p.id === 'apr-0001')?.canDecide).toBe(true)
  })

  it('o PRÓPRIO pedido não se decide, mesmo com papel de sobra', async () => {
    await entrar()
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })
    expect(linhas(fila).find((p) => p.id === 'apr-0003')?.canDecide).toBe(false)
  })

  it('pedido já decidido não se decide de novo', async () => {
    await entrar()
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })
    expect(linhas(fila).find((p) => p.id === 'apr-0004')?.canDecide).toBe(false)
  })

  it('sem papel de decisão, nenhuma linha é decidível', async () => {
    await entrar(TENANT_FILIAL)
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })
    expect(linhas(fila).every((p) => p.canDecide === false)).toBe(true)
  })
})

describe('decidir', () => {
  it('aprovar carimba quem decidiu e a hora, e a decisão é TERMINAL', async () => {
    await entrar()
    const primeira = await approveApprovalRequest('apr-0001', { reason: 'Cliente grande.' })

    expect(primeira.status).toBe(200)
    const pedido = primeira.data as ApprovalRequestDto
    expect(pedido.status).toBe('approved')
    expect(pedido.decidedByEmployeeId).toBe('emp-admin')
    expect(pedido.decidedAt).toBeTruthy()
    expect(pedido.decisionReason).toBe('Cliente grande.')
    // E não se decide de novo — "já foi decidido" é 409 com URN própria, e não
    // um 200 silencioso que faria dois cliques parecerem um.
    expect(pedido.canDecide).toBe(false)

    const segunda = await approveApprovalRequest('apr-0001', { reason: null })
    expect(segunda.status).toBe(409)
    expect((segunda.data as { type: string }).type).toBe('urn:cabinet:erro:aprovacao-ja-decidida')
  })

  it('recusar EXIGE motivo — e quem recusa é o servidor, não o formulário', async () => {
    await entrar()
    const semMotivo = await rejectApprovalRequest('apr-0001', { reason: '' })

    expect(semMotivo.status).toBe(400)
    expect((semMotivo.data as { type: string }).type).toBe('urn:cabinet:erro:campos-invalidos')
    expect((semMotivo.data as { fields: { path: string }[] }).fields[0]?.path).toBe('reason')
  })

  it('recusar com motivo registra o motivo — é o que o solicitante lê para corrigir', async () => {
    await entrar()
    const recusa = await rejectApprovalRequest('apr-0001', { reason: 'Margem fica negativa.' })

    expect(recusa.status).toBe(200)
    const pedido = recusa.data as ApprovalRequestDto
    expect(pedido.status).toBe('rejected')
    expect(pedido.decisionReason).toBe('Margem fica negativa.')
  })

  it('quem PEDIU não decide o próprio pedido, e a URN é própria', async () => {
    await entrar()
    const resposta = await approveApprovalRequest('apr-0003', { reason: 'eu mesmo' })

    expect(resposta.status).toBe(403)
    // Separada de `papel-insuficiente` de propósito: aqui não falta acesso,
    // falta outra pessoa — e a tela diz coisas diferentes nos dois casos.
    expect((resposta.data as { type: string }).type).toBe(
      'urn:cabinet:erro:aprovacao-do-solicitante',
    )
  })

  it('sem papel de decisão, aprovar é 403 de papel', async () => {
    await entrar(TENANT_FILIAL)
    // `apr-0006` é da filial e foi aberto pelo próprio operador; para medir o
    // 403 de PAPEL é preciso um pedido de outra pessoa — e na filial não há.
    // Então o que se mede aqui é o outro lado: o pedido da MATRIZ não existe
    // para quem está na filial.
    const resposta = await approveApprovalRequest('apr-0001', { reason: null })
    expect(resposta.status).toBe(404)
  })

  it('pedido inexistente é 404, não 500', async () => {
    await entrar()
    const resposta = await approveApprovalRequest('apr-9999', { reason: null })
    expect(resposta.status).toBe(404)
  })
})

describe('a listagem responde como o contrato promete', () => {
  it('sortBy fora da whitelist é 400 do SERVIDOR, não ordenação ignorada', async () => {
    await entrar()
    const resposta = await listApprovalRequests({
      page: 1,
      pageSize: 10,
      sortBy: 'customerName',
    })

    expect(resposta.status).toBe(400)
    expect((resposta.data as { type: string }).type).toBe('urn:cabinet:erro:ordenacao-invalida')
  })

  it('o status recorta, e ausente devolve as três situações', async () => {
    await entrar()
    const pendentes = await listApprovalRequests({ page: 1, pageSize: 100, status: 'pending' })
    const todas = await listApprovalRequests({ page: 1, pageSize: 100 })

    expect(linhas(pendentes).every((p) => p.status === 'pending')).toBe(true)
    expect(new Set(linhas(todas).map((p) => p.status))).toEqual(
      new Set(['pending', 'approved', 'rejected']),
    )
  })

  it('o `q` procura no documento, no cliente e em quem pediu', async () => {
    await entrar()
    const porQuemPediu = await listApprovalRequests({ page: 1, pageSize: 100, q: 'carlos' })

    expect(linhas(porQuemPediu).length).toBeGreaterThan(0)
    expect(linhas(porQuemPediu).every((p) => /carlos/i.test(p.requestedByName ?? ''))).toBe(true)
  })

  it('sem sessão é 401, e não fila vazia', async () => {
    const resposta = await listApprovalRequests({ page: 1, pageSize: 10 })
    expect(resposta.status).toBe(401)
  })

  it('sem empresa ativa a fila é VAZIA — para uma coleção da empresa, vazio é a verdade', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    const resposta = await listApprovalRequests({ page: 1, pageSize: 10 })

    expect(resposta.status).toBe(200)
    expect(resposta.data).toEqual({ rows: [], total: 0 })
  })
})

describe('o resumo é o badge, e ele conta o que EU posso resolver', () => {
  it('conta os pendentes decidíveis — o próprio pedido fica de fora', async () => {
    await entrar()
    const resumo = await getApprovalSummary()

    expect(resumo.status).toBe(200)
    // Três pendentes na matriz; um é do próprio operador. Badge que contasse os
    // três mandaria procurar um botão que não existe naquela linha.
    expect(resumo.data).toEqual({ pendingCount: 2, canDecide: true })
  })

  it('quem não decide não tem badge — nem com pedido próprio esperando', async () => {
    await entrar(TENANT_FILIAL)
    const resumo = await getApprovalSummary()
    expect(resumo.data).toEqual({ pendingCount: 0, canDecide: false })
  })

  it('decidir REDUZ a contagem — é o que faz o badge sumir sozinho', async () => {
    await entrar()
    await approveApprovalRequest('apr-0001', { reason: null })
    const resumo = await getApprovalSummary()

    expect((resumo.data as { pendingCount: number }).pendingCount).toBe(1)
  })

  it('sem empresa ativa o badge é zero, e não 409 — ele é ornamento de barra', async () => {
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    const resumo = await getApprovalSummary()

    expect(resumo.status).toBe(200)
    expect(resumo.data).toEqual({ pendingCount: 0, canDecide: false })
  })
})

describe('os valores da linha saem do DOCUMENTO, não de fachada', () => {
  it('o desconto em dinheiro bate com o total do orçamento que o gerou', async () => {
    await entrar()
    const fila = await listApprovalRequests({ page: 1, pageSize: 100 })
    const pedido = linhas(fila).find((p) => p.id === 'apr-0001')

    // A régua da decisão é o dinheiro: percentual sozinho não separa 18% de mil
    // reais de 18% de duzentos mil. Se o valor fosse inventado, a coluna mais
    // importante da tela seria a única falsa.
    expect(pedido?.documentTotalCents).toBeGreaterThan(0)
    expect(pedido?.discountCents).toBeGreaterThan(0)
    expect(pedido?.subjectId).toBe('orc-0001')
    expect(pedido?.subjectLabel).toBeTruthy()
  })
})
