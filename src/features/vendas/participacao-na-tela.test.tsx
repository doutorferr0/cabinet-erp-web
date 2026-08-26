import { ParticipacaoDoPedido } from '@/features/vendas/participacao-do-pedido'
import { instalarServidor, json } from '@/test/servidor'
import {
  renderRoute,
  renderWithQuery,
  respostaLookups,
  respostaSessao,
  respostaVinculos,
} from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A PARTICIPAÇÃO NA TELA, e o `Consultor(a)` que vem dela.
 *
 * O contrato diz que `salespersonId` é o atendente `isPrincipal` da
 * participação — "não um segundo lugar onde se grava". Até aqui a folha
 * contradizia isso de duas maneiras, e as duas passavam verdes:
 *
 * 1. O campo `Consultor(a)` era um combo do lookup **`CARGO`**. O operador
 *    escolhia um cargo, o valor caía em `consultor` (o NOME), e `paraEscrita`
 *    não manda nome nenhum — o servidor resolve o nome pelo id. Gravar e
 *    reabrir devolvia o texto anterior, com 200 e sem aviso.
 * 2. `ListOrderParticipants` estava no contrato, servida pelo backend, e **sem
 *    chamador fora do codegen**: não havia de onde o nome vir.
 *
 * O que esta bateria mede é a ligação entre as duas pontas — que o nome do
 * cabeçalho é o da linha marcada `Principal`, e que o campo não se edita.
 */

const ID = '5a1c8e70-3b2d-4f61-8e93-1c7d4a9f0e22'
const PROFISSIONAL = '7c3d9a10-4e5f-4a21-b8c9-0d1e2f3a4b5c'
const CAMINHO = `/api/orders/${ID}/participants`

const PRINCIPAL = {
  id: 'part-1',
  role: 'attendant',
  employeeId: 'emp-0002',
  employeeName: 'CARLA MENDES',
  partnerId: null,
  partnerName: null,
  personName: 'CARLA MENDES',
  percent: 30000,
  isPrincipal: true,
  validFrom: null,
  tiers: [],
}

const SECUNDARIO = {
  id: 'part-2',
  role: 'attendant',
  employeeId: 'emp-0005',
  employeeName: 'RENATO LIMA',
  partnerId: null,
  partnerName: null,
  personName: 'RENATO LIMA',
  percent: 10000,
  isPrincipal: false,
  validFrom: null,
  tiers: [
    {
      productGroupId: 'g1',
      productGroupName: 'PENDENTES',
      operator: 'lte',
      discountPercent: 100000,
      // 2% — o percentual da FAIXA, que esta tela NÃO abre.
      percent: 20000,
    },
  ],
}

afterEach(() => vi.unstubAllGlobals())

function servidorComLinhas(linhas: unknown[]) {
  return instalarServidor({
    [CAMINHO]: () => json({ rows: linhas, total: linhas.length }),
  })
}

/** O painel pelo título — `Painel` desenha uma `<section>` sem nome acessível. */
async function painelMontado(): Promise<HTMLElement> {
  const titulo = await screen.findByRole('heading', { name: /Participação/i })
  return titulo.closest('[data-slot="painel"]') as HTMLElement
}

describe('o painel de participação', () => {
  it('lista quem participa e marca UM principal por papel', async () => {
    servidorComLinhas([PRINCIPAL, SECUNDARIO])

    renderWithQuery(<ParticipacaoDoPedido pedidoId={ID} />)

    const painel = await painelMontado()
    expect(await within(painel).findByText('CARLA MENDES')).toBeInTheDocument()
    expect(within(painel).getByText('RENATO LIMA')).toBeInTheDocument()
    // A marca não é decoração: é a ligação com o `salespersonId` do cabeçalho.
    expect(within(painel).getAllByText(/^Principal$/i)).toHaveLength(1)
  })

  it('conta as faixas em vez de abri-las — comissão não entra no meio do documento', async () => {
    servidorComLinhas([PRINCIPAL, SECUNDARIO])

    renderWithQuery(<ParticipacaoDoPedido pedidoId={ID} />)

    const painel = await painelMontado()
    expect(await within(painel).findByText(/1 faixa por grupo/i)).toBeInTheDocument()
    // O percentual da FAIXA (2,0000) não aparece: quem o lê é a tela de
    // comissões, onde o cadastro que o originou está do lado.
    expect(within(painel).queryByText(/2,0000/)).not.toBeInTheDocument()
  })

  it('sem ninguém lançado, diz que o caso é legítimo — não some nem parece falha', async () => {
    servidorComLinhas([])

    renderWithQuery(<ParticipacaoDoPedido pedidoId={ID} />)

    const painel = await painelMontado()
    expect(await within(painel).findByText(/Venda de balcão sem consultor/i)).toBeInTheDocument()
  })

  it('pede a participação DESTE pedido', async () => {
    const servidor = servidorComLinhas([PRINCIPAL])

    renderWithQuery(<ParticipacaoDoPedido pedidoId={ID} />)

    await screen.findByText('CARLA MENDES')
    expect(servidor.em(CAMINHO)).toHaveLength(1)
  })
})

