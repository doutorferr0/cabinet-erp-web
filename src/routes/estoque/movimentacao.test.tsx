import { instalarServidor, json } from '@/test/servidor'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('rota /estoque/movimentacao', () => {
  it('responde e aparece no grupo ESTOQUE da barra, preenchendo o slot reservado (§10)', async () => {
    const { user } = renderRoute('/')

    // A barra 2.0 (D4) tem TODOS os módulos numa lista só, com o grupo da rota
    // aberto e os outros dobrados. Na raiz o grupo aberto é HOJE, então chegar
    // à Movimentação são dois gestos: abrir ESTOQUE e clicar no item.
    //
    // O rótulo do grupo é `<button>` e não `<Link>`: ele NÃO navega, e a
    // diferença é a informação — o modelo anterior tinha um ícone-link por
    // seção, e clicar nele levava à primeira tela dela. Aqui abrir o grupo e
    // escolher a tela são dois atos separados.
    await user.click(await screen.findByRole('button', { name: /Estoque/ }))
    await user.click(await screen.findByRole('link', { name: 'Movimentação' }))

    expect(await screen.findByRole('heading', { name: 'Movimentação' })).toBeInTheDocument()
  })
})

/**
 * O DESENHO 2.0 da tela (D24) — o que estes dois casos travam.
 *
 * Eles não medem cor nem sombra: CSS não roda no jsdom, e um teste que asserisse
 * classe passaria verde com o token errado. O que dá para afirmar aqui é a ORDEM
 * e a PRESENÇA — que a tela vazia diz o que fazer com o cursor já no campo, e que
 * escolhida a peça os quatro números aparecem antes das duas grades. É essa
 * ordem que a issue inverteu, e é ela que uma reface seguinte pode desfazer sem
 * perceber.
 */
const PRODUTO = {
  id: 'prod-1',
  code: 'PD-1001',
  description: 'PENDENTE VIDRO FUMÊ 30CM',
  active: true,
}

function servidor() {
  return instalarServidor({
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/catalog-lookups': () => json({ rows: [], total: 0 }),
    '/api/products': () => json({ rows: [PRODUTO], total: 1 }),
    '/api/products/prod-1': () =>
      json({
        ...PRODUTO,
        variants: [{ id: 'var-1', finish: 'PRETO FOSCO', size: '30CM', active: true }],
      }),
    '/api/stock-locations': () =>
      json({
        rows: [
          {
            id: 'dep-1',
            parentId: null,
            code: 'PRINCIPAL',
            name: 'DEPÓSITO PRINCIPAL',
            isDefault: true,
            active: true,
          },
        ],
        total: 1,
      }),
    '/api/variants/var-1/stock-balances': () =>
      json({
        rows: [
          {
            locationId: 'dep-1',
            variantId: 'var-1',
            qty: 12,
            updatedAt: '2026-08-01T12:00:00.000Z',
          },
        ],
        total: 1,
      }),
    '/api/variants/var-1/stock-movements': () =>
      json({
        rows: [
          {
            id: 'mov-1',
            variantId: 'var-1',
            locationId: 'dep-1',
            delta: 12,
            balanceAfter: 12,
            reason: 'Carga inicial',
            occurredAt: '2026-08-01T12:00:00.000Z',
            employeeId: null,
          },
        ],
        total: 1,
      }),
    // A reserva é a única das quatro que NÃO vem de estoque: `qtyAllocated` só
    // sai por esta consulta de compras. Ver o cabeçalho de `kpis-da-peca.tsx`.
    '/api/purchases/stock-replenishment': () =>
      json({
        rows: [
          {
            variantId: 'var-1',
            description: 'PENDENTE VIDRO FUMÊ 30CM',
            qtyOnHand: 12,
            qtyAllocated: 4,
            qtyAvailable: 8,
            qtyOnOrder: 0,
            qtySuggested: 0,
          },
        ],
        total: 1,
      }),
  })
}

describe('movimentação 2.0', () => {
  it('sem peça, a tela diz o que fazer e o cursor já está no campo', async () => {
    const falso = servidor()
    renderRoute('/estoque/movimentacao', falso.fetch)

    expect(await screen.findByText('Escolha uma peça')).toBeInTheDocument()
    // O foco é metade da frase: mandar digitar e deixar o cursor em outro
    // lugar faz o operador procurar onde clicar antes de obedecer.
    expect(await screen.findByLabelText('Produto')).toHaveFocus()
    // Nada de saldo nem de histórico antes da escolha — a tela responde sobre
    // UMA peça, e sem peça não há o que responder.
    expect(screen.queryByText('Saldo por depósito')).toBeNull()
  }, 30_000)

  it('escolhida a peça, os QUATRO números aparecem antes das grades', async () => {
    const falso = servidor()
    const { user } = renderRoute('/estoque/movimentacao', falso.fetch)

    await user.type(await screen.findByLabelText('Produto'), 'PD-1')
    await user.click(await screen.findByText('PENDENTE VIDRO FUMÊ 30CM'))
    await user.selectOptions(await screen.findByRole('combobox', { name: /variante/i }), 'var-1')

    // A faixa se acha pelo `data-slot`, que é como este repo marca região —
    // não por `data-testid`, que existiria só para o teste.
    const faixa = (await screen.findByText('Reservado')).closest(
      '[data-slot="kpis-da-peca"]',
    ) as HTMLElement
    expect(faixa).not.toBeNull()
    for (const rotulo of ['Saldo', 'Reservado', 'Disponível', 'Último movimento']) {
      expect(within(faixa).getByText(rotulo)).toBeInTheDocument()
    }
    // Reservado e disponível vêm da reposição de compras, e o valor é o DELA —
    // a tela não refaz a subtração. Ver `kpis-da-peca.tsx`.
    expect(await within(faixa).findByText('4')).toBeInTheDocument()
    expect(within(faixa).getByText('8')).toBeInTheDocument()

    // O `q` da reposição é a DESCRIÇÃO, e este é o caso que impede a volta do
    // código: `PurchaseReplenishmentRowDto` publica `description`, `finish` e
    // `size` — nenhum código —, então `q=PD-1001` devolve lista vazia e os dois
    // cartões dizem "a peça não está na reposição" para uma peça que está. O
    // servidor falso não filtra, então a asserção é sobre a URL: um teste que só
    // olhasse a tela passaria verde com a pergunta errada.
    const consultas = falso.em('/api/purchases/stock-replenishment')
    expect(consultas.length).toBeGreaterThan(0)
    expect(consultas[0]?.url).toContain('PENDENTE')
    expect(consultas.some((c) => c.url.includes('PD-1001'))).toBe(false)

    // A faixa vem ANTES do painel de saldo no documento: resumo, depois
    // detalhe. É a ordem que a issue inverteu.
    const painel = await screen.findByText('Saldo por depósito')
    expect(faixa.compareDocumentPosition(painel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  }, 30_000)
})
