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
 * O `Gravar` DO ORÇAMENTO GRAVA (#186, bloco 3).
 *
 * A fronteira de `/api/quotes` está pronta desde a #134 — `paraEscrita`,
 * `useCriarOrcamento`, `useAlterarOrcamento`, `useCancelarOrcamento` — e
 * **nenhuma tela a chamava**: o formulário fazia `console.info('[mock] Gravar
 * orçamento')` e navegava de volta para a listagem. O operador via o mesmo
 * desfecho de uma gravação bem-sucedida (a tela fecha, a listagem volta) sobre
 * uma escrita que nunca saiu. É a pior forma de dívida: parece entregue.
 */

const ID = '7c5b2a10-8f3e-4d21-9c6b-2f1a4e8d0b33'

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
}

const LINHA = {
  id: ID,
  number: '10231',
  series: '1',
  issuedAt: '2026-08-10',
  expiresAt: '2026-08-15',
  customerId: DETALHE.customerId,
  customerName: DETALHE.customerName,
  projectName: 'Residência Alphaville',
  status: 'open',
  totalCents: 250000,
  discountMode: 'product',
  discountPercent: 0,
}

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
 * Servidor falso, e não mock de módulo: o cliente gerado chama
 * `fetch(new Request(...))`, então **verbo e corpo só existem no `Request`** —
 * stub que casa por caminho deixaria o `POST` cair na resposta do `GET` e o
 * teste passaria sem afirmar nada.
 */
function servidor(escritas: Escrita[], respostaDeEscrita?: () => Response, leituras?: string[]) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()

    if (url.includes('/api/quotes')) {
      if (metodo !== 'GET') {
        const cru = await req?.text()
        escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : null })
        return respostaDeEscrita ? respostaDeEscrita() : json(DETALHE)
      }
      if (url.includes(ID)) return json(DETALHE)
      leituras?.push(url)
      return json({ rows: [LINHA], total: 1 })
    }
    return undefined
  }
}

describe('o orçamento grava de verdade', () => {
  it('grava o documento aberto com PUT, e o corpo é o do contrato', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute(`/vendas/orcamentos/${ID}`, servidor(escritas) as never)

    await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-88'))
    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    const [escrita] = escritas
    expect(escrita?.metodo).toBe('PUT')
    expect(escrita?.url).toContain(`/api/quotes/${ID}`)

    const corpo = escrita?.corpo as Record<string, unknown>
    // O `PUT` do contrato é INTEGRAL: campo que o formulário não devolve é
    // campo apagado. Abrir e gravar sem editar não pode mudar o documento.
    expect(corpo.customerId).toBe(DETALHE.customerId)
    expect(corpo.folderNumber).toBe('P-88')
    expect((corpo.items as unknown[]).length).toBe(1)
    // Número, situação e total são do SERVIDOR — o contrato os tira da escrita.
    expect(corpo.number).toBeUndefined()
    expect(corpo.status).toBeUndefined()
    expect(corpo.totalCents).toBeUndefined()
  })

  it('recusa do servidor fica na tela, e a tela NÃO navega', async () => {
    const escritas: Escrita[] = []
    const problema = () =>
      new Response(
        JSON.stringify({
          type: 'about:blank',
          title: 'Validação falhou',
          status: 400,
          detail: 'A data de validade é anterior à emissão.',
        }),
        { status: 400, headers: { 'content-type': 'application/problem+json' } },
      )

    const { user, router } = renderRoute(
      `/vendas/orcamentos/${ID}`,
      servidor(escritas, problema) as never,
    )

    await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-88'))
    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))

    // O `detail` é a frase que o servidor escolheu para o caso — é a única
    // informação acionável da recusa.
    expect(
      await screen.findByText(/A data de validade é anterior à emissão\./i),
    ).toBeInTheDocument()
    // Navegar depois de falhar diria "gravado" com outra voz.
    expect(router.state.location.pathname).toContain(ID)
  })
})

describe('cancelar o orçamento', () => {
  it('cancela pelo caminho próprio do contrato, depois de confirmar', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/vendas/orcamentos', servidor(escritas) as never)

    await acaoNaLinha(user, '10231', /Cancelar/i)

    // Cancelamento de documento é terminal (o contrato não publica reabertura),
    // então ele passa por confirmação — como a desativação de cadastro.
    await user.click(await screen.findByRole('button', { name: /^Cancelar orçamento$/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.metodo).toBe('POST')
    expect(escritas[0]?.url).toContain(`/api/quotes/${ID}/cancel`)
  })

  it('a listagem reconsulta depois do cancelamento', async () => {
    const escritas: Escrita[] = []
    const leituras: string[] = []
    const { user } = renderRoute(
      '/vendas/orcamentos',
      servidor(escritas, undefined, leituras) as never,
    )

    await screen.findByText('10231')
    const antes = leituras.length

    await acaoNaLinha(user, '10231', /Cancelar/i)
    await user.click(await screen.findByRole('button', { name: /^Cancelar orçamento$/i }))

    // A situação da linha mudou no servidor. Sem invalidar a chave da LISTAGEM
    // — que é `['orcamentos']`, e não `['orcamento']` — a tela seguiria
    // mostrando "aberto" no documento que o operador acabou de cancelar.
    await waitFor(() => expect(leituras.length).toBeGreaterThan(antes))
  })
})
