import { respostaPagamento } from '@/test/orcamentos'
import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O PAINEL DE ATIVIDADES CHEGA AO ORÇAMENTO (#90).
 *
 * A tabela `activities` é polimórfica e o contrato declara `quote` no conjunto
 * fechado de `entityType` desde que a rota nasceu. O painel ficou de fora da
 * tela do orçamento por um motivo que ESTAVA certo e VENCEU: enquanto o
 * documento era mock puro, o `entityId` seria um id inventado no front, e a
 * atividade sobreviveria à troca mock→HTTP apontando para um registro que
 * nenhum servidor conhece. Com `/api/quotes` no ar (#134), o id é uuid do
 * servidor e a condição que o próprio painel escreveu foi satisfeita.
 */

const ID = '7c5b2a10-8f3e-4d21-9c6b-2f1a4e8d0b33'

const DETALHE = {
  id: ID,
  number: '10231',
  series: '1',
  folderNumber: 'P-88',
  issuedAt: '2026-08-10',
  expiresAt: null,
  closedAt: null,
  customerId: '3f2a91cc-1d44-4a90-9f77-5b0e2c8a7d11',
  customerName: 'STELLA ILUMINAÇÃO LTDA',
  projectName: 'Residência Alphaville',
  salespersonId: null,
  salespersonName: null,
  professionalId: null,
  professionalName: null,
  status: 'open',
  totalCents: 0,
  discountMode: 'product',
  discountPercent: 0,
  environments: [],
  items: [],
}

const ATIVIDADE = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  entityType: 'quote',
  entityId: ID,
  kind: 'call',
  title: 'Ligar confirmando a medida do hall',
  dueDate: '2026-08-20',
  doneAt: null,
  ownerId: null,
  ownerName: null,
  notes: null,
}

function json(corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    headers: { 'content-type': 'application/json' },
  })
}

function servidor(consultas: string[]) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    // O bloco Pagamento da seção 06 consulta estas duas em toda montagem
    // do documento. Sem dublê elas não dão erro visível: o `retry` do app é
    // `tentativa < 3` com backoff, e o teste morre de `Test timed out` sem
    // nunca falar de pagamento.
    if (url.includes('/api/installment-policy')) return respostaPagamento('/api/installment-policy')
    if (url.includes('/api/payment-terms')) return respostaPagamento('/api/payment-terms')

    if (url.includes('/api/activities')) {
      consultas.push(url)
      return json({ rows: [ATIVIDADE], total: 1 })
    }
    if (url.includes('/api/quotes')) {
      if (url.includes(ID)) return json(DETALHE)
      return json({ rows: [], total: 0 })
    }
    return undefined
  }
}

describe('atividades no orçamento', () => {
  it('o documento existente mostra o que está agendado sobre ele', async () => {
    const consultas: string[] = []
    renderRoute(`/vendas/orcamentos/${ID}`, servidor(consultas) as never)

    expect(await screen.findByText('Ligar confirmando a medida do hall')).toBeInTheDocument()

    // O alvo viaja como a tabela + o id do SERVIDOR. Id inventado no front
    // casaria com registro que nenhum backend conhece.
    await waitFor(() => expect(consultas.length).toBeGreaterThan(0))
    expect(consultas[0]).toContain('entityType=quote')
    expect(consultas[0]).toContain(`entityId=${ID}`)
  })

  it('em Incluir não há a que pendurar atividade, e o painel não aparece', async () => {
    const consultas: string[] = []
    renderRoute('/vendas/orcamentos/novo', servidor(consultas) as never)

    // A folha do documento novo carregou…
    await screen.findByLabelText(/Nº Pasta/i)
    // …e nenhuma atividade foi pedida: não existe id do servidor ainda.
    expect(consultas).toHaveLength(0)
    expect(screen.queryByText('Ligar confirmando a medida do hall')).not.toBeInTheDocument()
  })
})
