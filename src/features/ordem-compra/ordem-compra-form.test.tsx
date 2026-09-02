import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * ORDEM DE COMPRA NA TELA — os três gestos que não são o `Gravar`.
 *
 * `Enviar`, `Reagendar` e `Cancelar` têm caminho próprio no contrato, e o que
 * esta bateria trava é justamente o que um `PUT` com o campo trocado faria
 * passar despercebido:
 *
 * 1. **Reagendar guarda as DUAS datas.** A promessa original fica onde está —
 *    sobrescrevê-la faria o fornecedor que atrasou terminar com uma data
 *    cumprida, e o atraso sumiria no ato de ser registrado.
 * 2. **Ordem enviada SEM data prometida não reagenda.** É o CHECK da `0038`
 *    (`ck_purchase_orders_reagenda_o_prometido`) e um beco do desenho: a tela
 *    desabilita o gesto com o motivo, em vez de deixar o operador descobrir
 *    pelo 409.
 * 3. **O faturamento mínimo avisa ANTES de gravar, e não conta o acréscimo.**
 *    Frete não é mercadoria: somá-lo liberaria na tela uma ordem que o servidor
 *    recusa com `faturamento-minimo-nao-atingido`.
 * 4. **A linha sabe de qual PEDIDO veio.** `sourceRequestId` +
 *    `sourceLineNumber` viajam na escrita; sem eles o servidor não marca a
 *    linha do pedido como atendida, e a amarração se desfaz com 200.
 */

const ORDEM_ID = 'oc-0002'
const FORNECEDOR = 'parc-0006'
const PEDIDO_ORIGEM = 'pc-0001'

interface Escrita {
  url: string
  metodo: string
  corpo: Record<string, unknown> | undefined
  cru: string
}

const ORDEM = {
  id: ORDEM_ID,
  number: 'OC-5102',
  status: 'sent',
  supplierId: FORNECEDOR,
  supplierName: 'FILLAMENTO',
  buyingTenantId: '00000000-0000-0000-0000-000000000003',
  buyingTenantName: 'MATRIZ',
  orderedAt: '2026-08-12',
  sentAt: '2026-08-12',
  // As DUAS datas: prometida e reprometida.
  expectedAt: '2026-09-03',
  rescheduledAt: '2026-10-02',
  rescheduleReason: 'FORNECEDOR EM FÉRIAS COLETIVAS',
  minimumBillingCents: 500000,
  carrierId: null,
  carrierName: null,
  paymentTermId: null,
  paymentTermName: null,
  discountPercent: 50000,
  surchargeCents: 18000,
  subtotalCents: 290000,
  totalCents: 293500,
  notes: null,
  items: [
    {
      lineNumber: 1,
      sourceRequestId: PEDIDO_ORIGEM,
      sourceRequestNumber: 'PC-7761',
      sourceLineNumber: 2,
      variantId: 'var-0003',
      description: 'ARANDELA ALUMÍNIO IP65',
      finish: 'BRANCO',
      size: 'ÚNICO',
      unit: 'UN',
      quantity: 10,
      unitCostCents: 29000,
      totalCents: 290000,
      destination: 'stock',
      productGroupId: null,
      productGroupName: null,
    },
  ],
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function servidor({
  escritas = [],
  ordem = ORDEM,
}: { escritas?: Escrita[]; ordem?: Record<string, unknown> } = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/payment-terms')) return json({ rows: [], total: 0 })
    if (url.includes('/api/partners')) return json({ rows: [], total: 0 })
    if (url.includes('/api/purchase-requests')) return json({ rows: [], total: 0 })

    if (url.includes('/api/purchase-orders')) {
      if (metodo !== 'GET') {
        const cru = (await req?.text()) ?? ''
        escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : undefined, cru })
        return json(ordem)
      }
      if (url.includes(ORDEM_ID)) return json(ordem)
      return json({ rows: [ordem], total: 1 })
    }

    return undefined
  }
}

async function abrirOrdem(stub: unknown) {
  const r = renderRoute(`/compras/ordens/${ORDEM_ID}`, stub as never)
  await waitFor(() => expect(screen.getByLabelText('Número da ordem')).toHaveTextContent('OC-5102'))
  return r
}

