import {
  acaoNaLinha,
  renderRoute,
  respostaLookups,
  respostaSessao,
  respostaVinculos,
} from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A CONVERSÃO ORÇAMENTO → PEDIDO NA TELA — o gesto pelo qual quase todo pedido
 * de venda passa a existir.
 *
 * `POST /api/quotes/{id}/order` está no contrato e o backend a serve desde a
 * api#145. Nenhum arquivo fora do codegen a chamava: o comentário de
 * `pedidos-venda-api.ts` a listava entre as "seis já consumidas" e ela não
 * estava nem nos imports — dívida escrita como fato, que é a forma que ninguém
 * confere.
 *
 * ## O que esta bateria mede, e por que cada caso existe
 *
 * 1. **A conversão não manda corpo.** O pedido é COPIADO pelo servidor, com o
 *    preço congelado; propor valores daqui criaria uma segunda autoridade sobre
 *    o número que o cliente aprovou. Corpo vazio e ausência de corpo respondem
 *    igual — a asserção é sobre o texto cru.
 * 2. **O sucesso leva ao PEDIDO, não de volta à listagem.** Voltar deixaria a
 *    tela idêntica à de antes do clique, que é também como um clique sem efeito
 *    parece.
 * 3. **Orçamento cancelado não vira requisição.** A situação já está na linha;
 *    gastar a escrita para receber 409 transformaria erro conhecido em erro do
 *    operador.
 * 4. **`pedido-ja-convertido` muda a FORMA da caixa.** Some o botão que acabou
 *    de falhar — repetir nunca vai funcionar — e entra o caminho para a
 *    listagem de pedidos. O discriminador é o `type`, nunca o status: o outro
 *    409 do mesmo caminho pede a ação oposta.
 * 5. **O 409 que a tela NÃO conhece cai na frase do servidor** e mantém o
 *    botão: a tela não sabe que aquilo é definitivo.
 */

const ATIVO = '9d0f4b31-6c22-4a58-90e7-2f5b1c8d3a44'
const CANCELADO = 'b71e2c40-8a13-49df-bc06-5e9a7d2f1b38'
const PEDIDO = '4c8a1f95-2d70-4b3e-a916-7f0c5d8e2a11'

/**
 * O botão DENTRO da caixa, e a caixa da CAPITALIZAÇÃO é o que o separa.
 *
 * A ação da barra de seleção se chama `Gerar Pedido` e a confirmação se chama
 * `Gerar pedido`: com matcher insensível a caixa, as duas casam, e o
 * `queryByRole(...).not.toBeInTheDocument()` dos casos 3 e 4 passaria por o
 * modal esconder a barra da árvore de acessibilidade — não por o botão ter
 * sumido. Verde pelo motivo errado é verde que sobrevive à regressão.
 */
const CONFIRMAR = 'Gerar pedido'

interface Escrita {
  url: string
  metodo: string
  /** `''` = requisição sem corpo. Corpo vazio seria `'{}'`, que é outra coisa. */
  cru: string
}

const LINHA_ATIVA = {
  id: ATIVO,
  number: '21653',
  series: '1',
  issuedAt: '2026-08-05',
  expiresAt: '2026-09-05',
  customerId: '3f2a91cc-1d44-4a90-9f77-5b0e2c8a7d11',
  customerName: 'ANDRÉ BATALHA',
  projectName: 'MARIANA',
  workId: null,
  workName: null,
  status: 'active',
  revision: 1,
  revisionOfId: null,
  totalCents: 250000,
}

const LINHA_CANCELADA = {
  ...LINHA_ATIVA,
  id: CANCELADO,
  number: '21654',
  customerName: 'ROMULO GERMANO',
  status: 'cancelled',
}

/** O pedido que a conversão devolve, e a folha para onde a tela navega. */
const PEDIDO_GERADO = {
  id: PEDIDO,
  number: '30991',
  series: '1',
  folderNumber: 'P-104',
  issuedAt: '2026-08-24',
  closedAt: null,
  customerId: LINHA_ATIVA.customerId,
  customerName: LINHA_ATIVA.customerName,
  projectName: LINHA_ATIVA.projectName,
  workId: null,
  workName: null,
  status: 'active',
  type: 'sale',
  demoDueDate: null,
  demoReturnedAt: null,
  cancelledAt: null,
  cancelReasonId: null,
  cancelReasonName: null,
  cancelNote: null,
  salespersonId: null,
  salespersonName: null,
  professionalId: null,
  professionalName: null,
  totalCents: LINHA_ATIVA.totalCents,
  quoteId: ATIVO,
  quoteNumber: LINHA_ATIVA.number,
  discountMode: 'product',
  discountPercent: 0,
  groupDiscounts: [],
  environments: [],
  items: [],
  serviceItems: [],
  paymentTermId: null,
  paymentTermName: null,
  paymentInstallments: [],
  installmentPolicy: null,
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Recusa no vocabulário fechado — o `type` é o que a tela lê. */
function problema(tipo: string, detalhe: string, status = 409): Response {
  return new Response(JSON.stringify({ type: tipo, title: 'Conflito', status, detail: detalhe }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  })
}

function servidor({
  escritas = [],
  recusa,
}: { escritas?: Escrita[]; recusa?: () => Response } = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/installment-policy')) return json({ minInstallmentCents: 0 })
    if (url.includes('/api/payment-terms')) return json({ rows: [], total: 0 })
    if (url.includes('/api/partners')) return json({ rows: [], total: 0 })

    if (url.includes('/order') && metodo === 'POST') {
      escritas.push({ url, metodo, cru: (await req?.text()) ?? '' })
      return recusa ? recusa() : json(PEDIDO_GERADO, 201)
    }

    if (url.includes('/api/orders')) {
      if (url.includes(PEDIDO)) return json(PEDIDO_GERADO)
      return json({ rows: [], total: 0 })
    }

    if (url.includes('/api/quotes')) {
      return json({ rows: [LINHA_ATIVA, LINHA_CANCELADA], total: 2 })
    }
    return undefined
  }
}

