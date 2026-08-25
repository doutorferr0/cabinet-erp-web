import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O QUADRO DE CARGAS NA TELA — a fila agrupada e o gesto que move a escada.
 *
 * O que esta bateria mede, e por que cada caso existe:
 *
 * 1. **A fila vira CARGA.** O servidor devolve linhas soltas; quem separa
 *    pergunta "quais pedidos eu carrego hoje". Se o agrupamento quebrar, a tela
 *    continua mostrando tudo — e ninguém percebe olhando, porque as linhas
 *    estão lá.
 * 2. **A data da carga é a MAIS ANTIGA**, não a da primeira linha: a viagem
 *    atrasa junto com a peça mais atrasada dela.
 * 3. **O ato reflete.** Separar sem a tela mudar é o defeito que faz o operador
 *    clicar duas vezes e a terceira recusar com 409 — culpando ele.
 * 4. **A recusa sai INTEIRA.** Os seis 409 da escada dizem coisas diferentes, e
 *    "não foi possível" devolveria menos do que o operador já sabia.
 * 5. **Sem romaneio aberto não há botão de entregar** — não existe entregar
 *    avulso, e um botão que responde 409 é pior que a frase que diz o que fazer.
 */

const PED = 'ped-2001'

const FILA = {
  rows: [
    {
      orderId: PED,
      orderNumber: '21646',
      customerName: 'CONSTRUTORA HORIZONTE SA',
      lineNumber: 1,
      description: 'Porta de correr 2 folhas',
      environmentName: 'Cozinha',
      pendingPick: 4,
      scheduledDeliveryAt: '2026-08-20',
    },
    {
      orderId: PED,
      orderNumber: '21646',
      customerName: 'CONSTRUTORA HORIZONTE SA',
      lineNumber: 2,
      description: 'Puxador alumínio 150mm',
      environmentName: 'Cozinha',
      pendingPick: 12,
      // Mais ANTIGA que a da linha 1: é ela que tem de aparecer no cartão.
      scheduledDeliveryAt: '2026-08-18',
    },
    {
      orderId: 'ped-2002',
      orderNumber: '21653',
      customerName: 'MARIA APARECIDA GONCALVES',
      lineNumber: 1,
      description: 'Cuba inox 40x34',
      environmentName: null,
      pendingPick: 4,
      scheduledDeliveryAt: null,
    },
  ],
  total: 3,
}

function linha(over: Record<string, unknown> = {}) {
  return {
    lineNumber: 1,
    description: 'Porta de correr 2 folhas',
    environmentCode: 'COZ',
    environmentName: 'Cozinha',
    quantity: 4,
    quantityReleased: 4,
    quantityPicked: 0,
    quantityDelivered: 0,
    physicalState: 'released',
    partial: false,
    pendingRelease: 0,
    pendingPick: 4,
    pendingDelivery: 0,
    percentDelivered: 0,
    scheduledDeliveryAt: '2026-08-20',
    scheduledDateInherited: true,
    ...over,
  }
}

function situacao(itens: Record<string, unknown>[]) {
  return {
    orderId: PED,
    orderNumber: '21646',
    status: 'active',
    physicalState: 'released',
    percentDelivered: 0,
    items: itens,
  }
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function problema(tipo: string, detalhe: string, status = 409): Response {
  return new Response(JSON.stringify({ type: tipo, title: 'Conflito', status, detail: detalhe }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  })
}

interface Escrita {
  url: string
  metodo: string
  corpo: unknown
}

/**
 * O servidor falso, com ESTADO: separar muda o que a próxima leitura devolve.
 *
 * Um stub que respondesse sempre a mesma situação passaria no caso 3 sem provar
 * nada — a tela poderia estar mostrando o valor que ela mesma calculou.
 */
function servidor({
  escritas = [],
  recusaPick,
  recusaRelease,
  romaneios = [] as unknown[],
  itensIniciais = [
    linha(),
    linha({ lineNumber: 2, quantity: 12, quantityReleased: 12, pendingPick: 12 }),
  ],
}: {
  escritas?: Escrita[]
  recusaPick?: () => Response
  recusaRelease?: () => Response
  romaneios?: unknown[]
  itensIniciais?: Record<string, unknown>[]
} = {}) {
  let itens = itensIniciais

  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()

    if (url.includes('/api/picking-queue')) return json(FILA)
    if (url.includes('/api/deliveries')) {
      if (metodo === 'GET') return json({ rows: romaneios, total: romaneios.length })
      return json({ id: 'rom-1', number: '1001', orderId: PED, status: 'open', items: [] }, 201)
    }
    if (url.includes('/fulfillment')) return json(situacao(itens))

    if (url.includes('/pick')) {
      const cru = (await req?.text()) ?? ''
      escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : undefined })
      if (recusaPick) return recusaPick()
      itens = itens.map((i) =>
        i.lineNumber === 1
          ? linha({
              quantityPicked: 4,
              physicalState: 'picked',
              pendingPick: 0,
              pendingDelivery: 4,
            })
          : i,
      )
      return json({
        id: 'fato-1',
        kind: 'pick',
        quantity: 4,
        locationId: null,
        deliveryId: null,
        stockMovementId: 'mov-1',
        occurredAt: new Date().toISOString(),
        item: itens[0],
      })
    }

    if (url.includes('/release')) {
      const cru = (await req?.text()) ?? ''
      escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : undefined })
      if (recusaRelease) return recusaRelease()
      return json({
        id: 'fato-2',
        kind: 'release',
        quantity: 1,
        locationId: null,
        deliveryId: null,
        stockMovementId: null,
        occurredAt: new Date().toISOString(),
        item: linha(),
      })
    }

    return json({ rows: [], total: 0 })
  }
}

