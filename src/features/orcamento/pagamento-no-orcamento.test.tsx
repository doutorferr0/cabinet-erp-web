import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O BLOCO PAGAMENTO NA TELA DO DOCUMENTO (S4/fase C).
 *
 * A fronteira de dados existe desde a web#307: `paraOrcamento` desce
 * `condicaoPagamentoId`, `condicaoPagamento`, `parcelas` e
 * `politicaDeParcelamento`, e `paraEscrita` sobe `paymentTermId`. **Nenhuma tela
 * mostrava nada disso** — e a ausência não era neutra.
 *
 * ## O defeito que esta bateria mede primeiro, e que motivou a PR
 *
 * `orcamentoSchema` é um `z.object`, e o Zod **remove o que não declara**. Os
 * quatro campos do bloco não estavam declarados, então o que chegava ao
 * `onGravar` era um orçamento sem condição de pagamento nenhuma — e o `PUT` do
 * contrato é INTEGRAL. Abrir um documento com plano e clicar em `Gravar` sem
 * editar nada mandava `paymentTermId: undefined` e **apagava o plano do
 * documento, com 200**.
 *
 * É exatamente a classe de defeito que o comentário de `clienteId` descreve no
 * próprio `orcamento-form.tsx` ("os ids precisam estar declarados, mesmo sem
 * campo na tela") e que o `TODO(contract)` de `workId` deixou anotado em
 * `paraEscrita`. O primeiro caso daqui é a medição dele: rodado contra a `main`
 * antes da correção, ele falha com `undefined`.
 *
 * ## O que a tela previne, e o que ela NÃO previne
 *
 * Das três regras de parcelamento, duas dependem só do que a tela já tem em
 * mãos (a política e o total do documento) e viram opção DESABILITADA no combo,
 * com o motivo escrito ao lado:
 *
 *   `parcelas-acima-do-teto`  → a condição tem mais parcelas que a empresa aceita
 *   `valor-nao-parcelavel`    → o total não alcança o mínimo para parcelar
 *
 * A terceira (`parcela-abaixo-do-minimo`) **não se previne filtrando o combo** —
 * é o que a web#309 escreveu ao justificar as três URNs: ela depende do total e
 * do número de parcelas AO MESMO TEMPO, então a mesma condição serve num
 * documento e não serve no outro. Essa chega como recusa do servidor, e a tela
 * mostra a frase dele. Antecipá-la aqui obrigaria o front a repetir a regra de
 * arredondamento do servidor — duas verdades sobre o mesmo centavo.
 *
 * ## Por que o plano não é pré-visualizado
 *
 * `paymentInstallments` é CARIMBO da gravação, não derivado da leitura. Calcular
 * as datas e os centavos aqui para mostrar antes de gravar seria a segunda
 * implementação da distribuição da sobra — e a que o operador veria, enquanto a
 * que vale é a outra.
 */

const ID = '7c5b2a10-8f3e-4d21-9c6b-2f1a4e8d0b33'
const CONDICAO_30_60_90 = 'a1f0c3d2-5e64-4b71-9a80-6c2d5e8f1b44'
const CONDICAO_A_VISTA = 'b2e1d4c3-6f75-4c82-8b91-7d3e6f9a2c55'
const CONDICAO_10X = 'c3d2e5f4-7a86-4d93-9ca2-8e4f7a0b3d66'

const DETALHE = {
  id: ID,
  number: '10231',
  series: '1',
  folderNumber: 'P-88',
  issuedAt: '2026-08-10',
  expiresAt: '2026-08-15',
  closedAt: null,
  customerId: '3f2a91cc-1d44-4a90-9f77-5b0e2c8a7d11',
  customerName: 'STELLA ILUMINAÇÃO LTDA',
  projectName: 'Residência Alphaville',
  salespersonId: null,
  salespersonName: null,
  professionalId: null,
  professionalName: null,
  status: 'open',
  totalCents: 250000,
  discountMode: 'product',
  discountPercent: 0,
  environments: [{ code: 'F5', name: 'F5', order: 1 }],
  items: [
    {
      lineNumber: 1,
      environmentCode: 'F5',
      variantId: null,
      description: 'PENDENTE REDONDO',
      finish: 'Preto',
      size: 'G',
      quantity: 2,
      unit: 'PC',
      unitPriceCents: 125000,
      discountPercent: 0,
      supplierId: null,
      supplierName: 'VERTZ',
      supplierCode: 'V-771',
      supplierDescription: 'PENDENTE REDONDO',
      productGroup: null,
      pieceType: null,
    },
  ],
  // O bloco de pagamento como o servidor o devolve: id, nome resolvido, plano
  // carimbado e a política que valia na gravação.
  paymentTermId: CONDICAO_30_60_90,
  paymentTermName: '30/60/90',
  paymentInstallments: [
    { number: 1, dueDate: '2026-09-09', amountCents: 83334 },
    { number: 2, dueDate: '2026-10-09', amountCents: 83333 },
    { number: 3, dueDate: '2026-11-08', amountCents: 83333 },
  ],
  installmentPolicy: {
    minTotalToInstallCents: 10000,
    minInstallmentCents: 5000,
    maxInstallments: 6,
  },
}

const CONDICOES = [
  {
    id: CONDICAO_A_VISTA,
    name: 'À vista',
    active: true,
    installmentCount: 1,
    // Sem encargo CONFIGURADO — o estado que se confunde com "não cobra".
    lateCharges: null,
    installments: [{ number: 1, daysAfterIssue: 0, percent: 1000000, amountCents: null }],
  },
  {
    id: CONDICAO_30_60_90,
    name: '30/60/90',
    active: true,
    installmentCount: 3,
    // 1% ao mês de mora e 2% de multa — escala de 4 casas (`10000` = 1%).
    lateCharges: { interestPercentMonthly: 10000, finePercent: 20000 },
    installments: [
      { number: 1, daysAfterIssue: 30, percent: 333334, amountCents: null },
      { number: 2, daysAfterIssue: 60, percent: 333333, amountCents: null },
      { number: 3, daysAfterIssue: 90, percent: 333333, amountCents: null },
    ],
  },
  {
    id: CONDICAO_10X,
    name: '10 vezes',
    active: true,
    installmentCount: 10,
    // Conferido e NÃO cobra — o outro lado do par que a tela precisa separar.
    lateCharges: { interestPercentMonthly: 0, finePercent: 0 },
    installments: Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      daysAfterIssue: 30 * (i + 1),
      percent: 100000,
      amountCents: null,
    })),
  },
]

