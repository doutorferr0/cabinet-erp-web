import { configurarApi } from '@/api/cliente'
import type { FinancialInstallmentDto, FinancialTitleDto, ProblemDetails } from '@/api/gerado'
import {
  authLogin,
  authSetActiveTenant,
  cancelFinancialTitle,
  createFinancialTitle,
  listBankAccounts,
  listFinancialInstallments,
  listFinancialTitles,
  listPaymentModes,
  settleBatch,
  settleInstallment,
  updateFinancialTitle,
} from '@/api/gerado'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetFinanceiro } from './financeiro'
import { handlers } from './handlers'
import { TENANT_MATRIZ, resetStore, store } from './store'

/**
 * O MOCK DO FINANCEIRO (G7) — título, parcela e quitação.
 *
 * Trava as REGRAS DE DINHEIRO, não o dado do seed. São as que somem em silêncio
 * se ninguém as cobrar, e cada uma é uma decisão do contrato:
 *
 * 1. **O destino é obrigatório e EXCLUSIVO** — conta XOR caixa. Sem ele, a baixa
 *    fica quitada no sistema e invisível no caixa.
 * 2. **A menor é 403 com URN própria; acima do saldo é 409.** Parecem a mesma
 *    recusa e pedem coisas opostas do operador — uma depende de QUEM pede, a
 *    outra não tem alçada que libere.
 * 3. **O lote é tudo ou nada.** Se a última linha recusa, nenhuma das
 *    anteriores fica gravada — o contrário é a forma de pagar em dobro.
 * 4. **Título com baixa não se reescreve nem se cancela.** O passado não se
 *    reescreve depois que o dinheiro andou.
 *
 * Exercita pelo CLIENTE GERADO, que é o caminho inteiro que a tela usa.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(() => {
  resetStore()
  resetFinanceiro()
  configurarApi('http://mock.teste')
})

async function entrar(papel?: 'owner') {
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
  if (papel) {
    // A alçada da quitação a menor é do `owner` no mock — o seed entra como
    // `admin`, que é quem opera o site público e quem precisa VER a recusa.
    const vinculo = store.empresas.find((e) => e.tenantId === TENANT_MATRIZ)
    if (vinculo) vinculo.role = papel
  }
}

const EVOLED = 'parc-0001'
const HORIZONTE = 'parc-0003'

async function contaEModo() {
  const contas = await listBankAccounts({ page: 1, pageSize: 50 })
  const modos = await listPaymentModes({ page: 1, pageSize: 50, usableInSettlement: true })
  return {
    bankAccountId: (contas.data as { rows: { id: string }[] }).rows[0]?.id as string,
    paymentModeId: (modos.data as { rows: { id: string }[] }).rows[0]?.id as string,
  }
}

async function parcelas(params: Record<string, unknown> = {}): Promise<FinancialInstallmentDto[]> {
  const lista = await listFinancialInstallments({ page: 1, pageSize: 50, ...params })
  return (lista.data as { rows: FinancialInstallmentDto[] }).rows
}

/** O valor, ou uma falha que NOMEIA o que faltou — seed mudo é teste mudo. */
function exigir<T>(valor: T | undefined, oque: string): T {
  if (valor === undefined) throw new Error(`o seed não tem ${oque}`)
  return valor
}

/** Uma parcela em aberto, sem nenhuma baixa — o caso limpo. */
async function parcelaLimpa(): Promise<FinancialInstallmentDto> {
  const abertas = await parcelas({ status: 'open' })
  const alvo = abertas.find((p) => p.settledCents === 0)
  if (!alvo) throw new Error('o seed não tem parcela em aberto sem baixa')
  return alvo
}

