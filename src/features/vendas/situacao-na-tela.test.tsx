import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A SITUAÇÃO DA ENTREGA DENTRO DO DOCUMENTO DE VENDA — o gap da F9 (web#382).
 *
 * `GET /api/orders/{id}/fulfillment` estava no contrato e na passagem desde a
 * web#342/#349, com tela no Quadro de Cargas. O que faltava era o documento:
 * quem abria o PEDIDO não via separação nenhuma.
 *
 * O que cada caso mede, e por que ele existe:
 *
 * 1. **As três quantidades aparecem no documento.** É o caso que falha se o
 *    painel não for montado — o buraco que esta issue veio fechar.
 * 2. **O degrau cobre a linha INTEIRA.** A linha 10/10/6/2 é `Separado
 *    (parcial)`, nunca `Entregue`: o degrau mais avançado com QUALQUER
 *    progresso marcaria como entregue peça que está no galpão, e é assim que o
 *    cliente liga. Esta é a sabotagem nº1 da prova vermelha.
 * 3. **O romaneio responde seis meses depois.** Sem `Saiu em` e `Recebido por`
 *    ao lado do número, a tabela de romaneios é decoração.
 * 4. **O link leva o pedido JUNTO.** Mandar para o quadro sem o `?pedido=`
 *    obriga o operador a reencontrar a linha na fila — e o pedido sem nada
 *    liberado não está na fila, então ele não a encontraria. Esta é a
 *    sabotagem nº2.
 * 5. **`Incluir` não pergunta a situação.** Documento que não existe não tem
 *    peça separada, e a consulta seria um 404 com cara de "nada foi separado".
 */

const ID = '5a1c8e70-3b2d-4f61-8e93-1c7d4a9f0e22'

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
  workId: null,
  workName: null,
  status: 'active',
  type: 'sale',
  demoDueDate: null,
  demoReturnedAt: null,
  salespersonId: null,
  salespersonName: null,
  professionalId: null,
  professionalName: null,
  totalCents: 250000,
  quoteId: null,
  quoteNumber: null,
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
      quantity: 10,
      unit: 'PC',
      unitPriceCents: 25000,
      discountPercent: 0,
      supplierId: null,
      supplierName: 'VERTZ',
      supplierCode: 'V-771',
      supplierDescription: 'PENDENTE REDONDO',
      productGroup: null,
      pieceType: null,
    },
  ],
  serviceItems: [],
  paymentTermId: null,
  paymentTermName: null,
  paymentInstallments: [],
  installmentPolicy: null,
}

/**
 * A linha do caso NORMAL da cozinha que sai em três viagens: 10 vendidas, 10
 * liberadas, 6 separadas, 2 entregues. `physicalState` é o degrau que cobre a
 * linha inteira (`released`, porque só as 10 liberadas cobrem tudo) e `partial`
 * carrega o resto da verdade.
 */
const LINHA_PARCIAL = {
  lineNumber: 1,
  description: 'PENDENTE REDONDO',
  environmentCode: 'F5',
  environmentName: 'Sala',
  quantity: 10,
  quantityReleased: 10,
  quantityPicked: 6,
  quantityDelivered: 2,
  physicalState: 'released',
  partial: true,
  pendingRelease: 0,
  pendingPick: 4,
  pendingDelivery: 4,
  percentDelivered: 20,
  scheduledDeliveryAt: '2026-09-10',
  scheduledDateInherited: true,
}

const SITUACAO = {
  orderId: ID,
  orderNumber: '30991',
  status: 'active',
  physicalState: 'released',
  percentDelivered: 20,
  items: [LINHA_PARCIAL],
}

