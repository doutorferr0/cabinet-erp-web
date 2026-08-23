import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A TELA DO PEDIDO DE VENDA — `/api/orders`.
 *
 * O caminho está no contrato com dez operações, o backend serve seis, e até
 * aqui NENHUM arquivo fora de `src/api/gerado/` o mencionava: o menu apontava
 * para `/vendas/pedidos` com `futuro: true` — "Ainda não existe".
 *
 * ## O que esta bateria mede primeiro
 *
 * O `PUT` do contrato é INTEGRAL, e o pedido carrega TRÊS coisas que a tela não
 * edita: `serviceItems`, `groupDiscounts` e `workId`. Zod remove o que não
 * declara, e o que chega ao `onGravar` é o resultado do parse — sem a linha no
 * schema, abrir um pedido e clicar em `Gravar` sem editar nada apaga os três,
 * com 200 e sem aviso nenhum.
 *
 * Não é hipótese: é o defeito que a web#315 mediu no bloco de pagamento do
 * orçamento, e ele reaparece aqui multiplicado por três. `groupDiscounts` é o
 * caso caro — no legado são ~8 grupos por documento (`VendaDesconto` tem
 * 300.337 linhas para 37.707 vendas), e perdê-los muda o VALOR do pedido sem
 * erro em lugar nenhum.
 *
 * Rodado contra um schema que não declare os campos, o primeiro caso falha com
 * `undefined` — que é como a falha apareceria em produção.
 */

const ID = '5a1c8e70-3b2d-4f61-8e93-1c7d4a9f0e22'
const OBRA = 'd4e5f6a7-8b9c-4d01-a2e3-f4b5c6d7e8f9'
const GRUPO_PENDENTES = '11a2b3c4-5d6e-4f70-8192-a3b4c5d6e7f8'
const CONDICAO = 'a1f0c3d2-5e64-4b71-9a80-6c2d5e8f1b44'

const DETALHE = {
  id: ID,
  number: '30991',
  series: '1',
  folderNumber: 'P-104',
  issuedAt: '2026-08-12',
  closedAt: null,
  customerId: '3f2a91cc-1d44-4a90-9f77-5b0e2c8a7d11',
  customerName: 'STELLA ILUMINAÇÃO LTDA',
  projectName: 'Residência Alphaville',
  // O elo com a obra: a tela não tem o campo, e o `PUT` não pode perdê-lo.
  workId: OBRA,
  workName: 'Alphaville — Casa 12',
  status: 'active',
  type: 'sale',
  demoDueDate: null,
  demoReturnedAt: null,
  salespersonId: null,
  salespersonName: null,
  professionalId: null,
  professionalName: null,
  totalCents: 250000,
  // Convertido de um orçamento — a tela diz de qual, sem segunda consulta.
  quoteId: '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f',
  quoteNumber: '10231',
  discountMode: 'product',
  discountPercent: 0,
  groupDiscounts: [],
  environments: [{ code: 'F5', name: 'Sala', order: 1 }],
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
  // Serviços: têm DTO no contrato e a tela não os edita — a aba não foi
  // capturada. Precisam voltar no `PUT` como estavam.
  serviceItems: [
    {
      lineNumber: 1,
      environmentCode: 'F5',
      serviceId: null,
      description: 'INSTALAÇÃO ELÉTRICA',
      quantity: 1,
      unitPriceCents: 40000,
      discountPercent: 0,
      electricianPercent: 300000,
      // Os dois abaixo são conta do SERVIDOR e não entram na escrita.
      electricianAmountCents: 12000,
      totalCents: 40000,
    },
  ],
  paymentTermId: CONDICAO,
  paymentTermName: '30/60/90',
  paymentInstallments: [
    { number: 1, dueDate: '2026-09-11', amountCents: 83334 },
    { number: 2, dueDate: '2026-10-11', amountCents: 83333 },
    { number: 3, dueDate: '2026-11-10', amountCents: 83333 },
  ],
  installmentPolicy: {
    minTotalToInstallCents: 10000,
    minInstallmentCents: 5000,
    maxInstallments: 6,
  },
}

