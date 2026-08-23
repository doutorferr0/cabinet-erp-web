import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  cancelQuote,
  createQuote,
  getQuote,
  listQuotes,
  reviseQuote,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { resetObras } from './obras'
import { resetQuotes } from './quotes'
import { TENANT_MATRIZ, resetStore } from './store'

/**
 * O CICLO DE VIDA do documento de venda no servidor falso (G13).
 *
 * O que se prova aqui não é a tela — é o que o mock passou a RECUSAR. Mock que
 * aceita o que o servidor recusa é pior que mock ausente: ele ensina a tela um
 * caminho que só falha em produção, e o site público (100% mock) o demonstra
 * como se funcionasse.
 *
 * Três recusas, e nenhuma existia antes: cancelar duas vezes, cancelar com
 * motivo de outra lista, e revisar duas vezes o mesmo orçamento.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  resetQuotes()
  resetObras()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

/** O corpo mínimo que o contrato aceita — igual ao de `quotes.test.ts`. */
function corpoMinimo(over: Record<string, unknown> = {}) {
  return {
    customerId: 'cli-0001',
    discountMode: 'product',
    discountPercent: 0,
    environments: [],
    items: [],
    ...over,
  }
}

async function novoOrcamento() {
  const criado = await createQuote(corpoMinimo() as never)
  if (criado.status !== 201) throw new Error('criação falhou')
  return criado.data
}

describe('cancelamento com motivo', () => {
  it('grava motivo, nota e data — e resolve o NOME na leitura', async () => {
    const orcamento = await novoOrcamento()

    const cancelado = await cancelQuote(orcamento.id, {
      reasonId: 'lk-MOTIVO_CANCELAMENTO-2',
      note: 'cliente achou caro depois do reajuste',
    })

    expect(cancelado.status).toBe(200)
    if (cancelado.status !== 200) return
    expect(cancelado.data.status).toBe('cancelled')
    expect(cancelado.data.cancelReasonId).toBe('lk-MOTIVO_CANCELAMENTO-2')
    // O nome NÃO é guardado junto: ele vem da lista de hoje, como `workName`.
    expect(cancelado.data.cancelReasonName).toBe('PREÇO')
    expect(cancelado.data.cancelNote).toBe('cliente achou caro depois do reajuste')
    expect(cancelado.data.cancelledAt).not.toBeNull()

    // e sobrevive à releitura — cancelamento não é estado de resposta
    const relido = await getQuote(orcamento.id)
    if (relido.status !== 200) throw new Error('releitura falhou')
    expect(relido.data.cancelReasonName).toBe('PREÇO')
  })

  it('cancelar SEM corpo continua valendo — o corpo é opcional no contrato', async () => {
    const orcamento = await novoOrcamento()

    const cancelado = await cancelQuote(orcamento.id)

    expect(cancelado.status).toBe(200)
    if (cancelado.status !== 200) return
    expect(cancelado.data.status).toBe('cancelled')
    expect(cancelado.data.cancelReasonId).toBeNull()
    // A DATA existe mesmo sem motivo: quando cancelou é fato, por que é opinião.
    expect(cancelado.data.cancelledAt).not.toBeNull()
  })

  it('motivo de OUTRA lista é 400 apontando o campo, não cancelamento motivado por marca', async () => {
    const orcamento = await novoOrcamento()

    // `lk-MARCA-1` existe e resolve para 'EVOLED' — é o defeito da api#72 visto
    // daqui: sem conferir o KIND, o documento sairia cancelado por uma marca de
    // luminária, e a tela imprimiria isso como motivo.
    const recusado = await cancelQuote(orcamento.id, { reasonId: 'lk-MARCA-1' })

    expect(recusado.status).toBe(400)
    if (recusado.status !== 400) return
    expect(recusado.data.type).toBe('urn:cabinet:erro:campos-invalidos')
    expect(recusado.data.fields?.map((f) => f.path)).toContain('reasonId')

    // e o documento continua ATIVO — recusa que grava metade é pior que recusa
    const relido = await getQuote(orcamento.id)
    if (relido.status !== 200) throw new Error('releitura falhou')
    expect(relido.data.status).toBe('active')
  })

  it('cancelar duas vezes é 409, e o segundo motivo NÃO sobrescreve o primeiro', async () => {
    const orcamento = await novoOrcamento()
    await cancelQuote(orcamento.id, { reasonId: 'lk-MOTIVO_CANCELAMENTO-1' })

    const denovo = await cancelQuote(orcamento.id, { reasonId: 'lk-MOTIVO_CANCELAMENTO-4' })

    expect(denovo.status).toBe(409)
    if (denovo.status !== 409) return
    expect(denovo.data.type).toBe('urn:cabinet:erro:transicao-invalida')

    const relido = await getQuote(orcamento.id)
    if (relido.status !== 200) throw new Error('releitura falhou')
    expect(relido.data.cancelReasonId).toBe('lk-MOTIVO_CANCELAMENTO-1')
  })
})

