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
import { idDeApoio } from '@/mocks/lookups'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { handlers } from './handlers'
import { TENANT_FILIAL, TENANT_MATRIZ, resetStore, store } from './store'

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
 * 4. **O ajuste por GRUPO conserva o que não veio no corpo.** `PUT` é integral
 *    em tudo o mais, e neste campo só: ausente conserva, `[]` apaga. Sem o
 *    caso, a primeira tela antiga a salvar um nome apagaria os ajustes com 200 —
 *    o mesmo defeito que a web#315 pegou no `orcamentoSchema`, e que só aparece
 *    gravando duas vezes.
 *
 * 5. **O ENCARGO DE ATRASO tem TRÊS estados, e dois se parecem.** `null` é
 *    "ninguém configurou"; `{0, 0}` é "conferido, não cobra". Sem o caso, a
 *    tela lê os dois como zero e a pergunta em aberto desaparece.
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

  it('mais parcelas que o teto da empresa é 400 com `type` PRÓPRIO', async () => {
    await entrar()
    const oito = Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      daysAfterIssue: i * 30,
      percent: i === 0 ? 1_000_000 - 7 * 125_000 : 125_000,
      amountCents: null,
    }))
    const r = await createPaymentTerm({ ...EM_DOIS, installments: oito })

    expect(r.status).toBe(400)
    if (r.status !== 400) return
    // NÃO é `campos-invalidos`: o corpo está certo, a empresa é que não parcela
    // tanto — e a tela recorta o formulário pelo número que cabe.
    expect(r.data.type).toBe('urn:cabinet:erro:parcelas-acima-do-teto')
    expect(r.data.title).toBe('Parcelas acima do teto')
  })
})

/**
 * O AJUSTE POR GRUPO DE PRODUTO — `Forma_PagamentoGrupProd` do legado.
 *
 * **Os ids saem do CATÁLOGO, e é o que mudou.** Eles eram uuids escritos crus
 * aqui porque o kind `GRUPO_PRODUTO` não existia em `catalog-lookups` — mesma
 * saída que `compras.test.ts` tinha tomado para o mínimo por grupo do
 * fornecedor. Com o kind servido, `idDeApoio` devolve o id de verdade e a quinta
 * recusa do contrato (grupo inexistente ou inativo) ganhou caso: ela não era
 * exercitável sem catálogo, e caso que passa por falta de dado é pior que caso
 * nenhum.
 */