describe('a agenda de vencimentos', () => {
  it('a LINHA é um vencimento, e ela diz sozinha o lado e a parte', async () => {
    await entrar()
    const linhas = await parcelas({ direction: 'payable' })
    expect(linhas.length).toBeGreaterThan(0)
    for (const linha of linhas) {
      // Ecoados do título porque a tela do lote não resolve id: sem eles, cada
      // linha exigiria uma segunda consulta para dizer de quem é a conta.
      expect(linha.direction).toBe('payable')
      expect(linha.titleNumber).toBeTruthy()
      expect(linha.partnerName).toBeTruthy()
    }
  })

  it('`overdue` vem do SERVIDOR — e o filtro dele recorta a lista', async () => {
    await entrar()
    const vencidas = await parcelas({ status: 'open', overdue: true })
    expect(vencidas.length).toBeGreaterThan(0)
    for (const p of vencidas) {
      expect(p.overdue).toBe(true)
      expect(p.status).toBe('open')
    }
  })

  it('`sortBy` fora da whitelist é 400 — nunca lista ordenada por outra coisa', async () => {
    await entrar()
    // `dueDate` ordena a PARCELA; `totalCents` é do título e não existe aqui.
    const resposta = await listFinancialInstallments({
      page: 1,
      pageSize: 10,
      sortBy: 'totalCents',
    })
    expect(resposta.status).toBe(400)
  })
})

describe('a baixa aponta a conta, e o destino é exclusivo', () => {
  it('sem destino nenhum é 400', async () => {
    await entrar()
    const parcela = await parcelaLimpa()
    const { paymentModeId } = await contaEModo()
    const resposta = await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents,
      paymentModeId,
    })
    expect(resposta.status).toBe(400)
  })

  it('com os DOIS destinos é 400 — exatamente um', async () => {
    await entrar()
    const parcela = await parcelaLimpa()
    const { bankAccountId, paymentModeId } = await contaEModo()
    const resposta = await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents,
      paymentModeId,
      bankAccountId,
      cashRegisterId: 'caixa-0001',
    })
    expect(resposta.status).toBe(400)
  })

  it('com um destino grava, e a baixa ECOA a conta que recebeu', async () => {
    await entrar()
    const parcela = await parcelaLimpa()
    const { bankAccountId, paymentModeId } = await contaEModo()
    const resposta = await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents,
      interestCents: 1_000,
      paymentModeId,
      bankAccountId,
    })
    expect(resposta.status).toBe(201)
    const baixa = resposta.data as { paidCents: number; bankAccountId: string | null }
    expect(baixa.bankAccountId).toBe(bankAccountId)
    // `paidCents` é o que ANDOU: juros somam ao caixa e não abatem a parcela.
    expect(baixa.paidCents).toBe(parcela.openCents + 1_000)

    const depois = await parcelas()
    expect(depois.find((p) => p.id === parcela.id)?.status).toBe('settled')
  })

  it('modo que não serve para quitação é 400', async () => {
    await entrar()
    const parcela = await parcelaLimpa()
    const { bankAccountId } = await contaEModo()
    const resposta = await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents,
      // O cheque do seed tem `usableInSettlement: false` — é a cláusula solta
      // do legado, publicada como parâmetro.
      paymentModeId: 'modo-0004',
      bankAccountId,
    })
    expect(resposta.status).toBe(400)
  })
})