const CONDICOES = [
  {
    id: CONDICAO,
    name: '30/60/90',
    active: true,
    installmentCount: 3,
    installments: [
      { number: 1, daysAfterIssue: 30, percent: 333334, amountCents: null },
      { number: 2, daysAfterIssue: 60, percent: 333333, amountCents: null },
      { number: 3, daysAfterIssue: 90, percent: 333333, amountCents: null },
    ],
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
 * Servidor falso, e não mock de módulo: verbo e corpo só existem no `Request`,
 * e um stub que casasse por caminho deixaria o `PUT` cair na resposta do `GET`.
 */
function servidor({
  escritas = [],
  detalhe = DETALHE,
  linhas,
}: {
  escritas?: Escrita[]
  detalhe?: Record<string, unknown>
  linhas?: unknown[]
} = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/installment-policy')) return json(POLITICA)
    if (url.includes('/api/payment-terms')) {
      return json({ rows: CONDICOES, total: CONDICOES.length })
    }
    if (url.includes('/api/partners')) return json({ rows: [], total: 0 })

    if (url.includes('/api/orders')) {
      if (metodo !== 'GET') {
        const cru = await req?.text()
        escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : null })
        return json(detalhe)
      }
      if (url.includes(ID)) return json(detalhe)
      const rows = linhas ?? [detalhe]
      return json({ rows, total: rows.length })
    }
    return undefined
  }
}

/** A folha carregada — o Nº Pasta preenchido é o sinal de que o documento montou. */
async function abrirDocumento(fetchStub: unknown) {
  const r = renderRoute(`/vendas/pedidos/${ID}`, fetchStub as never)
  await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-104'))
  return r
}

describe('o Gravar não pode apagar o que a tela não edita', () => {
  it('devolve serviços, obra e condição de pagamento sem edição nenhuma', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    const corpo = escritas[0]?.corpo as Record<string, unknown>
    // Os três atravessam o formulário sem campo nenhum. Sem a linha no schema,
    // o Zod os remove e o `PUT` integral os apaga com 200.
    expect(corpo.workId).toBe(OBRA)
    expect(corpo.paymentTermId).toBe(CONDICAO)
    expect(Array.isArray(corpo.serviceItems)).toBe(true)
    expect((corpo.serviceItems as unknown[]).length).toBe(1)
  })

  it('o serviço sobe sem os campos que são CONTA do servidor', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    const servico = (escritas[0]?.corpo?.serviceItems as Record<string, unknown>[])[0]
    expect(servico?.description).toBe('INSTALAÇÃO ELÉTRICA')
    expect(servico?.electricianPercent).toBe(300000)
    // `OrderServiceItemWriteRequest` não os aceita: reenviá-los deixaria o
    // cliente propor um total próprio, e o Fastify os apagaria em silêncio.
    expect(servico?.totalCents).toBeUndefined()
    expect(servico?.electricianAmountCents).toBeUndefined()
  })

  it('o desconto por GRUPO volta inteiro, e o modo não é rebaixado', async () => {
    const escritas: Escrita[] = []
    const comGrupo = {
      ...DETALHE,
      discountMode: 'group',
      discountPercent: 0,
      groupDiscounts: [
        {
          productGroupId: GRUPO_PENDENTES,
          productGroupName: 'PENDENTES',
          discountPercent: 100000,
          subtotalCents: 250000,
          discountCents: 25000,
          totalCents: 225000,
          quantity: 2,
        },
      ],
    }
    const { user } = await abrirDocumento(servidor({ escritas, detalhe: comGrupo }))

    // A tela DIZ que não sabe editar esse modo, em vez de fingir que sabe.
    expect(await screen.findByText(/desconto por grupo de produto/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    const corpo = escritas[0]?.corpo as Record<string, unknown>
    // Rebaixar para `product` em silêncio zeraria ~8 grupos por documento — o
    // valor do pedido mudaria sem erro em lugar nenhum.
    expect(corpo.discountMode).toBe('group')
    const grupos = corpo.groupDiscounts as Record<string, unknown>[]
    expect(grupos.length).toBe(1)
    expect(grupos[0]?.productGroupId).toBe(GRUPO_PENDENTES)
    expect(grupos[0]?.discountPercent).toBe(100000)
  })
})