describe('o ajuste por GRUPO DE PRODUTO', () => {
  const PENDENTES = idDeApoio('GRUPO_PRODUTO', 'PENDENTES') as string
  const ARANDELAS = idDeApoio('GRUPO_PRODUTO', 'ARANDELAS') as string

  /** A condição de `EM_DOIS` com ajustes por grupo pendurados. */
  function comAjustes(
    ajustes: NonNullable<PaymentTermWriteRequest['groupAdjustments']>,
  ): PaymentTermWriteRequest {
    return { ...EM_DOIS, groupAdjustments: ajustes }
  }

  it('a condição grava os ajustes e a listagem os traz embutidos', async () => {
    await entrar()
    const criada = await createPaymentTerm(
      comAjustes([
        { productGroupId: PENDENTES, discountPercent: 50_000, surchargePercent: 0 },
        { productGroupId: ARANDELAS, discountPercent: 0, surchargePercent: 120_000 },
      ]),
    )
    expect(criada.status).toBe(201)

    const lista = await listPaymentTerms({ page: 1, pageSize: 100 })
    expect(lista.status).toBe(200)
    if (lista.status !== 200) return

    const condicao = lista.data.rows.find((c) => c.name === 'ENTRADA + 30')
    expect(condicao?.groupAdjustments).toHaveLength(2)
    // Desconto E acréscimo sobrevivem à ida e volta: publicar só o desconto
    // perderia o lado que dá sentido à tabela (à vista desconta, 6x acresce).
    expect(
      condicao?.groupAdjustments?.find((a) => a.productGroupId === PENDENTES)?.discountPercent,
      '5% de desconto no grupo',
    ).toBe(50_000)
    expect(
      condicao?.groupAdjustments?.find((a) => a.productGroupId === ARANDELAS)?.surchargePercent,
      '12% de acréscimo no grupo',
    ).toBe(120_000)
  })

  it('condição sem ajuste nenhum lê ARRAY VAZIO, não ausente', async () => {
    await entrar()
    await createPaymentTerm(EM_DOIS)

    const lista = await listPaymentTerms({ page: 1, pageSize: 100 })
    expect(lista.status).toBe(200)
    if (lista.status !== 200) return

    // "Esta condição não ajusta grupo nenhum" é o caso COMUM, e é `[]`. Deixar
    // `undefined` obrigaria cada tela a inventar o próprio padrão — o mesmo
    // terceiro estado que um 404 na política criaria.
    expect(lista.data.rows.find((c) => c.name === 'ENTRADA + 30')?.groupAdjustments).toEqual([])
  })

  it('o mesmo grupo duas vezes é 400 — a chave da linha é o grupo', async () => {
    await entrar()
    const r = await createPaymentTerm(
      comAjustes([
        { productGroupId: PENDENTES, discountPercent: 50_000, surchargePercent: 0 },
        { productGroupId: PENDENTES, discountPercent: 100_000, surchargePercent: 0 },
      ]),
    )

    expect(r.status).toBe(400)
    if (r.status !== 400) return
    // Aponta a SEGUNDA linha: é a que sobra, e é nela que a tela põe o foco.
    expect(r.data.fields?.some((f) => f.path === 'groupAdjustments[1].productGroupId')).toBe(true)
  })

  it('desconto acima de 100% é 400 — a linha do grupo valeria negativo', async () => {
    await entrar()
    const r = await createPaymentTerm(
      comAjustes([{ productGroupId: PENDENTES, discountPercent: 1_000_001, surchargePercent: 0 }]),
    )

    expect(r.status).toBe(400)
  })

  it('acréscimo acima de 100% PASSA — dobrar o preço é estranho e é legítimo', async () => {
    await entrar()
    // O teto é só do desconto, e a assimetria é decisão: teto no acréscimo
    // recusaria dado real do legado na importação.
    const r = await createPaymentTerm(
      comAjustes([{ productGroupId: PENDENTES, discountPercent: 0, surchargePercent: 2_000_000 }]),
    )

    expect(r.status).toBe(201)
    if (r.status !== 201) return
    expect(r.data.groupAdjustments?.[0]?.surchargePercent).toBe(2_000_000)
  })

  it('percentual negativo é 400 — o outro lado tem coluna própria', async () => {
    await entrar()
    const r = await createPaymentTerm(
      comAjustes([{ productGroupId: PENDENTES, discountPercent: -1, surchargePercent: 0 }]),
    )

    expect(r.status).toBe(400)
  })

  it('desconto E acréscimo no mesmo grupo é 400 — não há ordem de aplicação decidida', async () => {
    await entrar()
    const r = await createPaymentTerm(
      comAjustes([
        { productGroupId: PENDENTES, discountPercent: 50_000, surchargePercent: 50_000 },
      ]),
    )

    expect(r.status).toBe(400)
    if (r.status !== 400) return
    expect(r.data.fields?.some((f) => f.path === 'groupAdjustments[0]')).toBe(true)
  })

  it('PUT SEM o campo CONSERVA os ajustes; com [] apaga', async () => {
    await entrar()
    const criada = await createPaymentTerm(
      comAjustes([{ productGroupId: PENDENTES, discountPercent: 50_000, surchargePercent: 0 }]),
    )
    expect(criada.status).toBe(201)
    if (criada.status !== 201) return

    // Uma tela ANTIGA — que não conhece o campo — salvando só o nome. Se o
    // corpo integral apagasse aqui, o operador perderia a configuração com 200 e
    // nenhum erro apareceria em lugar nenhum. É o defeito que a web#315 pegou no
    // `orcamentoSchema`, e ele só se vê gravando duas vezes.
    const conservada = await updatePaymentTerm(criada.data.id, { ...EM_DOIS, name: 'OUTRO NOME' })
    expect(conservada.status).toBe(200)
    if (conservada.status !== 200) return
    expect(conservada.data.groupAdjustments).toHaveLength(1)

    // E `[]` é o pedido EXPLÍCITO de apagar, que é outra coisa que não mandar.
    const apagada = await updatePaymentTerm(criada.data.id, {
      ...EM_DOIS,
      name: 'OUTRO NOME',
      groupAdjustments: [],
    })
    expect(apagada.status).toBe(200)
    if (apagada.status !== 200) return
    expect(apagada.data.groupAdjustments).toEqual([])
  })

  // A QUINTA RECUSA, e a razão de ela nascer com dois casos: "não existe" e
  // "existe e está inativo" chegam ao mesmo 400, mas por caminhos diferentes —
  // um erra o id, o outro aponta para uma lista aposentada. Cobrir só o primeiro
  // deixaria a segunda metade viva sem ninguém medir, e é justamente ela que
  // acontece na operação de verdade.
  it('grupo que não existe é 400 no campo, e não uma condição apontando para nada', async () => {
    await entrar()
    const r = await createPaymentTerm(
      comAjustes([
        {
          productGroupId: '99999999-9999-4999-8999-999999999999',
          discountPercent: 50_000,
          surchargePercent: 0,
        },
      ]),
    )

    expect(r.status).toBe(400)
    if (r.status !== 400) return
    expect(r.data.fields?.some((f) => f.path === 'groupAdjustments[0].productGroupId')).toBe(true)
  })

  it('lookup de OUTRO kind é 400 — grupo de produto não é qualquer lista de apoio', async () => {
    await entrar()
    // O id EXISTE em `catalog-lookups`, então uma conferência que só perguntasse
    // "está no catálogo?" aceitaria: o desconto do grupo iria para uma marca, e
    // nenhuma linha de documento casaria com ele.
    const marca = idDeApoio('MARCA', 'EVOLED') as string
    const r = await createPaymentTerm(
      comAjustes([{ productGroupId: marca, discountPercent: 50_000, surchargePercent: 0 }]),
    )

    expect(r.status).toBe(400)
    if (r.status !== 400) return
    expect(r.data.fields?.some((f) => f.path === 'groupAdjustments[0].productGroupId')).toBe(true)
  })

  it('grupo DESATIVADO é 400 — o ajuste aponta para lista que o combo não oferece', async () => {
    await entrar()
    const grupo = store.lookups.find((l) => l.id === PENDENTES)
    if (!grupo) throw new Error('o catálogo perdeu o grupo de produto')
    grupo.active = false

    const r = await createPaymentTerm(
      comAjustes([{ productGroupId: PENDENTES, discountPercent: 50_000, surchargePercent: 0 }]),
    )

    expect(r.status).toBe(400)
    if (r.status !== 400) return
    expect(r.data.fields?.some((f) => f.path === 'groupAdjustments[0].productGroupId')).toBe(true)
  })
})

