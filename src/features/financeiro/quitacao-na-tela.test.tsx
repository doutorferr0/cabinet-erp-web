import { instalarServidor, json } from '@/test/servidor'
import { renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A QUITAÇÃO NA TELA — o que o operador consegue fazer, e o que a recusa diz.
 *
 * Contra SERVIDOR FALSO, nunca com mock de módulo: o cliente gerado chama
 * `fetch(new Request(...))`, então verbo e corpo vêm do `Request` — e é o corpo
 * que este arquivo precisa medir. As três coisas que ele trava:
 *
 * 1. **A linha da agenda é um VENCIMENTO** e a tela abre pelo vencimento.
 * 2. **Várias linhas marcadas mantêm o `Quitar` vivo** e mandam UMA requisição
 *    de lote — não N. É a diferença entre pagar o bloco e pagar em dobro.
 * 3. **A recusa a menor (403 com URN própria) mantém o diálogo aberto** e diz o
 *    que fazer. Tratada como "sem permissão", ela esconderia o campo que
 *    resolve o caso.
 */

const CONTA = {
  id: 'conta-1',
  name: 'Itaú — Movimento',
  bankId: null,
  bankCode: '341',
  bankName: 'Itaú',
  branchId: null,
  branchNumber: '1234',
  number: '5678',
  digit: '9',
  kind: 'checking',
  openingBalanceCents: 0,
  active: true,
}

const MODO = {
  id: 'modo-1',
  code: 'PIX',
  name: 'PIX',
  adminFeePercent: 0,
  termDays: 0,
  fixedDay: null,
  usableInSettlement: true,
  active: true,
}

function parcela(n: number, valor: number) {
  return {
    id: `parc-${n}`,
    titleId: `tit-${n}`,
    direction: 'payable',
    titleNumber: String(100 + n),
    partnerId: 'parc-forn',
    partnerName: `FORNECEDOR ${n}`,
    sequence: 1,
    dueDate: '2026-08-20',
    amountCents: valor,
    settledCents: 0,
    openCents: valor,
    status: 'open',
    overdue: true,
    paymentModeId: null,
    documentNumber: `NF ${n}`,
  }
}

const PARCELAS = [parcela(1, 480_000), parcela(2, 137_500)]

function servidor(aoQuitar?: () => Response) {
  return instalarServidor({
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/financial-installments': () => json({ rows: PARCELAS, total: PARCELAS.length }),
    '/api/bank-accounts': () => json({ rows: [CONTA], total: 1 }),
    '/api/cash-registers': () => json({ rows: [], total: 0 }),
    '/api/payment-modes': () => json({ rows: [MODO], total: 1 }),
    '/api/financial-settlements/batch': () =>
      json({ batchId: 'lote-1', totalPaidCents: 617_500, settlements: [] }, 201),
    '/api/financial-installments/parc-1/settlements': () =>
      aoQuitar
        ? aoQuitar()
        : json({ id: 'baixa-1', installmentId: 'parc-1', paidCents: 480_000 }, 201),
  })
}

afterEach(() => vi.unstubAllGlobals())

/** Marca a linha pelo checkbox da própria linha, como o operador faz. */
async function marcar(user: ReturnType<typeof renderRoute>['user'], nome: string) {
  const linha = (await screen.findByText(nome)).closest('tr') as HTMLElement
  await user.click(within(linha).getByRole('checkbox'))
}

async function escolherDestinoEModo(user: ReturnType<typeof renderRoute>['user']) {
  await user.selectOptions(await screen.findByLabelText('Destino do dinheiro'), 'conta:conta-1')
  await user.selectOptions(screen.getByLabelText('Meio de pagamento'), 'modo-1')
}

describe('a agenda de vencimentos', () => {
  it('abre pela PARCELA — a linha é um vencimento, com título e parte', async () => {
    const falso = servidor()
    renderRoute('/financeiro/pagar', falso.fetch)

    expect(await screen.findByRole('heading', { name: /Contas a Pagar/i })).toBeInTheDocument()
    expect(await screen.findByText('FORNECEDOR 1')).toBeInTheDocument()
    // `titleNumber/sequence` na mesma célula: é assim que o financeiro procura
    // ("a 1ª do 101"), e é o que o contrato ecoa para a tela não resolver id.
    expect(screen.getByText('101/1')).toBeInTheDocument()
  })
})

describe('a quitação em LOTE', () => {
  it('duas linhas marcadas mantêm o Quitar vivo e mandam UMA requisição', async () => {
    const falso = servidor()
    const { user } = renderRoute('/financeiro/pagar', falso.fetch)

    await marcar(user, 'FORNECEDOR 1')
    await marcar(user, 'FORNECEDOR 2')

    // Com duas linhas, toda ação de UM registro morre — `Quitar` não, porque o
    // servidor faz o lote num ato só.
    const quitar = screen.getByRole('button', { name: /Quitar/i })
    expect(quitar).toBeEnabled()
    await user.click(quitar)

    expect(await screen.findByText(/tudo ou nada/i)).toBeInTheDocument()
    await escolherDestinoEModo(user)
    await user.click(screen.getByRole('button', { name: /Quitar 2 vencimentos/i }))

    const chamadas = falso.em('/api/financial-settlements/batch')
    expect(chamadas).toHaveLength(1)
    const corpo = chamadas[0]?.corpo as {
      bankAccountId?: string
      cashRegisterId?: string
      items: { installmentId: string; amountCents?: number }[]
    }
    expect(corpo.items.map((i) => i.installmentId)).toEqual(['parc-1', 'parc-2'])
    // O item vai SEM valor: o padrão do contrato é o saldo inteiro, e repetir o
    // número faria a tela pagar a mais se o saldo mudasse entre ler e enviar.
    expect(corpo.items[0]).not.toHaveProperty('amountCents')
    // Destino EXCLUSIVO: a tela nunca manda os dois.
    expect(corpo.bankAccountId).toBe('conta-1')
    expect(corpo).not.toHaveProperty('cashRegisterId')

    // Uma requisição de lote, e NENHUMA baixa avulsa: o laço de N é justamente
    // o que o tudo-ou-nada existe para evitar.
    expect(falso.em('/api/financial-installments/parc-1/settlements')).toHaveLength(0)
  })
})

describe('a quitação a MENOR', () => {
  it('recusada com a URN própria, o diálogo fica aberto e diz como resolver', async () => {
    const recusa = () =>
      new Response(
        JSON.stringify({
          type: 'urn:cabinet:erro:quitacao-a-menor',
          title: 'Quitação a menor',
          status: 403,
          detail: 'O papel deste vínculo não pode quitar a menor.',
        }),
        { status: 403, headers: { 'content-type': 'application/problem+json' } },
      )
    const falso = servidor(recusa)
    const { user } = renderRoute('/financeiro/pagar', falso.fetch)

    await marcar(user, 'FORNECEDOR 1')
    await user.click(screen.getByRole('button', { name: /Quitar/i }))
    await escolherDestinoEModo(user)

    // Abaixo do saldo: a tela avisa ANTES, porque quem tem a alçada precisa
    // saber que está usando uma exceção.
    const valor = screen.getByLabelText('Valor abatido')
    await user.clear(valor)
    await user.type(valor, '100000')
    expect(await screen.findByText(/Quitação/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Quitar$/ }))

    // A recusa NÃO fecha o diálogo, e a frase aponta o campo — não "peça
    // permissão e volte depois".
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/Suba o valor abatido até o saldo/i)
    expect(screen.getByLabelText('Valor abatido')).toBeInTheDocument()
  })

  it('ACIMA do saldo nem chega ao servidor — não há alçada que libere', async () => {
    const falso = servidor()
    const { user } = renderRoute('/financeiro/pagar', falso.fetch)

    await marcar(user, 'FORNECEDOR 1')
    await user.click(screen.getByRole('button', { name: /Quitar/i }))
    await escolherDestinoEModo(user)

    const valor = screen.getByLabelText('Valor abatido')
    await user.clear(valor)
    await user.type(valor, '999999999')

    expect(await screen.findByRole('alert')).toHaveTextContent(/passa do saldo/i)
    expect(screen.getByRole('button', { name: /^Quitar$/ })).toBeDisabled()
    expect(falso.em('/api/financial-installments/parc-1/settlements')).toHaveLength(0)
  })
})
