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
 * A REVISÃO DO ORÇAMENTO NA TELA — o gesto que resolve os dois orçamentos do
 * mesmo dia.
 *
 * `POST /api/quotes/{id}/revise` entrou no contrato pela web#317 e o backend a
 * serve desde a api#145. `useRevisarOrcamento` existe em `quotes-api.ts` desde
 * então, o mock recusa em voz alta nos dois 409 — e **nenhum arquivo fora do
 * codegen a chamava**. Função sem chamador não está medida: o hook passava
 * verde porque ninguém o exercitava por uma tela.
 *
 * ## O que esta bateria mede, e por que cada caso existe
 *
 * 1. **A revisão não manda corpo, e o sucesso leva à REVISÃO nova.** O
 *    documento é copiado pelo servidor; propor campos daqui criaria uma segunda
 *    autoridade sobre o que foi apresentado ao cliente. E revisar existe porque
 *    ALGO mudou — o que mudou ainda não está lá dentro, então o operador
 *    precisa cair na folha nova, não voltar para a lista de onde veio.
 * 2. **Orçamento cancelado não vira requisição.** A situação já está na linha:
 *    gastar a escrita para receber 409 transforma erro conhecido em erro do
 *    operador. Revisar o que foi retirado da mesa é ressuscitar por outro nome.
 * 3. **`orcamento-ja-revisado` muda a FORMA da caixa.** Some o botão que acabou
 *    de falhar — repetir nunca vai funcionar, porque a próxima revisão sai da
 *    MAIS RECENTE — e entra a frase que diz onde procurá-la. Não é um link: o
 *    contrato não publica `revisionOfId` na whitelist de `filters` de
 *    `/api/quotes` (medido), então o front não tem como pedir "a revisão
 *    deste". Prometer "abrir a revisão" e cair na lista inteira seria pior que
 *    a frase.
 * 4. **O 409 que a tela NÃO conhece cai na frase do servidor** e mantém o
 *    botão: a tela não sabe que aquilo é definitivo, e tirar o botão afirmaria
 *    o que ela não mediu.
 * 5. **A revisão aparece na LISTAGEM, colada ao número.** É onde o problema
 *    nasce: quem lê a lista contava dois negócios onde havia um. Original não
 *    imprime marca nenhuma — `rev. 1` em toda linha seria ruído em cima do caso
 *    comum.
 * 6. **A folha da revisão diz de qual documento ela veio, e leva até lá.** A
 *    pergunta que segue "esta é a revisão 2" é sempre "e o que mudou da 1 para
 *    cá?", e a única resposta possível é abrir a anterior.
 */

const ORIGINAL = '7c1d9e83-4b06-4f21-8a5e-3d92f0c7b415'
const CANCELADO = 'e28b5a17-90c3-4d6f-b1a4-6f38c2e51d07'
const REVISAO = 'a4f70b62-13d8-4e59-9c02-8b7e1a4d63f9'

/**
 * O botão DENTRO da caixa, e o matcher é EXATO de propósito.
 *
 * A ação da barra de seleção se chama `Revisar` e a confirmação se chama
 * `Revisar orçamento`: com matcher parcial, `Revisar` casa com os dois, e o
 * `queryByRole(...).not.toBeInTheDocument()` dos casos 2 e 3 passaria por o
 * modal esconder a barra da árvore de acessibilidade — não por o botão ter
 * sumido. Verde pelo motivo errado é verde que sobrevive à regressão.
 */
const CONFIRMAR = 'Revisar orçamento'

interface Escrita {
  url: string
  metodo: string
  /** `''` = requisição sem corpo. Corpo vazio seria `'{}'`, que é outra coisa. */
  cru: string
}

const LINHA_ORIGINAL = {
  id: ORIGINAL,
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
  ...LINHA_ORIGINAL,
  id: CANCELADO,
  number: '21654',
  customerName: 'ROMULO GERMANO',
  status: 'cancelled',
}

/** A linha da REVISÃO na listagem — é ela que carrega a marca no número. */
const LINHA_REVISADA = {
  ...LINHA_ORIGINAL,
  id: REVISAO,
  number: '21699',
  customerName: 'SHEILA E VICENTE',
  revision: 2,
  revisionOfId: ORIGINAL,
}

/** A folha da revisão — o documento para onde a tela navega no sucesso. */
const DETALHE_REVISAO = {
  ...LINHA_REVISADA,
  folderNumber: 'R-207',
  closedAt: null,
  cancelledAt: null,
  cancelReasonId: null,
  cancelReasonName: null,
  cancelNote: null,
  revisionOfNumber: LINHA_ORIGINAL.number,
  salespersonId: null,
  salespersonName: null,
  professionalId: null,
  professionalName: null,
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

    if (url.includes('/revise') && metodo === 'POST') {
      escritas.push({ url, metodo, cru: (await req?.text()) ?? '' })
      return recusa ? recusa() : json(DETALHE_REVISAO, 201)
    }

    if (url.includes('/api/quotes')) {
      // A folha da revisão, quando a navegação do sucesso chega nela.
      if (url.includes(REVISAO)) return json(DETALHE_REVISAO)
      return json({ rows: [LINHA_ORIGINAL, LINHA_CANCELADA, LINHA_REVISADA], total: 3 })
    }
    return undefined
  }
}

/**
 * Abre a listagem, marca a linha do orçamento e pede a revisão.
 *
 * A espera da primeira linha leva folga explícita porque o caso de ABERTURA do
 * arquivo paga o shell inteiro — rota, sessão, vínculos, listas de apoio e a
 * consulta da listagem — antes de existir uma célula para clicar. Com o padrão
 * de 1 s o vermelho que aparece é `Unable to find text`, que acusa a tela e não
 * a máquina.
 */