describe('o ENCARGO DE ATRASO da condição', () => {
  it('distingue não-configurado (null) de conferido-e-não-cobra (zeros)', async () => {
    await entrar()

    const { data } = await listPaymentTerms({ pageSize: 100, sortBy: 'name' })
    const porNome = new Map(data.rows.map((c) => [c.name, c]))

    // Os três estados do seed, e os dois do meio são os que se confundem.
    expect(porNome.get('À VISTA')?.lateCharges).toBeNull()
    expect(porNome.get('ENTRADA + 2x')?.lateCharges).toEqual({
      interestPercentMonthly: 0,
      finePercent: 0,
    })
    expect(porNome.get('30/60/90')?.lateCharges).toEqual({
      interestPercentMonthly: 10_000,
      finePercent: 20_000,
    })
  })

  it('devolve `null` EXPLÍCITO, e não campo ausente', async () => {
    await entrar()

    const { data } = await listPaymentTerms({ pageSize: 100 })
    const aVista = data.rows.find((c) => c.name === 'À VISTA')

    // `in` e não `?? null`: campo omitido leria `undefined` na tela, que é um
    // terceiro estado que ninguém declarou.
    expect(aVista !== undefined && 'lateCharges' in aVista).toBe(true)
  })

  it('grava o encargo na criação', async () => {
    await entrar()

    const { data } = await createPaymentTerm({
      ...EM_DOIS,
      lateCharges: { interestPercentMonthly: 10_000, finePercent: 20_000 },
    })

    expect(data.lateCharges).toEqual({ interestPercentMonthly: 10_000, finePercent: 20_000 })
  })

  it('OMITIR o campo conserva o encargo; `null` explícito apaga', async () => {
    await entrar()

    const criada = await createPaymentTerm({
      ...EM_DOIS,
      lateCharges: { interestPercentMonthly: 10_000, finePercent: 20_000 },
    })

    // A tela que só renomeia não manda `lateCharges` — e não pode zerar a mora
    // de quem a configurou. É o mesmo defeito que `groupAdjustments` já cobre.
    const renomeada = await updatePaymentTerm(criada.data.id, { ...EM_DOIS, name: 'OUTRO NOME' })
    expect(renomeada.data.lateCharges).toEqual({
      interestPercentMonthly: 10_000,
      finePercent: 20_000,
    })

    const apagada = await updatePaymentTerm(criada.data.id, {
      ...EM_DOIS,
      name: 'OUTRO NOME',
      lateCharges: null,
    })
    expect(apagada.data.lateCharges).toBeNull()
  })

  it('recusa o PAR PELA METADE — juros sem multa é 400, não multa zero', async () => {
    await entrar()

    const resposta = await createPaymentTerm({
      ...EM_DOIS,
      // A metade que falta é a que a aparadura silenciosa preencheria com zero.
      lateCharges: { interestPercentMonthly: 10_000 } as never,
    })

    expect(resposta.status).toBe(400)
    expect(JSON.stringify(resposta.data)).toContain('finePercent')
  })

  it('recusa percentual NEGATIVO — encargo negativo seria desconto', async () => {
    await entrar()

    const resposta = await createPaymentTerm({
      ...EM_DOIS,
      lateCharges: { interestPercentMonthly: -10_000, finePercent: 0 },
    })

    expect(resposta.status).toBe(400)
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
    // Total de R$ 120,00 em 3x daria R$ 40,00 por parcela — abaixo dos R$ 50.
    //
    // O total precisa passar dos R$ 100 do `minTotalToInstallCents`, senão a
    // recusa que dispara é a OUTRA (`valor-nao-parcelavel`) e este caso mediria
    // a regra errada. As duas valem ao mesmo tempo num documento pequeno, e a
    // ordem é que decide qual o operador vê — por isso o caso isola a segunda.
    const criado = await createQuote(orcamentoDe('cond-0002', 12_000))

    expect(criado.status).toBe(400)
    if (criado.status !== 400) return
    expect(criado.data.type).toBe('urn:cabinet:erro:parcela-abaixo-do-minimo')

    const lista = await listPaymentTerms({ page: 1, pageSize: 100 })
    expect(lista.status).toBe(200)
  })

  /**
   * A prova de que as três recusas são DISTINGUÍVEIS sem ler a frase.
   *
   * Sem isso, um refactor que trocasse as três por `campos-invalidos` passaria
   * em todos os outros casos — todos eles só olham o status — e a tela perderia
   * a única informação que diz qual correção oferecer.
   */
  it('as três recusas de parcelamento têm URNs diferentes entre si', async () => {
    await entrar()
    await updateInstallmentPolicy({
      minTotalToInstallCents: 500_000,
      minInstallmentCents: 5_000,
      maxInstallments: 2,
    })

    // teto: a condição de 3 parcelas do seed, contra um teto de 2
    const teto = await createQuote(orcamentoDe('cond-0002', 1_000_000))
    // valor: total abaixo do mínimo para parcelar, com condição de 2 parcelas
    const emDois = await createPaymentTerm(EM_DOIS)
    if (emDois.status !== 201) throw new Error('não cadastrou')
    const valor = await createQuote(orcamentoDe(emDois.data.id, 100_000))

    expect(teto.status === 400 && teto.data.type).toBe('urn:cabinet:erro:parcelas-acima-do-teto')
    expect(valor.status === 400 && valor.data.type).toBe('urn:cabinet:erro:valor-nao-parcelavel')
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
    if (parcelado.status !== 400) return
    expect(parcelado.data.type).toBe('urn:cabinet:erro:valor-nao-parcelavel')

    // A parcela ÚNICA passa no mesmo total: o limite é sobre PARCELAR, e é o
    // que torna as três URNs distinguíveis em vez de "condição inválida".
    const aVista = await createQuote(orcamentoDe('cond-0001'))
    expect(aVista.status).toBe(201)
  })
})