const POLITICA = { minTotalToInstallCents: 10000, minInstallmentCents: 5000, maxInstallments: 6 }

interface Escrita {
  url: string
  metodo: string
  corpo: Record<string, unknown> | null
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Servidor falso, e não mock de módulo — mesma decisão de
 * `orcamento-grava.test.ts`: verbo e corpo só existem no `Request`, e um stub
 * que casasse por caminho deixaria o `PUT` cair na resposta do `GET`.
 *
 * As duas rotas do bloco entram aqui: `/api/payment-terms` (o combo) e
 * `/api/installment-policy` (os limites). Sem elas o dublê rejeita a URL sem
 * stub, e o erro fala de `fetch`, não de pagamento.
 */
function servidor({
  escritas = [],
  detalhe = DETALHE,
  condicoes = CONDICOES,
  politica = POLITICA,
  respostaDeEscrita,
}: {
  escritas?: Escrita[]
  detalhe?: Record<string, unknown>
  condicoes?: unknown[]
  politica?: unknown
  respostaDeEscrita?: () => Response
} = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/installment-policy')) return json(politica)
    if (url.includes('/api/payment-terms')) {
      return json({ rows: condicoes, total: condicoes.length })
    }

    if (url.includes('/api/quotes')) {
      if (metodo !== 'GET') {
        const cru = await req?.text()
        escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : null })
        return respostaDeEscrita ? respostaDeEscrita() : json(detalhe)
      }
      if (url.includes(ID)) return json(detalhe)
      return json({ rows: [], total: 0 })
    }
    return undefined
  }
}

/** O bloco já carregado — o combo é o sinal de que a seção montou. */
async function abrirDocumento(fetchStub: unknown) {
  const r = renderRoute(`/vendas/orcamentos/${ID}`, fetchStub as never)
  await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-88'))
  return r
}

describe('o Gravar não pode apagar o plano de pagamento', () => {
  it('devolve o `paymentTermId` do documento aberto, sem edição nenhuma', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    // A medição da PR: contra a `main` de antes, isto era `undefined` — o Zod
    // removia o campo que o schema não declarava, e o `PUT` integral apagava a
    // condição de pagamento de um documento que ninguém editou.
    expect(escritas[0]?.corpo?.paymentTermId).toBe(CONDICAO_30_60_90)
  })

  it('o plano e o nome NÃO sobem — eles são carimbo do servidor', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    const corpo = escritas[0]?.corpo as Record<string, unknown>
    // `QuoteWriteRequest` só tem `paymentTermId`. Mandar o resto seria propor um
    // plano que o servidor apagaria em silêncio — e o operador veria o plano
    // dele virar outro sem aviso.
    expect(corpo.paymentTermName).toBeUndefined()
    expect(corpo.paymentInstallments).toBeUndefined()
    expect(corpo.installmentPolicy).toBeUndefined()
  })
})

