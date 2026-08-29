import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A ABA SERVIÇOS DO ORÇAMENTO (F7 — web#381).
 *
 * ## O que já estava pago, e o que faltava
 *
 * O contrato publica a seção inteira — `/api/services` (cadastro),
 * `QuoteServiceItemDto`/`WriteRequest` (a linha) e `serviceItems` no documento —
 * e o servidor falso a serve com estado de verdade: guarda as linhas, congela o
 * percentual do eletricista na gravação e soma a aba no `totalCents`. **O que
 * não existia era o front inteiro**, e a ausência tinha dois sintomas de
 * tamanhos diferentes:
 *
 * 1. **Destruição de dado, silenciosa.** `paraEscrita` não devolvia
 *    `serviceItems`, e o `PUT` do contrato é INTEGRAL: abrir um orçamento com
 *    instalação e clicar em `Gravar` sem editar nada APAGAVA a aba, com 200. É a
 *    mesma classe do defeito que a web#307 mediu no bloco Pagamento — o Zod
 *    remove o que o schema não declara — e o pedido de venda já a contornava
 *    declarando a coleção sem editá-la.
 * 2. **Total errado na cara do operador.** O rodapé somava só os produtos,
 *    enquanto o servidor somava as duas coleções. No legado a instalação é linha
 *    de `VendaServico`; um documento de R$ 1.000 em luminárias e R$ 480 de
 *    instalação fechava mostrando R$ 1.000 — e o combo de parcelamento decidia
 *    quais condições cabiam sobre o número menor.
 *
 * A aba não estava "sem captura": ela estava sem GRADE. A moldura de
 * `AbasSemCaptura` dizia ao operador que não havia o que mostrar, num documento
 * cujo total já dependia dela.
 */

const ID = '7c5b2a10-8f3e-4d21-9c6b-2f1a4e8d0b33'
const SERVICO_INSTALACAO = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d'
const SERVICO_PROJETO = '1f2e3d4c-5b6a-4978-8695-a4b3c2d1e0f9'

/** A linha da aba como o servidor a devolve: 4 × R$ 120,00 = R$ 480,00. */
const SERVICO_DO_DOCUMENTO = {
  lineNumber: 1,
  environmentCode: null,
  serviceId: SERVICO_INSTALACAO,
  description: 'INSTALAÇÃO DE LUMINÁRIA',
  quantity: 4,
  unitPriceCents: 12000,
  discountPercent: 0,
  electricianPercent: 400000,
  // Carimbo do servidor: 40% de R$ 480,00. A tela mostra, não recalcula.
  electricianAmountCents: 19200,
  totalCents: 48000,
}

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
  // R$ 1.000,00 de produto + R$ 480,00 de serviço — é o servidor somando as
  // duas coleções, como o contrato manda.
  totalCents: 148000,
  discountMode: 'product',
  discountPercent: 0,
  environments: [],
  items: [
    {
      lineNumber: 1,
      environmentCode: null,
      variantId: null,
      description: 'PENDENTE REDONDO',
      finish: null,
      size: null,
      quantity: 1,
      unit: 'PC',
      unitPriceCents: 100000,
      discountPercent: 0,
      supplierId: null,
      supplierName: 'VERTZ',
      supplierCode: 'V-771',
      supplierDescription: 'PENDENTE REDONDO',
      productGroup: null,
      pieceType: null,
    },
  ],
  serviceItems: [SERVICO_DO_DOCUMENTO],
  paymentTermId: null,
  paymentTermName: null,
  paymentInstallments: [],
}

