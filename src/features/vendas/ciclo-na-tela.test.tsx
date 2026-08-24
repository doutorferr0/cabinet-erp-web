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
 * O CICLO DO PEDIDO NA TELA — concluir, retorno da demonstração, transferência
 * da indicação e o motivo do cancelamento.
 *
 * As cinco operações estão no contrato desde a web#317/#318 e o backend as
 * serve desde a api#145. O que faltava era o gesto: `pedidos-venda-api.ts`
 * consumia SEIS das dez operações, e o comentário do arquivo ainda dizia que as
 * outras quatro respondiam 501 — o fato mudou e o código não.
 *
 * ## O que esta bateria mede, e por que cada caso existe
 *
 * 1. **O corpo do cancelamento é AUSÊNCIA quando ninguém escolheu motivo.**
 *    `{reasonId: null, note: null}` passa igual hoje e afirma "não teve motivo"
 *    onde a verdade é silêncio. É o caso mais fácil de escrever errado e o mais
 *    difícil de ver depois: os dois respondem 200.
 * 2. **Os dois 409 do `conclude` pedem coisas OPOSTAS.**
 *    `transicao-invalida` diz "desista" e `demonstracao-em-aberto` diz "faça
 *    isto antes". Traduzidos pela mesma frase, o operador tenta de novo onde
 *    nunca vai funcionar e desiste onde faltava um clique. O discriminador é o
 *    `type`, nunca o status.
 * 3. **A demonstração com peça fora oferece a saída.** O botão de retorno só
 *    aparece onde ele resolve alguma coisa.
 * 4. **A transferência manda o id, não o nome** — e a nota viaja, porque é a
 *    única coisa que responde "por que esta venda mudou de dono?".
 */

const ID = '5a1c8e70-3b2d-4f61-8e93-1c7d4a9f0e22'
const PROFISSIONAL = '7c3d9a10-4e5f-4a21-b8c9-0d1e2f3a4b5c'

interface Escrita {
  url: string
  metodo: string
  /** `undefined` = requisição SEM corpo, que é diferente de corpo vazio. */
  corpo: unknown
  cru: string
}

const PEDIDO = {
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
  environments: [],
  items: [],
  serviceItems: [],
  paymentTermId: null,
  paymentTermName: null,
  installments: [],
}

const PARCEIRO = {
  id: PROFISSIONAL,
  code: '4410',
  legalName: 'MARINA COSTA ARQUITETURA',
  tradeName: 'MARINA COSTA',
  document: '12345678000190',
  isCustomer: false,
  isSupplier: false,
  isProfessional: true,
  active: true,
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
  pedido = PEDIDO,
  historico = [] as unknown[],
  recusa,
}: {
  escritas?: Escrita[]
  pedido?: Record<string, unknown>
  historico?: unknown[]
  recusa?: { caminho: string; resposta: () => Response }
} = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/installment-policy')) return json({ minInstallmentCents: 0 })
    if (url.includes('/api/payment-terms')) return json({ rows: [], total: 0 })
    if (url.includes('/api/partners')) return json({ rows: [PARCEIRO], total: 1 })

    if (url.includes('/professional-history')) {
      return json({ rows: historico, total: historico.length })
    }

    if (url.includes('/api/orders')) {
      if (metodo !== 'GET') {
        const cru = (await req?.text()) ?? ''
        escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : undefined, cru })
        if (recusa && url.includes(recusa.caminho)) return recusa.resposta()
        return json(pedido)
      }
      if (url.includes(ID)) return json(pedido)
      return json({ rows: [pedido], total: 1 })
    }
    return undefined
  }
}

/** A folha carregada — o Nº Pasta preenchido é o sinal de que o documento montou. */
async function abrirDocumento(stub: unknown) {
  const r = renderRoute(`/vendas/pedidos/${ID}`, stub as never)
  await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-104'))
  return r
}

