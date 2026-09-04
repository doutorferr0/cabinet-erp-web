import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * PEDIDO DE COMPRA NA TELA — a fase C do G2.
 *
 * As 14 operações de compra estavam no contrato desde a web#316 e o MSW as
 * servia inteiras. A tela, não: ela era mock visual com os nomes do legado
 * (`codigo`, `pedVenda`, `fornecedores: string[]`) e um `console.info` no lugar
 * da gravação. Esta bateria mede o que a ligação PRECISA ter, e cada caso é um
 * eixo que some em silêncio se ninguém o cobrar:
 *
 * 1. **O fornecedor viaja por ID, nunca por nome.** É a regra que o contrato
 *    escreve em `SupplierGroupMinimumDto` ("`productGroupName` NÃO é chave") e
 *    a que uma célula `select` de nomes na grade quebraria sem erro nenhum —
 *    gravaria com 200 e casaria o fornecedor errado no primeiro homônimo.
 * 2. **O elo com o pedido de venda ecoa o CLIENTE.** Sem ele, toda linha da
 *    previsão de chegada aparece como reposição de estoque, e ninguém descobre
 *    a quem a peça foi prometida.
 * 3. **A ponte para a ordem é POR FORNECEDOR.** A ordem tem UM fornecedor: um
 *    botão só, levando para a listagem, é o que a tela antiga fazia — e ele não
 *    levava pedido nenhum consigo.
 * 4. **`purchaseOrderId`, `status` da linha e `number` NÃO sobem na escrita.**
 *    São derivados. Mandá-los daqui é a tela afirmando que uma linha já foi
 *    atendida.
 */

const PEDIDO_ID = 'pc-0001'
const FORNECEDOR_A = 'parc-0001'
const FORNECEDOR_B = 'parc-0006'

interface Escrita {
  url: string
  metodo: string
  corpo: Record<string, unknown> | undefined
}

const PEDIDO = {
  id: PEDIDO_ID,
  number: 'PC-7761',
  status: 'partially_ordered',
  issuedAt: '2026-08-07',
  orderId: null,
  orderNumber: null,
  customerId: null,
  customerName: null,
  itemCount: 2,
  notes: null,
  items: [
    {
      lineNumber: 1,
      variantId: 'var-0002',
      description: 'PENDENTE VIDRO FUMÊ 30CM',
      finish: 'DOURADO',
      size: '30CM',
      unit: 'UN',
      quantity: 6,
      destination: 'stock',
      supplierId: FORNECEDOR_A,
      supplierName: 'EVOLED COMERCIAL',
      sourceOrderItemLine: null,
      purchaseOrderId: null,
      purchaseOrderNumber: null,
      status: 'open',
      notes: null,
    },
    {
      lineNumber: 2,
      variantId: 'var-0003',
      description: 'ARANDELA ALUMÍNIO IP65',
      finish: 'BRANCO',
      size: 'ÚNICO',
      unit: 'UN',
      quantity: 10,
      destination: 'stock',
      supplierId: FORNECEDOR_B,
      supplierName: 'FILLAMENTO',
      sourceOrderItemLine: null,
      // JÁ EM ORDEM: é a linha que a ponte não pode oferecer de novo.
      purchaseOrderId: 'oc-0002',
      purchaseOrderNumber: 'OC-5102',
      status: 'ordered',
      notes: null,
    },
  ],
}

const PEDIDO_DE_VENDA = {
  id: 'ped-0001',
  number: '30991',
  issuedAt: '2026-08-05',
  customerId: 'cli-0001',
  customerName: 'STELLA ILUMINAÇÃO LTDA',
  status: 'active',
  type: 'sale',
  totalCents: 250000,
}

const FORNECEDORES = [
  {
    id: FORNECEDOR_A,
    code: '1001',
    legalName: 'EVOLED COMERCIAL',
    document: '12345678000190',
    isCustomer: false,
    isSupplier: true,
    isProfessional: false,
    active: true,
    minimumBillingCents: 250000,
    deliveryDays: 12,
  },
  {
    id: FORNECEDOR_B,
    code: '1006',
    legalName: 'FILLAMENTO',
    document: '98765432000110',
    isCustomer: false,
    isSupplier: true,
    isProfessional: false,
    active: true,
    minimumBillingCents: null,
    deliveryDays: null,
  },
]

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function servidor({
  escritas = [],
  pedido = PEDIDO,
}: { escritas?: Escrita[]; pedido?: Record<string, unknown> } = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/payment-terms')) return json({ rows: [], total: 0 })
    if (url.includes('/api/partners')) return json({ rows: FORNECEDORES, total: 2 })
    if (url.includes('/api/orders')) return json({ rows: [PEDIDO_DE_VENDA], total: 1 })

    if (url.includes('/api/purchase-requests')) {
      if (metodo !== 'GET') {
        const cru = (await req?.text()) ?? ''
        escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : undefined })
        return json(pedido)
      }
      if (url.includes(PEDIDO_ID)) return json(pedido)
      return json({ rows: [pedido], total: 1 })
    }

    return undefined
  }
}

async function abrirPedido(stub: unknown) {
  const r = renderRoute(`/compras/pedidos/${PEDIDO_ID}`, stub as never)
  await waitFor(() =>
    expect(screen.getByLabelText('Número do pedido')).toHaveTextContent('PC-7761'),
  )
  return r
}