/**
 * Abre a listagem, marca a linha do orçamento e pede a conversão.
 *
 * A espera da primeira linha leva folga explícita porque o caso de ABERTURA do
 * arquivo paga o shell inteiro — rota, sessão, vínculos, listas de apoio e a
 * consulta da listagem — antes de existir uma célula para clicar. Com o padrão
 * de 1s o vermelho que aparece é `Unable to find text`, que acusa a tela e não
 * a máquina: os outros três casos, com os mesmos stubs, passam logo depois.
 */
async function pedirConversao(stub: unknown, cliente: string) {
  const r = renderRoute('/vendas/orcamentos', stub as never)
  await screen.findByText(cliente, {}, { timeout: 10_000 })
  await acaoNaLinha(r.user, cliente, /Gerar Pedido/i)
  return r
}

describe('gerar o pedido a partir do orçamento', () => {
  it('chama o caminho próprio SEM corpo e leva ao pedido gerado', async () => {
    const escritas: Escrita[] = []
    const { user } = await pedirConversao(servidor({ escritas }), 'ANDRÉ BATALHA')

    await user.click(await screen.findByRole('button', { name: CONFIRMAR }))

    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.metodo).toBe('POST')
    expect(escritas[0]?.url).toContain(`/api/quotes/${ATIVO}/order`)
    // Converter é copiar, e quem copia é o servidor. Corpo aqui seria a tela
    // propondo o preço que o cliente já aprovou.
    expect(escritas[0]?.cru).toBe('')

    // A folha do PEDIDO montou — é o `Nº Pasta` preenchido que prova que a
    // navegação chegou no documento, e não numa listagem qualquer.
    await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-104'))
    // Teto PRÓPRIO, e não o de 15 s do arquivo: este é o único caso que monta
    // DUAS telas inteiras — a listagem e, depois da conversão, a folha do pedido
    // com abas, blocos e o bloco de pagamento. Ele leva ~4,5 s com a máquina
    // livre e passa de 15 s quando outra suíte divide a CPU, e aí o vermelho diz
    // `Test timed out`, que acusa a tela em vez da contenção. Os outros três
    // casos ficam no padrão de propósito: eles param na caixa de confirmação, e
    // rebaixar o teto do arquivo inteiro esconderia lentidão de verdade neles.
  }, 45_000)

  it('orçamento cancelado não vira requisição', async () => {
    const escritas: Escrita[] = []
    await pedirConversao(servidor({ escritas }), 'ROMULO GERMANO')

    expect(await screen.findByText(/está cancelado/i)).toBeInTheDocument()
    // Não há o que confirmar: a caixa explica e oferece só a saída.
    expect(screen.queryByRole('button', { name: CONFIRMAR })).not.toBeInTheDocument()
    expect(escritas.length).toBe(0)
  })

  it('o já-convertido tira o botão e aponta a listagem de pedidos', async () => {
    const { user } = await pedirConversao(
      servidor({
        recusa: () =>
          problema(
            'urn:cabinet:erro:pedido-ja-convertido',
            'Este orçamento já foi convertido em pedido.',
          ),
      }),
      'ANDRÉ BATALHA',
    )

    await user.click(await screen.findByRole('button', { name: CONFIRMAR }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/já virou pedido/i)
    // Repetir o gesto nunca vai funcionar: o botão sai, e entra o caminho.
    expect(screen.queryByRole('button', { name: CONFIRMAR })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /listagem de Pedidos de Venda/i })).toBeInTheDocument()
  })

  it('o 409 que a tela não conhece cai na frase do servidor, e o botão fica', async () => {
    const { user } = await pedirConversao(
      servidor({
        recusa: () => problema('about:blank', 'Orçamento cancelado não vira pedido.'),
      }),
      'ANDRÉ BATALHA',
    )

    await user.click(await screen.findByRole('button', { name: CONFIRMAR }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/Orçamento cancelado não vira pedido/i)
    // A tela não sabe que este é definitivo — tirar o botão afirmaria o que ela
    // não mediu.
    expect(screen.getByRole('button', { name: CONFIRMAR })).toBeInTheDocument()
  })
})
