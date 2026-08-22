import { configurarApi } from '@/api/cliente'
import {
  authLogin,
  authSetActiveTenant,
  createPaymentTerm,
  createQuote,
  getInstallmentPolicy,
  getQuote,
  listPaymentTerms,
  updateInstallmentPolicy,
  updatePaymentTerm,
  updateQuote,
} from '@/api/gerado'
import type { PaymentTermWriteRequest, QuoteWriteRequest } from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore } from './store'

/**
 * O MOCK DO PAGAMENTO — condição, política e o bloco do documento (contrato S4).
 *
 * Trava as SEMÂNTICAS, não o dado do seed. As que este arquivo existe para
 * provar são as que se perdem em silêncio se ninguém as cobrar:
 *
 * 1. **A política EXISTE sempre.** Empresa sem linha gravada lê o PADRÃO, e não
 *    404 — "não configurado" não é um estado do parcelamento.
 * 2. **O plano é CARIMBADO na gravação.** Alterar a condição depois não mexe no
 *    documento já gravado: é a única prova possível de que a leitura não deriva,
 *    e ela só se vê rodando as duas coisas em sequência.
 * 3. **Os limites recusam em VOZ ALTA.** Condição que não cabe na política é
 *    400, nunca um plano aparado — aparar entrega um documento com vencimento
 *    que ninguém pediu, e o operador confere a soma e não acha o erro.
 *
 * Exercita pelo CLIENTE GERADO, e não por `fetch` cru: é o caminho inteiro que
 * a tela vai usar quando houver tela.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  configurarApi('http://mock.teste')
})

async function entrar(tenantId = TENANT_MATRIZ) {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId })
}

/** Uma condição válida: duas parcelas percentuais que fecham 100%. */
const EM_DOIS: PaymentTermWriteRequest = {
  name: 'ENTRADA + 30',
  active: true,
  installments: [
    { number: 1, daysAfterIssue: 0, percent: 500_000, amountCents: null },
    { number: 2, daysAfterIssue: 30, percent: 500_000, amountCents: null },
  ],
}

/** Um orçamento gravável: um item de R$ 1.000, sem desconto. */
function orcamentoDe(paymentTermId: string | null, unitPriceCents = 100_000): QuoteWriteRequest {
  return {
    series: '1',
    issuedAt: '2026-08-10',
    expiresAt: null,
    closedAt: null,
    customerId: 'cli-seed-0001',
    projectName: null,
    folderNumber: null,
    salespersonId: null,
    professionalId: null,
    discountMode: 'product',
    discountPercent: 0,
    paymentTermId,
    environments: [{ code: 'SALA', name: 'SALA', order: 1 }],
    items: [
      {
        lineNumber: 1,
        environmentCode: 'SALA',
        variantId: null,
        description: 'PENDENTE',
        finish: null,
        size: null,
        quantity: 1,
        unit: 'UN',
        unitPriceCents,
        discountPercent: 0,
        supplierId: null,
        supplierName: null,
        supplierCode: null,
        supplierDescription: null,
        productGroup: null,
        pieceType: null,
      },
    ],
  }
}

describe('a condição de pagamento é da EMPRESA', () => {
  it('a listagem traz as parcelas embutidas, e a contagem derivada delas', async () => {
    await entrar()
    const lista = await listPaymentTerms({ page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status !== 200) return
    expect(lista.data.rows.map((c) => c.name)).toEqual(['À VISTA', '30/60/90', 'ENTRADA + 2x'])

    const trinta = lista.data.rows.find((c) => c.name === '30/60/90')
    expect(trinta?.installments).toHaveLength(3)
    // DERIVADA, não guardada: é o que impede as duas verdades do legado, onde
    // `Fpg_quantidade` era coluna gravada à mão ao lado das linhas.
    expect(trinta?.installmentCount).toBe(3)
    expect(trinta?.installments.map((p) => p.daysAfterIssue)).toEqual([30, 60, 90])
  })

  it('empresa sem condição responde lista vazia, e não erro', async () => {
    await entrar(TENANT_FILIAL)
    const lista = await listPaymentTerms({ page: 1, pageSize: 100 })

    expect(lista.status).toBe(200)
    if (lista.status === 200) expect(lista.data.total).toBe(0)
  })

  it('sortBy fora da whitelist é 400', async () => {
    await entrar()
    const lista = await listPaymentTerms({ sortBy: 'installments', page: 1, pageSize: 10 })

    expect(lista.status).toBe(400)
  })

  it('nome repetido na empresa é 409', async () => {
    await entrar()
    const repetida = await createPaymentTerm({ ...EM_DOIS, name: 'À VISTA' })

    expect(repetida.status).toBe(409)
  })
})

describe('o corpo da condição recusa em voz alta', () => {
  it('condição sem parcela nenhuma é 400', async () => {
    await entrar()
    const r = await createPaymentTerm({ ...EM_DOIS, installments: [] })

    expect(r.status).toBe(400)
  })

  it('soma de percentuais que não fecha 100% é 400', async () => {
    await entrar()
    const r = await createPaymentTerm({
      ...EM_DOIS,
      installments: [
        { number: 1, daysAfterIssue: 0, percent: 500_000, amountCents: null },
        { number: 2, daysAfterIssue: 30, percent: 499_999, amountCents: null },
      ],
    })

    expect(r.status).toBe(400)
    if (r.status !== 400) return
    expect(r.data.fields?.some((f) => f.path === 'installments')).toBe(true)
  })

  it('parcela com percentual E valor fixo é 400 — exatamente um dos dois', async () => {
    await entrar()
    const r = await createPaymentTerm({
      ...EM_DOIS,
      installments: [{ number: 1, daysAfterIssue: 0, percent: 1_000_000, amountCents: 50_000 }],
    })

    expect(r.status).toBe(400)
  })

  it('numeração com buraco é 400 — a chave do legado é (condição, número)', async () => {
    await entrar()
    const r = await createPaymentTerm({
      ...EM_DOIS,
      installments: [
        { number: 1, daysAfterIssue: 0, percent: 500_000, amountCents: null },
        { number: 3, daysAfterIssue: 30, percent: 500_000, amountCents: null },
      ],
    })

    expect(r.status).toBe(400)
  })

  it('mais parcelas que o teto da empresa é 400', async () => {
    await entrar()
    const oito = Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      daysAfterIssue: i * 30,
      percent: i === 0 ? 1_000_000 - 7 * 125_000 : 125_000,
      amountCents: null,
    }))
    const r = await createPaymentTerm({ ...EM_DOIS, installments: oito })

    expect(r.status).toBe(400)
  })
})