/** O cadastro de `/api/services` — o que a busca da aba oferece. */
const SERVICOS = [
  {
    id: SERVICO_INSTALACAO,
    code: 'INST-LUM',
    description: 'INSTALAÇÃO DE LUMINÁRIA',
    priceCents: 12000,
    electricianPercent: 400000,
    type: 'INSTALACAO',
    installationMinutes: 45,
    nfseCode: '7.02',
    productGroup: 'SERVIÇOS',
    priceLocked: false,
    delivery: false,
    active: true,
  },
  {
    id: SERVICO_PROJETO,
    code: 'PROJ-LUM',
    description: 'PROJETO LUMINOTÉCNICO',
    priceCents: 95000,
    electricianPercent: 0,
    type: 'PROJETO',
    installationMinutes: null,
    nfseCode: '7.01',
    productGroup: 'SERVIÇOS',
    // `Serv_NaoAtualizarValor`: orçado caso a caso, a linha não puxa o preço.
    priceLocked: true,
    delivery: false,
    active: true,
  },
]

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
 * Servidor falso, e não mock de módulo — mesma decisão do resto da pasta: verbo
 * e corpo só existem no `Request`, e um stub que casasse por caminho deixaria o
 * `PUT` cair na resposta do `GET`.
 */
function servidor({
  escritas = [],
  detalhe = DETALHE,
  servicos = SERVICOS,
}: { escritas?: Escrita[]; detalhe?: Record<string, unknown>; servicos?: unknown[] } = {}) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/installment-policy')) {
      return json({ minTotalToInstallCents: 10000, minInstallmentCents: 5000, maxInstallments: 6 })
    }
    if (url.includes('/api/payment-terms')) return json({ rows: [], total: 0 })
    if (url.includes('/api/services')) return json({ rows: servicos, total: servicos.length })

    if (url.includes('/api/quotes')) {
      if (metodo !== 'GET') {
        const cru = await req?.text()
        escritas.push({ url, metodo, corpo: cru ? JSON.parse(cru) : null })
        return json(detalhe)
      }
      if (url.includes(ID)) return json(detalhe)
      return json({ rows: [], total: 0 })
    }
    return undefined
  }
}

/** O documento aberto — o Nº Pasta é o sinal de que a folha hidratou. */
async function abrirDocumento(fetchStub: unknown) {
  const r = renderRoute(`/vendas/orcamentos/${ID}`, fetchStub as never)
  await waitFor(() => expect(screen.getByLabelText(/Nº Pasta/i)).toHaveValue('P-88'))
  return r
}

/** A aba, aberta pelo clique — as abas do Radix desmontam o conteúdo inativo. */
async function abrirAbaServicos(user: { click: (el: Element) => Promise<void> }) {
  await user.click(screen.getByRole('tab', { name: 'Serviços' }))
  return await screen.findByLabelText('Descrição linha 1')
}

describe('a aba existe, e é grade — não moldura à espera de print', () => {
  it('mostra a linha do documento com o valor e o carimbo do eletricista', async () => {
    const { user } = await abrirDocumento(servidor())
    await abrirAbaServicos(user)

    expect(screen.getByLabelText('Descrição linha 1')).toHaveValue('INSTALAÇÃO DE LUMINÁRIA')
    expect(screen.getByLabelText('Quant. linha 1')).toHaveValue('4')
    // 4 × R$ 120,00 — a mesma conta da grade de itens, uma fórmula só. Aparece
    // duas vezes de propósito: na célula da linha e no pé da aba.
    expect(screen.getAllByText('R$ 480,00')).toHaveLength(2)
    expect(screen.getByLabelText('Total dos Serviços')).toHaveTextContent('R$ 480,00')
    // O que o instalador recebe vem do SERVIDOR. A tela não refaz a conta: o
    // número vira pagamento de gente, e um arredondamento por cliente sobre ele
    // é diferença que ninguém procura depois.
    expect(screen.getByText('R$ 192,00')).toBeInTheDocument()
  })

  it('some da lista de abas sem captura', async () => {
    const { user } = await abrirDocumento(servidor())
    await user.click(screen.getByRole('tab', { name: 'Serviços' }))

    expect(screen.queryByText(/Aba Serviços não capturada/i)).not.toBeInTheDocument()
  })
})