describe('a menor é alçada; acima do saldo é engano', () => {
  it('a menor sem alçada é 403 com URN PRÓPRIA', async () => {
    await entrar()
    const parcela = await parcelaLimpa()
    const { bankAccountId, paymentModeId } = await contaEModo()
    const resposta = await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents - 1,
      paymentModeId,
      bankAccountId,
    })
    expect(resposta.status).toBe(403)
    // A URN é o que separa esta recusa do 403 de "seu papel não alcança o
    // módulo": aqui a tela tem o que oferecer — subir o valor até o saldo.
    expect((resposta.data as ProblemDetails).type).toBe('urn:cabinet:erro:quitacao-a-menor')
  })

  it('a menor COM alçada grava e deixa a parcela em aberto', async () => {
    await entrar('owner')
    const parcela = await parcelaLimpa()
    const { bankAccountId, paymentModeId } = await contaEModo()
    const resposta = await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents - 5_000,
      paymentModeId,
      bankAccountId,
    })
    expect(resposta.status).toBe(201)
    const depois = (await parcelas()).find((p) => p.id === parcela.id)
    expect(depois?.status).toBe('open')
    expect(depois?.openCents).toBe(5_000)
  })

  it('acima do saldo é 409 — e nem o `owner` passa', async () => {
    await entrar('owner')
    const parcela = await parcelaLimpa()
    const { bankAccountId, paymentModeId } = await contaEModo()
    const resposta = await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents + 1,
      paymentModeId,
      bankAccountId,
    })
    expect(resposta.status).toBe(409)
    expect((resposta.data as ProblemDetails).type).toBe('urn:cabinet:erro:valor-acima-do-saldo')
  })

  it('parcela já quitada recusa a segunda baixa', async () => {
    await entrar()
    const parcela = await parcelaLimpa()
    const { bankAccountId, paymentModeId } = await contaEModo()
    const corpo = {
      settledOn: '2026-08-25',
      amountCents: parcela.openCents,
      paymentModeId,
      bankAccountId,
    }
    expect((await settleInstallment(parcela.id, corpo)).status).toBe(201)
    // É a corrida entre dois operadores no mesmo vencimento — e é o caso que
    // produz pagamento em dobro quando a recusa não é nomeada.
    const segunda = await settleInstallment(parcela.id, corpo)
    expect(segunda.status).toBe(409)
    expect((segunda.data as ProblemDetails).type).toBe('urn:cabinet:erro:parcela-ja-quitada')
  })
})

describe('o lote é UM ato', () => {
  it('quita N parcelas com um `batchId`, e o item omite o valor', async () => {
    await entrar()
    const abertas = (await parcelas({ status: 'open' })).filter((p) => p.settledCents === 0)
    const alvo = abertas.slice(0, 2)
    expect(alvo).toHaveLength(2)
    const [primeira, segunda] = [exigir(alvo[0], 'duas parcelas'), exigir(alvo[1], 'duas parcelas')]
    const { bankAccountId, paymentModeId } = await contaEModo()

    const resposta = await settleBatch({
      settledOn: '2026-08-25',
      paymentModeId,
      bankAccountId,
      items: alvo.map((p) => ({ installmentId: p.id })),
    })
    expect(resposta.status).toBe(201)
    const lote = resposta.data as {
      batchId: string
      totalPaidCents: number
      settlements: { batchId: string | null }[]
    }
    expect(lote.settlements).toHaveLength(2)
    expect(lote.totalPaidCents).toBe(primeira.openCents + segunda.openCents)
    // O agrupador amarra as baixas: sem ele, conferir o que foi pago no bloco
    // exigiria casar data, valor e meio.
    for (const b of lote.settlements) expect(b.batchId).toBe(lote.batchId)
  })

  it('TUDO OU NADA: a última linha recusada não deixa a primeira gravada', async () => {
    await entrar()
    const abertas = (await parcelas({ status: 'open' })).filter((p) => p.settledCents === 0)
    const boa = exigir(abertas[0], 'uma parcela em aberto')
    const ruim = exigir(abertas[1], 'uma segunda parcela em aberto')
    const { bankAccountId, paymentModeId } = await contaEModo()

    const resposta = await settleBatch({
      settledOn: '2026-08-25',
      paymentModeId,
      bankAccountId,
      items: [
        { installmentId: boa.id },
        // Acima do saldo: recusa que não tem alçada nenhuma.
        { installmentId: ruim.id, amountCents: ruim.openCents + 1 },
      ],
    })
    expect(resposta.status).toBe(409)

    // A primeira NÃO pode ter sido gravada — se tivesse, o operador corrigiria
    // a segunda, reenviaria o bloco, e a primeira sairia de novo.
    const depois = (await parcelas()).find((p) => p.id === boa.id)
    expect(depois?.settledCents).toBe(0)
  })

  it('parcela repetida no mesmo lote é 400', async () => {
    await entrar()
    const parcela = await parcelaLimpa()
    const { bankAccountId, paymentModeId } = await contaEModo()
    const resposta = await settleBatch({
      settledOn: '2026-08-25',
      paymentModeId,
      bankAccountId,
      items: [{ installmentId: parcela.id }, { installmentId: parcela.id }],
    })
    expect(resposta.status).toBe(400)
  })
})