describe('pedido de compra na tela', () => {
  it('a listagem mostra os nomes do CONTRATO e diz "estoque" onde não há venda', async () => {
    renderRoute('/compras/pedidos', servidor() as never)

    expect(await screen.findByText('PC-7761')).toBeInTheDocument()
    // `orderNumber` nulo é compra para ESTOQUE (§7.3) — célula em branco leria
    // como dado faltando e mandaria procurar uma venda que nunca existiu.
    expect(await screen.findByText('— estoque')).toBeInTheDocument()
    // 30s pelo mesmo motivo dos outros: a listagem monta a tela inteira e, com
    // os dois arquivos de compra no mesmo processo, o `findByText` estoura o
    // teto — e reprova dizendo "Unable to find", que se lê como asserção falsa.
  }, 30_000)

  it('a linha traz o fornecedor ecoado, a situação e a ordem que a levou', async () => {
    await abrirPedido(servidor())

    // A segunda linha já está em ordem: a tela diz QUAL, e é a volta para o
    // outro lado da navegação.
    expect(await screen.findByText('OC-5102')).toBeInTheDocument()
    expect(screen.getByText('Em ordem')).toBeInTheDocument()
    expect(screen.getByText('FILLAMENTO')).toBeInTheDocument()
  })

  it('grava mandando supplierId por LINHA, e sem os campos derivados', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirPedido(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Gravar/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    const corpo = escritas[0]?.corpo as {
      items: Record<string, unknown>[]
      number?: unknown
      status?: unknown
    }
    expect(escritas[0]?.metodo).toBe('PUT')
    expect(corpo.items[0]?.supplierId).toBe(FORNECEDOR_A)
    // Eco não sobe: o nome é do servidor, e mandá-lo daqui deixaria a tela
    // reescrever o cadastro do fornecedor por dentro do documento.
    expect(corpo.items[0]).not.toHaveProperty('supplierName')
    // Derivados não sobem: quem os escreve é a ordem que levou a linha.
    expect(corpo.items[1]).not.toHaveProperty('purchaseOrderId')
    expect(corpo.items[1]).not.toHaveProperty('status')
    expect(corpo).not.toHaveProperty('number')
    expect(corpo).not.toHaveProperty('status')
  })

  /*
   * Teto PRÓPRIO de 30s, e o motivo é medido: este caso monta a tela inteira,
   * abre um diálogo de busca e ainda navega. Isolado ele fecha em ~4s; com os
   * dois arquivos de compra no mesmo processo, passa dos 15s do
   * `vitest.config.ts` — e a falha sai como `Test timed out`, sem asserção
   * nenhuma quebrada, que é o disfarce mais caro de depurar.
   */
  it('vincular o pedido de venda ECOA o cliente e manda só o id', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirPedido(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /Vincular pedido de venda/i }))
    await user.click(await screen.findByText('30991'))
    await user.click(screen.getByRole('button', { name: /^Selecionar$/i }))

    // O cliente é ECO da venda — a tela não o digita, e é ele que faz a
    // previsão de chegada saber a quem a peça foi prometida.
    await waitFor(() => {
      expect(screen.getByLabelText('Cliente do pedido de venda')).toHaveTextContent(
        'STELLA ILUMINAÇÃO LTDA',
      )
    })

    await user.click(screen.getByRole('button', { name: /^Gravar/i }))
    await waitFor(() => expect(escritas.length).toBe(1))
    const corpo = escritas[0]?.corpo as Record<string, unknown>
    expect(corpo.orderId).toBe('ped-0001')
    expect(corpo).not.toHaveProperty('customerName')
  }, 30_000)

  /*
   * Teto PRÓPRIO de 30s, e o motivo é medido: este caso monta a tela inteira,
   * abre um diálogo de busca e ainda navega. Isolado ele fecha em ~4s; com os
   * dois arquivos de compra no mesmo processo, passa dos 15s do
   * `vitest.config.ts` — e a falha sai como `Test timed out`, sem asserção
   * nenhuma quebrada, que é o disfarce mais caro de depurar.
   */
  it('a ponte para a ordem é por FORNECEDOR e só oferece quem tem linha aberta', async () => {
    const { router, user } = await abrirPedido(servidor())

    // A linha 2 é do FILLAMENTO e já está em ordem: oferecê-la daria uma ordem
    // que o servidor recusa com `item-ja-em-ordem`.
    expect(screen.queryByRole('button', { name: 'FILLAMENTO' })).not.toBeInTheDocument()

    // COM UM FORNECEDOR SÓ o gesto é a PRÓXIMA AÇÃO do cabeçalho (D19, #487),
    // e a ponte do rodapé não aparece: dois botões com o mesmo destino na mesma
    // tela era a duplicação que a Reface desfez. Com dois ou mais fornecedores
    // em aberto a ponte volta — a próxima ação é uma, e o pedido com três
    // fornecedores não tem uma próxima ordem, tem três.
    await user.click(
      screen.getByRole('button', { name: 'Gerar ordem de compra · EVOLED COMERCIAL' }),
    )

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/compras/ordens/novo')
    })
    // O pedido e o fornecedor viajam na URL: sem eles a ordem nasceria vazia e
    // o comprador teria de reencontrar à mão o que acabou de escolher.
    const busca = router.state.location.search as { dePedido?: string; fornecedor?: string }
    expect(busca.dePedido).toBe(PEDIDO_ID)
    expect(busca.fornecedor).toBe(FORNECEDOR_A)
  }, 30_000)
})