describe('revisão de orçamento', () => {
  it('cria documento NOVO apontando o anterior, e o anterior fica intacto', async () => {
    const original = await novoOrcamento()

    const revisao = await reviseQuote(original.id)

    expect(revisao.status).toBe(201)
    if (revisao.status !== 201) return
    expect(revisao.data.id).not.toBe(original.id)
    expect(revisao.data.number).not.toBe(original.number)
    expect(revisao.data.revision).toBe(2)
    expect(revisao.data.revisionOfId).toBe(original.id)
    expect(revisao.data.revisionOfNumber).toBe(original.number)

    // O original é o que o cliente viu: continua ativo e na revisão 1.
    const anterior = await getQuote(original.id)
    if (anterior.status !== 200) throw new Error('releitura falhou')
    expect(anterior.data.status).toBe('active')
    expect(anterior.data.revision).toBe(1)
    expect(anterior.data.revisionOfId).toBeNull()
  })

  it('a revisão viaja na LISTAGEM — é lá que os dois do mesmo dia aparecem juntos', async () => {
    const original = await novoOrcamento()
    const revisao = await reviseQuote(original.id)
    if (revisao.status !== 201) throw new Error('revisão falhou')

    const lista = await listQuotes({ page: 1, pageSize: 100 })
    if (lista.status !== 200) throw new Error('listagem falhou')

    const linha = lista.data.rows.find((r) => r.id === revisao.data.id)
    expect(linha?.revision).toBe(2)
    expect(linha?.revisionOfId).toBe(original.id)
  })

  it('revisar duas vezes o MESMO orçamento é 409 — a cadeia não vira árvore', async () => {
    const original = await novoOrcamento()
    await reviseQuote(original.id)

    const segunda = await reviseQuote(original.id)

    expect(segunda.status).toBe(409)
    if (segunda.status !== 409) return
    expect(segunda.data.type).toBe('urn:cabinet:erro:orcamento-ja-revisado')
  })

  it('a revisão da revisão SAI da revisão — v3 aponta a v2, não o original', async () => {
    const original = await novoOrcamento()
    const v2 = await reviseQuote(original.id)
    if (v2.status !== 201) throw new Error('revisão falhou')

    const v3 = await reviseQuote(v2.data.id)

    expect(v3.status).toBe(201)
    if (v3.status !== 201) return
    expect(v3.data.revision).toBe(3)
    expect(v3.data.revisionOfId).toBe(v2.data.id)
  })

  it('revisar orçamento cancelado é 409 — ressuscitar por outro nome', async () => {
    const orcamento = await novoOrcamento()
    await cancelQuote(orcamento.id)

    const revisao = await reviseQuote(orcamento.id)

    expect(revisao.status).toBe(409)
    if (revisao.status !== 409) return
    expect(revisao.data.type).toBe('urn:cabinet:erro:transicao-invalida')
  })
})