describe('o bloco mostra o plano CARIMBADO', () => {
  it('lista as parcelas do documento — número, vencimento e valor', async () => {
    await abrirDocumento(servidor())

    const plano = await screen.findByRole('table', { name: /Parcelas do documento/i })
    // O corpo, e não a tabela inteira: `getAllByRole('row')` traria o cabeçalho
    // e a linha da SOMA junto, e a contagem passaria a medir a moldura.
    const corpo = within(plano).getAllByRole('rowgroup')[1] as HTMLElement
    const linhas = within(corpo).getAllByRole('row')
    expect(linhas.length).toBe(3)
    expect(within(linhas[0] as HTMLElement).getByText('09/09/2026')).toBeInTheDocument()
    expect(within(linhas[0] as HTMLElement).getByText(/833,34/)).toBeInTheDocument()
    // A sobra do arredondamento fica na ÚLTIMA no servidor; a tela só a exibe.
    expect(within(linhas[2] as HTMLElement).getByText(/833,33/)).toBeInTheDocument()
  })

  it('a soma das parcelas é conferível contra o total do documento', async () => {
    await abrirDocumento(servidor())

    // O impresso é conferido a olho: sem a soma ao pé, quem confere precisa
    // somar três números de cabeça para saber se o plano fecha.
    const soma = await screen.findByLabelText(/Soma das parcelas/i)
    expect(soma).toHaveTextContent('2.500,00')
  })

  it('documento sem condição diz que não há plano, e não finge uma linha', async () => {
    await abrirDocumento(
      servidor({
        detalhe: {
          ...DETALHE,
          paymentTermId: null,
          paymentTermName: null,
          paymentInstallments: [],
          installmentPolicy: undefined,
        },
      }),
    )

    expect(await screen.findByText(/sem condição de pagamento/i)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /Parcelas do documento/i })).not.toBeInTheDocument()
  })
})

describe('o combo oferece só o que cabe NESTE documento', () => {
  it('desabilita a condição acima do teto de parcelas da empresa', async () => {
    await abrirDocumento(servidor())

    const combo = await screen.findByLabelText(/Condição de pagamento/i)
    const acimaDoTeto = within(combo).getByRole('option', { name: /10 vezes/i })
    // 10 parcelas contra o teto de 6: o servidor responderia
    // `urn:cabinet:erro:parcelas-acima-do-teto`. Oferecer e depois recusar faz o
    // operador descobrir o limite errando.
    expect(acimaDoTeto).toBeDisabled()
    expect(acimaDoTeto).toHaveTextContent(/máx\. 6/i)
  })

  it('abaixo do mínimo para parcelar, só sobra a condição de parcela única', async () => {
    await abrirDocumento(
      // R$ 80,00, e o total vem dos ITENS — é o que a tela mostra e o que ela
      // recalcula enquanto o operador digita. Ler o `totalCents` do documento
      // aberto deixaria o combo julgando um total que a grade já mudou.
      servidor({
        detalhe: {
          ...DETALHE,
          totalCents: 8000,
          items: [{ ...DETALHE.items[0], quantity: 1, unitPriceCents: 8000 }],
        },
      }),
    )

    const combo = await screen.findByLabelText(/Condição de pagamento/i)
    expect(within(combo).getByRole('option', { name: /À vista/i })).toBeEnabled()
    expect(within(combo).getByRole('option', { name: /30\/60\/90/i })).toBeDisabled()
  })

  it('condição INATIVA não é oferecida a quem ainda não a usa', async () => {
    await abrirDocumento(
      servidor({
        // O documento aponta para a condição À VISTA; a 30/60/90 foi aposentada.
        detalhe: { ...DETALHE, paymentTermId: CONDICAO_A_VISTA, paymentTermName: 'À vista' },
        condicoes: [CONDICOES[0], { ...CONDICOES[1], active: false }],
      }),
    )

    const combo = await screen.findByLabelText(/Condição de pagamento/i)
    expect(within(combo).queryByRole('option', { name: /30\/60\/90/i })).not.toBeInTheDocument()
  })

  it('mas a condição DO DOCUMENTO continua na lista mesmo aposentada', async () => {
    const escritas: Escrita[] = []
    // O documento usa a 30/60/90, que hoje está inativa: ela não vem na
    // listagem. Sem a opção do valor corrente o campo apareceria em branco — e
    // o próximo `Gravar` mandaria `null`, apagando o plano de um documento que
    // ninguém editou. É o mesmo defeito que esta PR conserta no schema, entrando
    // pela outra porta.
    const { user } = await abrirDocumento(
      servidor({ escritas, condicoes: [CONDICOES[0], { ...CONDICOES[1], active: false }] }),
    )

    const combo = await screen.findByLabelText(/Condição de pagamento/i)
    const doDocumento = within(combo).getByRole('option', { name: /30\/60\/90/i })
    expect(doDocumento).toBeEnabled()
    expect(doDocumento).toHaveTextContent(/inativa/i)

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.corpo?.paymentTermId).toBe(CONDICAO_30_60_90)
  })
})