describe('o Gravar não pode apagar a aba Serviços', () => {
  it('devolve as linhas do documento aberto, sem edição nenhuma', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    // A medição da PR: contra a `main` de antes, `serviceItems` era `undefined`
    // no corpo — e o `PUT` integral apagava a aba de um documento que ninguém
    // editou, respondendo 200.
    const linhas = escritas[0]?.corpo?.serviceItems as Record<string, unknown>[]
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      lineNumber: 1,
      serviceId: SERVICO_INSTALACAO,
      description: 'INSTALAÇÃO DE LUMINÁRIA',
      quantity: 4,
      unitPriceCents: 12000,
      discountPercent: 0,
      electricianPercent: 400000,
    })
  })

  it('não sobe o que é conta do servidor', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    const linha = (escritas[0]?.corpo?.serviceItems as Record<string, unknown>[])[0] ?? {}
    // `QuoteServiceItemWriteRequest` não tem os dois: quem os calcula é o
    // servidor, e o `electricianAmountCents` vira pagamento de instalador.
    expect(linha).not.toHaveProperty('totalCents')
    expect(linha).not.toHaveProperty('electricianAmountCents')
  })
})

describe('o total do documento soma as DUAS coleções', () => {
  it('fecha em R$ 1.480,00 — produto mais serviço', async () => {
    const { user } = await abrirDocumento(servidor())
    await user.click(screen.getByRole('tab', { name: 'Principal' }))

    // R$ 1.000,00 de pendente + R$ 480,00 de instalação, que é o `totalCents`
    // que o próprio servidor devolveu. Antes desta PR o fecho mostrava
    // R$ 1.000,00 e o documento fechava por outro número.
    await waitFor(() => expect(screen.getByLabelText('Total')).toHaveTextContent('R$ 1.480,00'))
    expect(screen.getByLabelText('SubTotal')).toHaveTextContent('R$ 1.480,00')
  })
})

describe('a linha nasce do cadastro, e congela o que o cadastro diz hoje', () => {
  it('a busca traz descrição e preço, e o Gravar leva a linha nova', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))
    await abrirAbaServicos(user)

    await user.click(screen.getByRole('button', { name: /Serviço/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByText('INSTALAÇÃO DE LUMINÁRIA'))
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Descrição linha 2')).toHaveValue('INSTALAÇÃO DE LUMINÁRIA'),
    )
    expect(screen.getByLabelText('Valor Unit. linha 2')).toHaveValue('120,00')

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    const linhas = escritas[0]?.corpo?.serviceItems as Record<string, unknown>[]
    expect(linhas).toHaveLength(2)
    expect(linhas[1]).toMatchObject({
      lineNumber: 2,
      serviceId: SERVICO_INSTALACAO,
      description: 'INSTALAÇÃO DE LUMINÁRIA',
      unitPriceCents: 12000,
    })
    // `null` e não o percentual da tela: null pede ao SERVIDOR o percentual
    // vigente na gravação. Copiar os 40% aqui congelaria o número que estava na
    // tela quando a busca abriu — que é justamente o que o contrato descreve
    // como o erro que o campo nulável evita.
    expect(linhas[1]?.electricianPercent).toBeNull()
  })

  it('serviço de preço travado NÃO puxa o valor do cadastro', async () => {
    const { user } = await abrirDocumento(servidor())
    await abrirAbaServicos(user)

    await user.click(screen.getByRole('button', { name: /Serviço/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByText('PROJETO LUMINOTÉCNICO'))
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Descrição linha 2')).toHaveValue('PROJETO LUMINOTÉCNICO'),
    )
    // `priceLocked` é `Serv_NaoAtualizarValor`: quem digita o valor é o
    // operador. Trazer os R$ 950,00 proporia um número que o cadastro diz não
    // valer para esta obra.
    expect(screen.getByLabelText('Valor Unit. linha 2')).toHaveValue('')
  })

  it('descrição avulsa abre linha sem serviço do cadastro', async () => {
    const escritas: Escrita[] = []
    const { user } = await abrirDocumento(servidor({ escritas }))
    await abrirAbaServicos(user)

    await user.click(screen.getByRole('button', { name: /Descrição avulsa/ }))
    await screen.findByLabelText('Descrição linha 2')

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))
    await waitFor(() => expect(escritas.length).toBe(1))

    const linhas = escritas[0]?.corpo?.serviceItems as Record<string, unknown>[]
    // O contrato permite a linha sem cadastro (`serviceId: null`), e o legado a
    // usa: `ose_descricao` existe ao lado do `Sev_cod`.
    expect(linhas[1]?.serviceId).toBeNull()
  })
})