describe('o pedido é o documento que o orçamento não é', () => {
  it('diz de qual orçamento veio, sem uma segunda consulta', async () => {
    await abrirDocumento(servidor())
    // `quoteNumber` é resolvido pelo servidor exatamente para isto.
    expect(await screen.findByText(/10231/)).toBeInTheDocument()
  })

  it('em VENDA o prazo de demonstração não aparece e viaja como null', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    expect(screen.queryByLabelText(/Retornar até/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))
    // Prazo pendurado num pedido de venda é prazo que nunca vence, porque nada
    // o consulta — o contrato manda `null`.
    expect(escritas[0]?.corpo?.demoDueDate).toBeNull()
    expect(escritas[0]?.corpo?.type).toBe('sale')
  })

  it('em DEMONSTRAÇÃO o prazo aparece e sobe', async () => {
    const escritas: Escrita[] = []
    const demo = { ...DETALHE, type: 'demo', demoDueDate: '2026-09-30', demoReturnedAt: null }
    const { user } = await abrirDocumento(servidor({ escritas, detalhe: demo }))

    expect(await screen.findByLabelText(/Retornar até/i)).toHaveValue('2026-09-30')
    expect(screen.getByText(/Peça ainda fora/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.corpo?.type).toBe('demo')
    expect(escritas[0]?.corpo?.demoDueDate).toBe('2026-09-30')
  })

  it('não tem Data Validade — proposta vence, pedido não', async () => {
    await abrirDocumento(servidor())
    // O campo some em vez de aparecer vazio: coluna que o DTO não tem sai da
    // tela, senão lê-se como cadastro incompleto.
    expect(screen.queryByLabelText(/Data Validade/i)).not.toBeInTheDocument()
  })
})

describe('documento fechado não se edita, e a tela avisa antes da recusa', () => {
  it('pedido concluído abre sem Gravar, dizendo por quê', async () => {
    await abrirDocumento(servidor({ detalhe: { ...DETALHE, status: 'concluded' } }))

    expect(await screen.findByText(/Pedido concluído/i)).toBeInTheDocument()
    // O contrato responde 409 a `PUT` em documento fechado. Deixar o operador
    // preencher a folha para o servidor negar no fim é fazê-lo perder o
    // trabalho para descobrir uma regra que a tela já sabia.
    expect(screen.queryByRole('button', { name: /^Gravar$/i })).not.toBeInTheDocument()
  })

  it('pedido cancelado idem, e as duas situações são terminais', async () => {
    await abrirDocumento(servidor({ detalhe: { ...DETALHE, status: 'cancelled' } }))

    expect(await screen.findByText(/Pedido cancelado/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Gravar$/i })).not.toBeInTheDocument()
  })
})

describe('a listagem lê o que o servidor manda', () => {
  it('mostra situação e tipo em português, e o total em reais', async () => {
    renderRoute('/vendas/pedidos', servidor() as never)

    expect(await screen.findByText('30991')).toBeInTheDocument()
    expect(screen.getByText('STELLA ILUMINAÇÃO LTDA')).toBeInTheDocument()
    // O que viaja é `active`/`sale`; o que o operador lê é outra coisa.
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
    expect(screen.getByText('Venda')).toBeInTheDocument()
    expect(screen.getByText(/2\.500,00/)).toBeInTheDocument()
  })

  it('a demonstração se distingue da venda de relance', async () => {
    const demo = { ...DETALHE, id: ID, type: 'demo', number: '30992' }
    renderRoute('/vendas/pedidos', servidor({ linhas: [demo] }) as never)

    expect(await screen.findByText('Demonstração')).toBeInTheDocument()
  })
})