describe('concluir o pedido', () => {
  it('chama o caminho próprio, e não um PUT com a situação trocada', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Concluir$/i }))
    await user.click(screen.getByRole('button', { name: /Concluir pedido/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.metodo).toBe('POST')
    expect(escritas[0]?.url).toContain(`/api/orders/${ID}/conclude`)
    // Transição não tem parâmetro: quem decide se ela pode acontecer é o
    // servidor, e mandar corpo aqui seria propor estado pelo cliente.
    expect(escritas[0]?.cru).toBe('')
  })

  it('a demonstração em aberto diz o que FAZER; a transição inválida não', async () => {
    const { user } = await abrirDocumento(
      servidor({
        recusa: {
          caminho: '/conclude',
          resposta: () =>
            problema(
              'urn:cabinet:erro:demonstracao-em-aberto',
              'A peça da demonstração ainda não voltou.',
            ),
        },
      }),
    )

    await user.click(screen.getByRole('button', { name: /^Concluir$/i }))
    await user.click(screen.getByRole('button', { name: /Concluir pedido/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/Registre o retorno primeiro/i)
    // O diálogo continua aberto: fechá-lo na recusa esconderia a frase junto.
    expect(screen.getByRole('button', { name: /Concluir pedido/i })).toBeInTheDocument()
  })

  it('a transição inválida manda recarregar, não tentar de novo', async () => {
    const { user } = await abrirDocumento(
      servidor({
        recusa: {
          caminho: '/conclude',
          resposta: () =>
            problema('urn:cabinet:erro:transicao-invalida', 'O pedido já está concluído.'),
        },
      }),
    )

    await user.click(screen.getByRole('button', { name: /^Concluir$/i }))
    await user.click(screen.getByRole('button', { name: /Concluir pedido/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/não volta atrás/i)
    expect(alerta).not.toHaveTextContent(/Registre o retorno/i)
  })

  it('não é oferecido em CONSULTA — a tela promete leitura', async () => {
    // A folha aberta em `?modo=consulta` não edita. Concluir não passa pelo
    // `PUT`, mas oferecer uma transição irreversível numa tela que se anuncia
    // como consulta é a tela mentindo sobre o que ela é.
    renderRoute(`/vendas/pedidos/${ID}?modo=consulta`, servidor() as never)
    await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-104'))

    expect(screen.queryByRole('button', { name: /^Concluir$/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Transferir profissional/i }),
    ).not.toBeInTheDocument()
    // O histórico fica: é leitura, que é o que a consulta promete.
    expect(screen.getByRole('button', { name: /Histórico da indicação/i })).toBeInTheDocument()
  })

  it('some no documento fechado — as duas situações são terminais', async () => {
    await abrirDocumento(servidor({ pedido: { ...PEDIDO, status: 'concluded' } }))

    expect(screen.queryByRole('button', { name: /^Concluir$/i })).not.toBeInTheDocument()
    // O histórico continua: "de quem era esta venda?" é pergunta de depois.
    expect(screen.getByRole('button', { name: /Histórico da indicação/i })).toBeInTheDocument()
  })
})

describe('retorno da demonstração', () => {
  const DEMO = { ...PEDIDO, type: 'demo', demoDueDate: '2026-09-10', demoReturnedAt: null }

  it('é oferecido só quando a peça está fora', async () => {
    const { user } = await abrirDocumento(servidor({ pedido: DEMO }))
    expect(screen.getByRole('button', { name: /^Registrar retorno$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Registrar retorno$/i }))
    // Confirmação antes: o carimbo é a data de hoje, e não se desfaz.
    expect(await screen.findByText(/A peça voltou\?/i)).toBeInTheDocument()
  })

  it('não aparece em VENDA — não há o que devolver', async () => {
    await abrirDocumento(servidor({ pedido: PEDIDO }))
    expect(screen.queryByRole('button', { name: /Registrar retorno/i })).not.toBeInTheDocument()
  })

  it('não aparece na demonstração já devolvida', async () => {
    await abrirDocumento(servidor({ pedido: { ...DEMO, demoReturnedAt: '2026-09-02' } }))
    expect(screen.queryByRole('button', { name: /Registrar retorno/i })).not.toBeInTheDocument()
  })

  it('chama demo-return no caminho próprio', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ pedido: DEMO, escritas }))

    await user.click(screen.getByRole('button', { name: /Registrar retorno/i }))
    await user.click(screen.getByRole('button', { name: /^Registrar retorno$/i, hidden: false }))

    await waitFor(() => expect(escritas.length).toBeGreaterThan(0))
    expect(escritas[0]?.url).toContain(`/api/orders/${ID}/demo-return`)
    expect(escritas[0]?.metodo).toBe('POST')
  })
})