describe('o quadro de cargas', () => {
  it('agrupa a fila por pedido e mostra a data mais antiga da carga', async () => {
    renderRoute('/vendas/cargas', servidor())

    const carga = await screen.findByTestId('carga-21646')
    // Duas linhas do mesmo pedido viraram UMA carga.
    expect(within(carga).getByText(/2 linhas/)).toBeInTheDocument()
    // 4 + 12 — a carga soma o que ainda tem de sair do galpão.
    expect(within(carga).getByText(/16 a separar/)).toBeInTheDocument()
    // A data é a da linha 2 (18/08), não a da primeira que chegou.
    expect(within(carga).getByText('18/08/2026')).toBeInTheDocument()

    // A carga sem data nenhuma diz isso, em vez de mostrar campo vazio.
    const semData = screen.getByTestId('carga-21653')
    expect(within(semData).getByText('sem data')).toBeInTheDocument()
  })

  it('abre a situação do pedido ao escolher a carga', async () => {
    const { user } = renderRoute('/vendas/cargas', servidor())

    await user.click(await screen.findByTestId('carga-21646'))

    // A linha traz as TRÊS quantidades, não só o estado: é o "6 de 10" que quem
    // opera precisa, e o degrau sozinho o esconderia.
    const primeira = await screen.findByTestId('linha-1')
    expect(within(primeira).getByTestId('estado-1')).toHaveTextContent('Liberado')
    expect(within(primeira).getByText('(do ambiente)')).toBeInTheDocument()
  })

  it('separar manda a quantidade pendente e a tela reflete o novo estado', async () => {
    const escritas: Escrita[] = []
    const { user } = renderRoute('/vendas/cargas', servidor({ escritas }))

    await user.click(await screen.findByTestId('carga-21646'))
    await user.click(await screen.findByTestId('separar-1'))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]?.url).toContain('/api/orders/ped-2001/items/1/pick')
    // A quantidade proposta é o pendente inteiro — o caso normal é a cozinha
    // sair de uma vez.
    expect(escritas[0]?.corpo).toMatchObject({ quantity: 4 })

    // E o degrau ANDA na tela, sem F5.
    await waitFor(() =>
      expect(within(screen.getByTestId('linha-1')).getByTestId('estado-1')).toHaveTextContent(
        'Separado',
      ),
    )
  })

  it('a recusa da escada aparece com a frase do servidor', async () => {
    const { user } = renderRoute(
      '/vendas/cargas',
      servidor({
        recusaPick: () =>
          problema(
            'urn:cabinet:erro:separacao-sem-liberacao',
            'Liberado para separação: 0. Libere antes de separar 4.',
          ),
      }),
    )

    await user.click(await screen.findByTestId('carga-21646'))
    await user.click(await screen.findByTestId('separar-1'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Libere antes de separar 4/)
  })

  it('403 de papel na liberação sai em voz alta, não como botão escondido', async () => {
    const { user } = renderRoute(
      '/vendas/cargas',
      servidor({
        itensIniciais: [
          linha({
            quantityReleased: 0,
            pendingRelease: 4,
            pendingPick: 0,
            physicalState: 'pending',
          }),
        ],
        recusaRelease: () =>
          problema(
            'urn:cabinet:erro:papel-insuficiente',
            'O papel deste vínculo não libera separação e entrega.',
            403,
          ),
      }),
    )

    await user.click(await screen.findByTestId('carga-21646'))
    // O botão EXISTE: a sessão não publica as permissões do vínculo, e esconder
    // exigiria adivinhar — adivinhar para baixo tira a ação de quem a tem.
    await user.click(await screen.findByTestId('liberar-1'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não libera separação/)
  })

  it('sem romaneio aberto, a linha separada diz o que falta em vez de oferecer botão', async () => {
    const { user } = renderRoute(
      '/vendas/cargas',
      servidor({
        itensIniciais: [
          linha({ quantityPicked: 4, pendingPick: 0, pendingDelivery: 4, physicalState: 'picked' }),
        ],
      }),
    )

    await user.click(await screen.findByTestId('carga-21646'))

    expect(await screen.findByText(/abra um romaneio para entregar/)).toBeInTheDocument()
    expect(screen.queryByTestId('entregar-1')).not.toBeInTheDocument()
  })
})