describe('a recusa que a tela NÃO previne chega do servidor', () => {
  it('mostra a frase de `parcela-abaixo-do-minimo` e não navega', async () => {
    const problema = () =>
      new Response(
        JSON.stringify({
          type: 'urn:cabinet:erro:parcela-abaixo-do-minimo',
          title: 'Parcela abaixo do mínimo',
          status: 400,
          detail: 'Alguma parcela ficaria abaixo do valor mínimo da empresa.',
        }),
        { status: 400, headers: { 'content-type': 'application/problem+json' } },
      )

    const { user, router } = await abrirDocumento(servidor({ respostaDeEscrita: problema }))
    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))

    expect(
      await screen.findByText(/Alguma parcela ficaria abaixo do valor mínimo da empresa\./i),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toContain(ID)
  })
})

describe('o ENCARGO DE ATRASO aparece, e separa os três estados', () => {
  it('mostra mora e multa da condição escolhida', async () => {
    await abrirDocumento(servidor())

    const linha = await screen.findByLabelText('Encargo de atraso')
    expect(linha).toHaveTextContent(/1,0000 % ao mês de mora/)
    expect(linha).toHaveTextContent(/2,0000 % de multa/)
  })

  it('diz que o número é o VIGENTE, porque o documento não o carimba', async () => {
    await abrirDocumento(servidor())

    // O plano e os limites são carimbo; o encargo não é. A tela não pode
    // deixar o operador ler um número de documento onde há um número de hoje.
    const linha = await screen.findByLabelText('Encargo de atraso')
    expect(linha).toHaveTextContent(/vigente hoje na condição/)
  })

  it('condição sem encargo CONFIGURADO diz isso — e não "0%"', async () => {
    await abrirDocumento(
      servidor({
        detalhe: { ...DETALHE, paymentTermId: CONDICAO_A_VISTA, paymentTermName: 'À vista' },
      }),
    )

    const linha = await screen.findByLabelText('Encargo de atraso')
    expect(linha).toHaveTextContent(/não configurado/i)
    expect(linha).not.toHaveTextContent(/mora/)
  })

  it('condição com os dois em ZERO diz que não cobra — a outra metade do par', async () => {
    await abrirDocumento(
      servidor({
        detalhe: { ...DETALHE, paymentTermId: CONDICAO_10X, paymentTermName: '10 vezes' },
      }),
    )

    const linha = await screen.findByLabelText('Encargo de atraso')
    expect(linha).toHaveTextContent(/Sem encargo de atraso/)
    expect(linha).not.toHaveTextContent(/não configurado/i)
  })

  it('documento SEM condição não afirma encargo nenhum', async () => {
    await abrirDocumento(servidor({ detalhe: { ...DETALHE, paymentTermId: null } }))

    await screen.findByText(/Documento sem condição de pagamento/i)
    expect(screen.queryByLabelText('Encargo de atraso')).toBeNull()
  })
})

describe('a política vigente é a do CARIMBO, não a de hoje', () => {
  it('mostra os limites que valiam na gravação do documento', async () => {
    await abrirDocumento(
      // A política de HOJE mudou (12×); o documento foi gravado sob 6×.
      servidor({ politica: { ...POLITICA, maxInstallments: 12 } }),
    )

    const limites = await screen.findByLabelText(/Limites de parcelamento/i)
    // Se a tela lesse a política corrente, o documento reimpresso sairia
    // diferente de si mesmo — é a razão de o carimbo existir.
    expect(limites).toHaveTextContent(/6×/)
    expect(limites).toHaveTextContent(/na gravação/i)
  })

  it('documento sem carimbo cai na política corrente, e diz que é a de hoje', async () => {
    await abrirDocumento(
      servidor({
        detalhe: { ...DETALHE, installmentPolicy: undefined },
        politica: { ...POLITICA, maxInstallments: 12 },
      }),
    )

    const limites = await screen.findByLabelText(/Limites de parcelamento/i)
    expect(limites).toHaveTextContent(/12×/)
    expect(limites).toHaveTextContent(/hoje/i)
  })
})