/* ------------------------------------------------------------------------- */
/* A folha inteira: o cabeçalho lendo o que o painel mostra.                  */
/* ------------------------------------------------------------------------- */

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
  // O par vem RESOLVIDO pelo servidor, e é o mesmo da linha principal.
  salespersonId: 'emp-0002',
  salespersonName: 'CARLA MENDES',
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

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function servidorDaFolha(leiturasDaParticipacao: string[] = []) {
  return async (entrada: RequestInfo | URL) => {
    const req = entrada instanceof Request ? entrada : null
    const url = String(req ? req.url : entrada)
    const metodo = req?.method ?? 'GET'

    if (url.includes('/auth/me')) return respostaSessao()
    if (url.includes('/auth/tenants')) return respostaVinculos()
    if (url.includes('/api/catalog-lookups')) return respostaLookups()
    if (url.includes('/api/installment-policy')) return resposta({ minInstallmentCents: 0 })
    if (url.includes('/api/payment-terms')) return resposta({ rows: [], total: 0 })
    if (url.includes('/api/partners')) return resposta({ rows: [PARCEIRO], total: 1 })

    // ANTES do casamento genérico de `/api/orders`: os dois sub-caminhos são
    // filhos dele, e um stub que casa só pelo prefixo devolveria o DOCUMENTO
    // onde a tela espera uma lista — o teste passaria sem medir nada.
    if (url.includes('/participants')) {
      leiturasDaParticipacao.push(url)
      return resposta({ rows: [PRINCIPAL], total: 1 })
    }
    if (url.includes('/professional-history')) return resposta({ rows: [], total: 0 })

    if (url.includes('/api/orders')) {
      if (metodo !== 'GET') return resposta(PEDIDO)
      if (url.includes(ID)) return resposta(PEDIDO)
      return resposta({ rows: [PEDIDO], total: 1 })
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

describe('o `Consultor(a)` do cabeçalho', () => {
  it('mostra o atendente principal', async () => {
    await abrirDocumento(servidorDaFolha())

    expect(screen.getByLabelText(/Consultor/i)).toHaveValue('CARLA MENDES')
  })

  it('NÃO se edita — quem muda o consultor é a participação, que tem percentual e vigência', async () => {
    await abrirDocumento(servidorDaFolha())

    // `readonly` e não `disabled`: o valor continua legível e copiável, e o
    // campo segue no fluxo do Tab. O que ele não aceita é digitação.
    expect(screen.getByLabelText(/Consultor/i)).toHaveAttribute('readonly')
  })

  it('não é mais um combo de CARGO — o controle que mentia saiu', async () => {
    await abrirDocumento(servidorDaFolha())

    // O combo do lookup expõe papel `combobox`; o campo de leitura é um
    // `textbox`. A asserção é sobre o PAPEL porque era o papel que enganava: o
    // operador escolhia da lista e nada daquilo era gravado.
    expect(screen.queryByRole('combobox', { name: /Consultor/i })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Consultor/i })).toBeInTheDocument()
  })

  it('o painel monta junto da folha, com o mesmo nome do cabeçalho', async () => {
    await abrirDocumento(servidorDaFolha())

    const painel = await painelMontado()
    expect(within(painel).getByText('CARLA MENDES')).toBeInTheDocument()
  })
})

describe('a transferência e a participação', () => {
  it('transferir RELÊ a grade — deixá-la parada mostraria quem saiu', async () => {
    const leituras: string[] = []
    const { user } = await abrirDocumento(servidorDaFolha(leituras))
    await painelMontado()
    const antes = leituras.length
    expect(antes).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Transferir profissional/i }))
    await user.click(await screen.findByRole('button', { name: /Escolher…/i }))
    await user.click(await screen.findByText('MARINA COSTA ARQUITETURA'))
    await user.click(await screen.findByRole('button', { name: /^Selecionar$/i }))
    await user.click(screen.getByRole('button', { name: /^Transferir$/i }))

    // A troca muda o profissional PRINCIPAL da grade. Sem a invalidação, o
    // painel seguiria mostrando a linha de antes ao lado de um cabeçalho já
    // atualizado — a divergência que o contrato chama de "trilha que mente".
    await waitFor(() => expect(leituras.length).toBeGreaterThan(antes))
  })
})