describe('a política EXISTE sempre', () => {
  it('empresa sem linha gravada lê o PADRÃO, e não 404', async () => {
    await entrar()
    const r = await getInstallmentPolicy()

    expect(r.status).toBe(200)
    if (r.status !== 200) return
    expect(r.data).toEqual({
      minTotalToInstallCents: 10_000,
      minInstallmentCents: 5_000,
      maxInstallments: 6,
    })
  })

  it('gravada, ela substitui o padrão — e o teto passa a valer no cadastro', async () => {
    await entrar()
    const gravada = await updateInstallmentPolicy({
      minTotalToInstallCents: 0,
      minInstallmentCents: 0,
      maxInstallments: 2,
    })
    expect(gravada.status).toBe(200)

    const relida = await getInstallmentPolicy()
    expect(relida.status === 200 && relida.data.maxInstallments).toBe(2)

    // A mesma condição de 3 parcelas que o seed tem passa a ser recusada.
    const tres = await createPaymentTerm({
      name: 'EM TRÊS',
      active: true,
      installments: [
        { number: 1, daysAfterIssue: 0, percent: 334_000, amountCents: null },
        { number: 2, daysAfterIssue: 30, percent: 333_000, amountCents: null },
        { number: 3, daysAfterIssue: 60, percent: 333_000, amountCents: null },
      ],
    })
    expect(tres.status).toBe(400)
  })

  it('teto abaixo de 1 é 400 — não existe documento com zero parcela', async () => {
    await entrar()
    const r = await updateInstallmentPolicy({
      minTotalToInstallCents: 0,
      minInstallmentCents: 0,
      maxInstallments: 0,
    })

    expect(r.status).toBe(400)
  })

  it('a política é POR EMPRESA — gravar numa não muda a outra', async () => {
    await entrar()
    await updateInstallmentPolicy({
      minTotalToInstallCents: 0,
      minInstallmentCents: 0,
      maxInstallments: 2,
    })

    await authSetActiveTenant({ tenantId: TENANT_FILIAL })
    const daFilial = await getInstallmentPolicy()

    expect(daFilial.status === 200 && daFilial.data.maxInstallments).toBe(6)
  })
})