describe('o título', () => {
  const NOVO = {
    direction: 'payable' as const,
    partnerId: EVOLED,
    issuedAt: '2026-08-25',
    installments: [
      { sequence: 1, dueDate: '2026-09-25', amountCents: 100_000 },
      { sequence: 2, dueDate: '2026-10-25', amountCents: 100_000 },
    ],
  }

  it('nasce com número sequencial POR DIREÇÃO e total somado das parcelas', async () => {
    await entrar()
    const antes = await listFinancialTitles({ page: 1, pageSize: 50, direction: 'payable' })
    const quantos = (antes.data as { total: number }).total

    const resposta = await createFinancialTitle(NOVO)
    expect(resposta.status).toBe(201)
    const titulo = resposta.data as FinancialTitleDto
    expect(titulo.number).toBe(String(quantos + 1))
    expect(titulo.totalCents).toBe(200_000)
    expect(titulo.openCents).toBe(200_000)
    expect(titulo.status).toBe('open')
    // Título lançado pela tela é `manual` — os outros dois nascem do pedido de
    // venda e da entrada de nota.
    expect(titulo.sourceType).toBe('manual')
  })

  it('conta a pagar contra CLIENTE é 400 — o papel da parte é conferido', async () => {
    await entrar()
    const resposta = await createFinancialTitle({ ...NOVO, partnerId: HORIZONTE })
    expect(resposta.status).toBe(400)
  })

  it('parcela com buraco na sequência é 400', async () => {
    await entrar()
    const resposta = await createFinancialTitle({
      ...NOVO,
      installments: [
        { sequence: 1, dueDate: '2026-09-25', amountCents: 100_000 },
        { sequence: 3, dueDate: '2026-10-25', amountCents: 100_000 },
      ],
    })
    expect(resposta.status).toBe(400)
  })

  it('competência fora do dia 1 é 400 — o MÊS é o dado', async () => {
    await entrar()
    const resposta = await createFinancialTitle({ ...NOVO, competenceMonth: '2026-08-15' })
    expect(resposta.status).toBe(400)
  })

  it('virar a DIREÇÃO no PUT é 400 — o caminho é cancelar e lançar outro', async () => {
    await entrar()
    const criado = (await createFinancialTitle(NOVO)).data as FinancialTitleDto
    const resposta = await updateFinancialTitle(criado.id, { ...NOVO, direction: 'receivable' })
    expect(resposta.status).toBe(400)
  })

  it('título COM baixa não se reescreve nem se cancela', async () => {
    await entrar()
    const criado = (await createFinancialTitle(NOVO)).data as FinancialTitleDto
    const { bankAccountId, paymentModeId } = await contaEModo()
    const parcela = exigir(criado.installments[0], 'parcela no título criado')
    await settleInstallment(parcela.id, {
      settledOn: '2026-08-25',
      amountCents: parcela.amountCents,
      paymentModeId,
      bankAccountId,
    })

    const put = await updateFinancialTitle(criado.id, NOVO)
    expect(put.status).toBe(409)
    expect((put.data as ProblemDetails).type).toBe('urn:cabinet:erro:titulo-com-baixa')

    const cancel = await cancelFinancialTitle(criado.id)
    expect(cancel.status).toBe(409)
    expect((cancel.data as ProblemDetails).type).toBe('urn:cabinet:erro:titulo-com-baixa')
  })

  it('cancelado sai da agenda de vencimentos, e não some da listagem', async () => {
    await entrar()
    const criado = (await createFinancialTitle(NOVO)).data as FinancialTitleDto
    expect((await cancelFinancialTitle(criado.id)).status).toBe(200)

    const naAgenda = (await parcelas()).some((p) => p.titleId === criado.id)
    expect(naAgenda).toBe(false)

    const lista = await listFinancialTitles({ page: 1, pageSize: 50, status: 'cancelled' })
    const linhas = (lista.data as { rows: FinancialTitleDto[] }).rows
    expect(linhas.some((t) => t.id === criado.id)).toBe(true)
  })
})