describe('ordem de compra na tela', () => {
  it('mostra a data REPROMETIDA junto do motivo, sem perder a original', async () => {
    await abrirOrdem(servidor())

    // As duas na tela: é a comparação entre elas que mede o fornecedor.
    //
    // Reface 2.0 (D18): a reprometida deixou de ser um campo de leitura na
    // Identificação e virou a ETAPA da timeline, que é onde ela responde a
    // pergunta certa — não "qual é a data", mas "onde este documento parou".
    // O motivo viaja junto com ela; sem isso a data nova aparece como se
    // sempre tivesse sido aquela.
    const chegada = screen.getByText('Chegada reprometida').closest('li')
    expect(chegada).toHaveTextContent('02/10/2026')
    expect(chegada).toHaveTextContent('FORNECEDOR EM FÉRIAS COLETIVAS')
    // A promessa ORIGINAL continua no campo do documento, editável.
    expect(screen.getByLabelText('Data Prevista')).toHaveValue('2026-09-03')
  })

  /*
   * Teto PRÓPRIO de 30s, e o motivo é medido: este caso monta a tela inteira,
   * abre um diálogo de busca e ainda navega. Isolado ele fecha em ~4s; com os
   * dois arquivos de compra no mesmo processo, passa dos 15s do
   * `vitest.config.ts` — e a falha sai como `Test timed out`, sem asserção
   * nenhuma quebrada, que é o disfarce mais caro de depurar.
   */
  it('reagendar manda expectedAt e reason pelo caminho PRÓPRIO', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirOrdem(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /Reagendar/i }))
    await user.type(await screen.findByLabelText('Nova data prevista'), '2026-11-10')
    await user.type(screen.getByLabelText('Motivo'), 'ATRASO NA IMPORTAÇÃO')
    await user.click(screen.getByRole('button', { name: /^Reagendar$/ }))

    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.metodo).toBe('POST')
    expect(escritas[0]?.url).toContain(`/api/purchase-orders/${ORDEM_ID}/reschedule`)
    expect(escritas[0]?.corpo).toEqual({
      expectedAt: '2026-11-10',
      reason: 'ATRASO NA IMPORTAÇÃO',
    })
  }, 30_000)

  it('ordem enviada SEM data prometida não oferece o reagendamento', async () => {
    await abrirOrdem(
      servidor({
        ordem: { ...ORDEM, expectedAt: null, rescheduledAt: null, rescheduleReason: null },
      }),
    )

    // O CHECK da `0038` exige promessa original. O gesto aparece desabilitado,
    // com o motivo — escondê-lo faria a ausência parecer falta de permissão.
    const botao = screen.getByRole('button', { name: /Reagendar/i })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('title', expect.stringContaining('sem data prometida'))
  })

  it('avisa quanto falta para o faturamento mínimo, SEM contar o acréscimo', async () => {
    // Subtotal 10 × R$ 290,00 = R$ 2.900,00; mínimo R$ 5.000,00 → faltam
    // R$ 2.100,00. O acréscimo de R$ 180,00 NÃO entra: frete não é mercadoria,
    // e somá-lo liberaria uma ordem que o fornecedor recusa.
    await abrirOrdem(servidor())

    // Por rótulo e não por `role="status"`: a tela tem mais de um `status`
    // (o rodapé de alterações pendentes é outro), e `findByRole` acharia dois.
    const aviso = await screen.findByLabelText('Falta para o mínimo')
    expect(aviso).toHaveTextContent('2.100,00')
  })

  it('a volta ordem → pedido leva ao documento de ORIGEM da linha', async () => {
    const { router, user } = await abrirOrdem(servidor())

    await user.click(screen.getByRole('button', { name: 'PC-7761' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/compras/pedidos/${PEDIDO_ORIGEM}`)
    })
  })

  it('a listagem mostra a previsão VÁLIDA com a original ao lado', async () => {
    renderRoute('/compras/ordens', servidor() as never)

    // Só `expectedAt` esconderia o atraso que a coluna existe para revelar.
    expect(await screen.findByText('02/10/2026 (era 03/09/2026)')).toBeInTheDocument()
  })
})