describe('transferência da indicação', () => {
  it('manda o ID do profissional e a nota da troca', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /Transferir profissional/i }))
    await user.click(await screen.findByRole('button', { name: /Escolher…/i }))
    // A busca é marcar-e-confirmar, e o próprio diálogo diz isso: "clique na
    // linha e confirme em Selecionar". Só o clique na linha não escolhe nada.
    await user.click(await screen.findByText('MARINA COSTA ARQUITETURA'))
    await user.click(await screen.findByRole('button', { name: /^Selecionar$/i }))

    const nota = await screen.findByLabelText(/Observação/i)
    await user.type(nota, 'cliente pediu troca')
    await user.click(screen.getByRole('button', { name: /^Transferir$/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    const corpo = escritas[0]?.corpo as Record<string, unknown>
    expect(escritas[0]?.url).toContain(`/api/orders/${ID}/professional`)
    // O ID, e não o nome: dois profissionais homônimos são dois parceiros, e o
    // nome não é chave em lugar nenhum deste sistema.
    expect(corpo.professionalId).toBe(PROFISSIONAL)
    expect(corpo.note).toBe('cliente pediu troca')
  })

  it('não transfere sem escolher para quem', async () => {
    const { user } = await abrirDocumento(servidor())

    await user.click(screen.getByRole('button', { name: /Transferir profissional/i }))
    expect(await screen.findByRole('button', { name: /^Transferir$/i })).toBeDisabled()
  })

  it('o histórico vazio diz que nunca houve troca, e não que falhou', async () => {
    const { user } = await abrirDocumento(servidor({ historico: [] }))

    await user.click(screen.getByRole('button', { name: /Histórico da indicação/i }))
    expect(await screen.findByText(/nunca foi transferida/i)).toBeInTheDocument()
  })

  it('o histórico mostra a trilha com a nota de cada troca', async () => {
    const { user } = await abrirDocumento(
      servidor({
        historico: [
          {
            id: 'a1',
            professionalId: PROFISSIONAL,
            professionalName: 'MARINA COSTA ARQUITETURA',
            startedAt: '2026-08-12',
            endedAt: null,
            changedByEmployeeId: null,
            note: 'cliente pediu troca',
          },
        ],
      }),
    )

    await user.click(screen.getByRole('button', { name: /Histórico da indicação/i }))
    expect(await screen.findByText('MARINA COSTA ARQUITETURA')).toBeInTheDocument()
    expect(screen.getByText('cliente pediu troca')).toBeInTheDocument()
  })
})

describe('o motivo do cancelamento', () => {
  /** A listagem é quem cancela: o `Cancelar` mora na barra de seleção da grade. */
  async function abrirCancelamento(stub: unknown) {
    const r = renderRoute('/vendas/pedidos', stub as never)
    await acaoNaLinha(r.user, '30991', /^Cancelar$/i)
    return r
  }

  it('sem escolha nenhuma, a requisição vai SEM CORPO', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirCancelamento(servidor({ escritas }))

    // A linha abre em consulta; o cancelamento sai da barra de seleção.
    await user.click(await screen.findByRole('button', { name: /Cancelar pedido de venda/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.url).toContain('/cancel')
    // `{reasonId: null, note: null}` também responderia 200 — e afirmaria "não
    // teve motivo" onde a verdade é que ninguém disse.
    expect(escritas[0]?.cru).toBe('')
  })

  it('o motivo escolhido viaja como reasonId da lista MOTIVO_CANCELAMENTO', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirCancelamento(servidor({ escritas }))

    // O combo de lista de apoio é um botão com popover, não um `<select>`: o
    // texto do vazio é o que o operador vê antes de escolher.
    await user.click(await screen.findByText(/Selecione motivo do cancelamento…/i))
    await user.click(await screen.findByText('PREÇO'))
    await user.type(await screen.findByLabelText(/Observação/i), 'concorrente cobriu')
    await user.click(screen.getByRole('button', { name: /Cancelar pedido de venda/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    const corpo = escritas[0]?.corpo as Record<string, unknown>
    expect(String(corpo.reasonId)).toContain('MOTIVO_CANCELAMENTO')
    expect(corpo.note).toBe('concorrente cobriu')
  })

  it('a observação SEM motivo viaja sozinha', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirCancelamento(servidor({ escritas }))

    await user.type(await screen.findByLabelText(/Observação/i), 'caso fora da lista')
    await user.click(screen.getByRole('button', { name: /Cancelar pedido de venda/i }))

    await waitFor(() => expect(escritas.length).toBe(1))
    const corpo = escritas[0]?.corpo as Record<string, unknown>
    // Quem escreveu a nota disse algo que não cabia na lista. Descartá-la
    // porque o combo ficou vazio jogaria fora a única parte que ninguém mais
    // registra.
    expect(corpo.reasonId).toBeNull()
    expect(corpo.note).toBe('caso fora da lista')
  })
})