async function pedirRevisao(stub: unknown, cliente: string) {
  const r = renderRoute('/vendas/orcamentos', stub as never)
  await screen.findByText(cliente, {}, { timeout: 10_000 })
  await acaoNaLinha(r.user, cliente, /^Revisar$/i)
  return r
}

describe('revisar o orçamento', () => {
  it('chama o caminho próprio SEM corpo e leva à revisão nova', async () => {
    const escritas: Escrita[] = []
    const { user } = await pedirRevisao(servidor({ escritas }), 'ANDRÉ BATALHA')

    await user.click(await screen.findByRole('button', { name: CONFIRMAR }))

    await waitFor(() => expect(escritas.length).toBe(1))
    expect(escritas[0]?.metodo).toBe('POST')
    expect(escritas[0]?.url).toContain(`/api/quotes/${ORIGINAL}/revise`)
    // Revisar é COPIAR, e quem copia é o servidor. Corpo aqui seria a tela
    // propondo o documento que o cliente já viu.
    expect(escritas[0]?.cru).toBe('')

    // A folha da REVISÃO montou — é o `Nº Pasta` dela que prova que a navegação
    // chegou no documento novo, e não numa listagem qualquer.
    await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('R-207'))
    // Teto PRÓPRIO, e não o de 15 s do arquivo: este é o único caso que monta
    // DUAS telas inteiras — a listagem e, depois da revisão, a folha do
    // orçamento com abas, blocos e o bloco de pagamento. Os outros casos ficam
    // no padrão de propósito: eles param na caixa de confirmação, e rebaixar o
    // teto do arquivo inteiro esconderia lentidão de verdade neles.
  }, 45_000)

  it('orçamento cancelado não vira requisição', async () => {
    const escritas: Escrita[] = []
    await pedirRevisao(servidor({ escritas }), 'ROMULO GERMANO')

    expect(await screen.findByText(/está cancelado/i)).toBeInTheDocument()
    // Não há o que confirmar: a caixa explica e oferece só a saída.
    expect(screen.queryByRole('button', { name: CONFIRMAR })).not.toBeInTheDocument()
    expect(escritas.length).toBe(0)
  })

  it('o já-revisado tira o botão e diz onde a revisão está', async () => {
    const { user } = await pedirRevisao(
      servidor({
        recusa: () =>
          problema(
            'urn:cabinet:erro:orcamento-ja-revisado',
            'Este orçamento já tem revisão. Revise a mais recente.',
          ),
      }),
      'ANDRÉ BATALHA',
    )

    await user.click(await screen.findByRole('button', { name: CONFIRMAR }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/já tem uma revisão/i)
    // Repetir o gesto nunca vai funcionar: a próxima sai da mais recente.
    expect(screen.queryByRole('button', { name: CONFIRMAR })).not.toBeInTheDocument()
    // A saída é uma FRASE, e não um link: `revisionOfId` está fora do `filters`
    // de `/api/quotes`, então não há consulta que devolva "a revisão deste".
    expect(await screen.findByText(/com número maior que/i)).toBeInTheDocument()
  })

  it('o 409 que a tela não conhece cai na frase do servidor, e o botão fica', async () => {
    const { user } = await pedirRevisao(
      servidor({
        recusa: () => problema('about:blank', 'Orçamento fora da janela de revisão.'),
      }),
      'ANDRÉ BATALHA',
    )

    await user.click(await screen.findByRole('button', { name: CONFIRMAR }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/fora da janela de revisão/i)
    // A tela não sabe que este é definitivo — tirar o botão afirmaria o que ela
    // não mediu.
    expect(screen.getByRole('button', { name: CONFIRMAR })).toBeInTheDocument()
  })
})

describe('a revisão aparece onde o problema nasce', () => {
  it('marca a linha revisada na listagem e deixa o original limpo', async () => {
    renderRoute('/vendas/orcamentos', servidor() as never)
    await screen.findByText('SHEILA E VICENTE', {}, { timeout: 10_000 })

    // A marca vive colada ao número: é o par "dois documentos, um negócio" que
    // ela desfaz, e ele só é visível na LISTA.
    expect(screen.getByText(/rev\. 2/i)).toBeInTheDocument()
    // Uma só — o original e o cancelado são revisão 1, e revisão 1 não imprime
    // nada. `rev. 1` em toda linha seria ruído em cima do caso comum.
    expect(screen.getAllByText(/rev\. \d+/i)).toHaveLength(1)
  }, 30_000)

  it('a folha da revisão diz de qual orçamento ela veio, e leva até lá', async () => {
    renderRoute(`/vendas/orcamentos/${REVISAO}`, servidor() as never)

    // O número do anterior vem RESOLVIDO pelo servidor (`revisionOfNumber`) —
    // a folha o mostra sem uma segunda requisição.
    const elo = await screen.findByRole('link', { name: '21653' }, { timeout: 10_000 })
    expect(elo).toHaveAttribute('href', `/vendas/orcamentos/${ORIGINAL}`)
    // A asserção é sobre a MESMA frase, e não sobre os dois textos soltos na
    // página: "Revisão 2" em algum canto e um link para 21653 em outro leriam
    // igual num `getByText` e diriam coisas diferentes na tela. O que esta
    // folha promete é a frase inteira — esta é a revisão 2, e ela substitui
    // AQUELE documento.
    expect(elo.closest('p')?.textContent).toMatch(/Revisão 2.*substitui o orçamento.*21653/i)
  }, 45_000)
})