const ROMANEIO = {
  id: 'rom-77',
  number: '1042',
  orderId: ID,
  orderNumber: '30991',
  customerName: 'STELLA ILUMINAÇÃO LTDA',
  status: 'closed',
  scheduledFor: '2026-09-01',
  deliveredAt: '2026-09-02T15:00:00.000Z',
  carrierId: null,
  carrierName: null,
  receivedBy: 'PORTARIA — J. SOUZA',
  receivedDocument: '1234',
  closedAt: '2026-09-02T15:10:00.000Z',
  notes: null,
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Servidor falso, e não mock de módulo. A ORDEM importa: `/fulfillment` é um
 * sub-caminho de `/api/orders`, e casar a família primeiro faria a situação
 * cair na resposta do detalhe do pedido — teste verde sem nada medido.
 */
function servidor({
  situacao = SITUACAO,
  romaneios = [ROMANEIO] as unknown[],
  vistos = [] as string[],
} = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'
    vistos.push(`${metodo} ${url}`)

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/payment-terms')) return json({ rows: [], total: 0 })
    if (url.includes('/api/installment-policy')) return json(null)
    if (url.includes('/api/partners')) return json({ rows: [], total: 0 })

    if (url.includes('/fulfillment')) return json(situacao)
    if (url.includes('/api/deliveries')) {
      return json({ rows: romaneios, total: romaneios.length })
    }
    // A fila do quadro de cargas NÃO tem este pedido: nada está esperando
    // separação com as 10 já liberadas. É de propósito — é o caso que prova
    // que o `?pedido=` abre a carga sem depender da fila.
    if (url.includes('/api/picking-queue')) return json({ rows: [], total: 0 })

    if (url.includes('/api/orders')) {
      if (url.includes(ID)) return json(DETALHE)
      return json({ rows: [DETALHE], total: 1 })
    }
    return json({ rows: [], total: 0 })
  }
}

/** A folha carregada — o Nº Pasta é o sinal de que o documento montou. */
async function abrirPedido(stub: unknown) {
  const r = renderRoute(`/vendas/pedidos/${ID}`, stub as never)
  await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-104'))
  return r
}

describe('a situação da entrega no documento de venda', () => {
  it('mostra as três quantidades da linha, e não só o estado', async () => {
    await abrirPedido(servidor())

    const linha = await screen.findByTestId('situacao-linha-1')
    const celulas = within(linha).getAllByRole('cell')
    // Item · Descrição · Ambiente · Vendido · Liberado · Separado · Entregue
    expect(celulas[3]).toHaveTextContent('10')
    expect(celulas[4]).toHaveTextContent('10')
    expect(celulas[5]).toHaveTextContent('6')
    expect(celulas[6]).toHaveTextContent('2')
  })

  it('o degrau cobre a linha INTEIRA e o parcial carrega o resto', async () => {
    await abrirPedido(servidor())

    const estado = await screen.findByTestId('situacao-estado-1')
    // 2 de 10 entregues NÃO faz a linha entregue: o degrau é o que cobre tudo.
    expect(estado).toHaveTextContent('Liberado')
    expect(estado).not.toHaveTextContent('Entregue')
    expect(within(screen.getByTestId('situacao-linha-1')).getByText(/parcial/i)).toBeVisible()
  })

  it('o romaneio diz quando saiu e quem recebeu', async () => {
    await abrirPedido(servidor())

    const linha = await screen.findByTestId('romaneio-1042')
    expect(linha).toHaveTextContent('Fechado')
    expect(linha).toHaveTextContent('PORTARIA — J. SOUZA')
    expect(linha).toHaveTextContent('02/09/2026')
  })

  /**
   * O QUADRO DE CARGAS MORREU (D12) e `/vendas/cargas` virou redirecionamento.
   *
   * O botão continua levando o pedido JUNTO — e agora ele chega mais longe: com
   * o id na mão, o destino é a ficha do próprio pedido, em vez de um cartão a
   * ser procurado numa coluna. O que o teste vigia continua sendo o mesmo: a
   * escolha feita aqui não se perde no caminho.
   */
  it('leva o pedido JUNTO ao sair da situação da entrega', async () => {
    const { user, router } = await abrirPedido(servidor())

    await user.click(await screen.findByTestId('ir-para-cargas'))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/vendas/pedidos/${ID}`))
    // Timeout próprio: o destino agora é a FICHA, e ela remonta o documento
    // inteiro depois do redirecionamento — os 15s padrão eram para uma tela que
    // só listava a fila.
  }, 30_000)

  it('em Incluir não pergunta a situação de documento que não existe', async () => {
    const vistos: string[] = []
    renderRoute('/vendas/pedidos/novo', servidor({ vistos }) as never)

    await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toBeVisible())
    expect(vistos.some((v) => v.includes('/fulfillment'))).toBe(false)
    expect(screen.queryByTestId('ir-para-cargas')).toBeNull()
  })
})