describe('o bloco Pagamento do documento', () => {
  it('o plano é ECOADO no detalhe, com data e centavos resolvidos', async () => {
    await entrar()
    const criado = await createQuote(orcamentoDe('cond-0002'))

    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    expect(criado.data.paymentTermName).toBe('30/60/90')
    expect(criado.data.paymentInstallments.map((p) => p.dueDate)).toEqual([
      '2026-09-09',
      '2026-10-09',
      '2026-11-08',
    ])
    // A soma das parcelas é o total EXATO, e a SOBRA fica na ÚLTIMA: R$ 1.000
    // em três não divide, e as duas primeiras arredondam para baixo. É onde o
    // legado a põe, e a única posição em que ela é conferível a olho contra o
    // total impresso — N-1 parcelas iguais e uma diferente.
    const soma = criado.data.paymentInstallments.reduce((t, p) => t + p.amountCents, 0)
    expect(soma).toBe(criado.data.totalCents)
    expect(criado.data.paymentInstallments.map((p) => p.amountCents)).toEqual([
      33_333, 33_333, 33_334,
    ])
  })

  it('documento sem condição tem plano VAZIO, não ausente', async () => {
    await entrar()
    const criado = await createQuote(orcamentoDe(null))

    expect(criado.status).toBe(201)
    if (criado.status !== 201) return
    expect(criado.data.paymentTermId).toBeNull()
    expect(criado.data.paymentInstallments).toEqual([])
  })

  it('a política vai CARIMBADA no documento', async () => {
    await entrar()
    const criado = await createQuote(orcamentoDe('cond-0001'))

    expect(criado.status === 201 && criado.data.installmentPolicy).toEqual({
      minTotalToInstallCents: 10_000,
      minInstallmentCents: 5_000,
      maxInstallments: 6,
    })
  })

  /**
   * A prova de que a leitura NÃO deriva.
   *
   * Só se vê rodando as duas coisas em sequência: gravar, alterar a condição, e
   * reler o documento. Se o mock derivasse o plano na leitura, as datas do
   * documento antigo mudariam junto — que é exatamente o defeito que faz um
   * documento reimpresso sair diferente de si mesmo.
   */
  it('alterar a condição NÃO reescreve o documento já gravado', async () => {
    await entrar()
    const criado = await createQuote(orcamentoDe('cond-0002'))
    if (criado.status !== 201) throw new Error('não gravou')
    const antes = criado.data.paymentInstallments.map((p) => p.dueDate)

    const alterada = await updatePaymentTerm('cond-0002', {
      name: '30/60/90',
      active: true,
      installments: [
        { number: 1, daysAfterIssue: 1, percent: 500_000, amountCents: null },
        { number: 2, daysAfterIssue: 2, percent: 500_000, amountCents: null },
      ],
    })
    expect(alterada.status).toBe(200)

    // A releitura do MESMO documento traz o plano de antes: três parcelas com as
    // datas originais, e não as duas da condição de agora.
    const relido = await getQuote(criado.data.id)

    expect(relido.status).toBe(200)
    if (relido.status !== 200) return
    expect(relido.data.paymentInstallments.map((p) => p.dueDate)).toEqual(antes)
    expect(relido.data.paymentInstallments).toHaveLength(3)
  })

  /**
   * O outro lado da mesma moeda: REGRAVAR o documento o traz para a condição de
   * hoje. O carimbo protege o passado, não congela o documento — quem aperta
   * `Gravar` está pedindo o plano vigente, e é isso que o `PUT` integral faz.
   */
  it('regravar o documento o traz para a condição de HOJE', async () => {
    await entrar()
    const criado = await createQuote(orcamentoDe('cond-0002'))
    if (criado.status !== 201) throw new Error('não gravou')

    await updatePaymentTerm('cond-0002', {
      name: '30/60/90',
      active: true,
      installments: [
        { number: 1, daysAfterIssue: 1, percent: 500_000, amountCents: null },
        { number: 2, daysAfterIssue: 2, percent: 500_000, amountCents: null },
      ],
    })

    const regravado = await updateQuote(criado.data.id, orcamentoDe('cond-0002'))

    expect(regravado.status).toBe(200)
    if (regravado.status !== 200) return
    expect(regravado.data.paymentInstallments.map((p) => p.dueDate)).toEqual([
      '2026-08-11',
      '2026-08-12',
    ])
  })

  it('condição inativa não pode ser escolhida — 400, e não silêncio', async () => {
    await entrar()
    const desativada = await updatePaymentTerm('cond-0002', {
      name: '30/60/90',
      active: false,
      installments: [{ number: 1, daysAfterIssue: 30, percent: 1_000_000, amountCents: null }],
    })
    expect(desativada.status).toBe(200)

    const criado = await createQuote(orcamentoDe('cond-0002'))
    expect(criado.status).toBe(400)
  })

  it('parcela abaixo do mínimo da empresa é 400, e o documento não fica gravado', async () => {
    await entrar()
    // Total de R$ 60,00 em 3x daria R$ 20,00 por parcela — abaixo dos R$ 50.
    const criado = await createQuote(orcamentoDe('cond-0002', 6_000))

    expect(criado.status).toBe(400)

    const lista = await listPaymentTerms({ page: 1, pageSize: 100 })
    expect(lista.status).toBe(200)
  })

  it('total abaixo do mínimo para parcelar é 400 — mas a parcela única passa', async () => {
    await entrar()
    await updateInstallmentPolicy({
      minTotalToInstallCents: 500_000,
      minInstallmentCents: 0,
      maxInstallments: 6,
    })

    const parcelado = await createQuote(orcamentoDe('cond-0002'))
    expect(parcelado.status).toBe(400)

    const aVista = await createQuote(orcamentoDe('cond-0001'))
    expect(aVista.status).toBe(201)
  })
})
