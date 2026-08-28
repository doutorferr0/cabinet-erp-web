import type {
  BankAccountDto,
  CashRegisterDto,
  FinancialInstallmentDto,
  FinancialSettlementDto,
  FinancialTitleDto,
  FinancialTitleWriteRequest,
  PaymentModeDto,
  SettlementBatchRequest,
  SettlementBatchResultDto,
  SettlementWriteRequest,
} from '@/api/gerado'
import { diaLocalISO } from '@/lib/datas'
import { http, HttpResponse } from 'msw'
import { papelDaSessao } from './permissao'
import {
  TIPO,
  camposInvalidos,
  conflito,
  naoEncontrado,
  problemaJson,
  semEmpresaAtiva,
  semSessao,
} from './problema'
import { TENANT_MATRIZ, novoId, store } from './store'

/**
 * O "backend" do FINANCEIRO no modo mock — título, parcela e quitação.
 *
 * As 15 operações da tag `financeiro` entraram no contrato pela #340 e **handler
 * nenhum as servia**. A ausência estava declarada com o motivo em
 * `whitelist-do-contrato.test.ts` (`SEM_HANDLER_NO_MOCK`): *"nenhuma tela a
 * consome ainda (Fase C)"*. Este arquivo é o outro lado dessa frase — as telas
 * chegaram, e é a chegada delas que torna o mock necessário.
 *
 * A #340 pesou a decisão ao contrário e estava certa na época: reimplementar
 * regra de DINHEIRO sem chamador é comportamento sem leitor, e a divergência
 * apareceria como bug da tela. Com a tela montada a conta inverte — o site
 * público é 100% mock, e sem handler `cabinetonline.cc` mostraria Contas a
 * Pagar em branco com cara de "não há o que pagar".
 *
 * ## As quatro regras que este mock existe para reproduzir
 *
 * 1. **O destino da baixa é obrigatório e EXCLUSIVO** — `bankAccountId` XOR
 *    `cashRegisterId`. Os dois, ou nenhum, é 400. Sem conta, o dinheiro é
 *    quitado no sistema e invisível no caixa.
 * 2. **Quitar A MENOS é permissão, não erro** — 403
 *    `urn:cabinet:erro:quitacao-a-menor`, a permissão especial nº 45 do legado.
 *    Aqui a alçada é do papel `owner`: o `admin` do seed é quem opera o site
 *    público, e é ele que precisa ver a recusa acontecer.
 * 3. **Acima do saldo é 409** e não tem alçada que libere — pagar mais do que se
 *    deve é engano de digitação, e o troco não teria onde ser lançado.
 * 4. **O lote é TUDO OU NADA.** Toda parcela é conferida ANTES de a primeira ser
 *    gravada; uma recusada derruba o lote inteiro. Gravar as que passam e listar
 *    as que falharam é a forma de pagar em dobro: o operador corrige, reenvia o
 *    bloco, e as que já tinham passado saem de novo.
 *
 * ## O que ele NÃO reproduz, e está declarado
 *
 * **O MOVIMENTO de caixa que a baixa gera.** No servidor a baixa grava o
 * `cash_movement` na mesma transação (`sourceType = 'settlement'`) — é o elo que
 * a api#112 carregava aberto. Aqui não há extrato: `GET /api/cash-movements`
 * segue sem handler porque segue sem tela, e gravar um movimento que nenhuma
 * resposta devolve seria estado sem leitor. A conta que recebeu o dinheiro está
 * na própria baixa (`bankAccountId`/`cashRegisterId`), que é o que a tela mostra.
 *
 * **A transferência e a conciliação**, pelo mesmo motivo: são as telas de caixa
 * e movimentos bancários, trilho seguinte.
 *
 * **O período fechado.** `treasury_closings` não tem caminho no contrato, então
 * não há como fechar um período por aqui — e uma data "fechada" inventada no
 * mock recusaria lançamento que o servidor aceitaria.
 */

/**
 * Whitelists de `sortBy` — CÓPIA da descrição do contrato, conferida por
 * igualdade em `src/data/whitelist-do-contrato.test.ts`.
 *
 * `dueDate` está na de PARCELAS e fora da de TÍTULOS, e a assimetria é a decisão
 * central da listagem: um título de cinco parcelas tem cinco vencimentos, e
 * ordenar título por vencimento obrigaria a escolher um em silêncio.
 */
export const ORDENAVEIS_TITULO = [
  'number',
  'issuedAt',
  'totalCents',
  'openCents',
  'status',
  'partnerName',
]
export const ORDENAVEIS_PARCELA = [
  'dueDate',
  'amountCents',
  'openCents',
  'partnerName',
  'titleNumber',
  'sequence',
]
export const ORDENAVEIS_CONTA_BANCARIA = ['name', 'number', 'bankCode', 'active']
export const ORDENAVEIS_CAIXA = ['code', 'name', 'active']
export const ORDENAVEIS_MODO_DE_PAGAMENTO = ['code', 'name', 'active']

/**
 * Nenhuma das listagens do módulo publica `filters` — o recorte é por
 * `direction`, `status` e data, e os três são parâmetro próprio. Filtro
 * estruturado que chegue aqui tem de ser 400, nunca silêncio: quem apara em
 * silêncio devolve a lista inteira com a condição desenhada no painel.
 */
const NAO_PUBLICA_FILTERS = 'Este recurso não publica o parâmetro filters.'

/** A alçada da quitação a menor no mock — ver a regra 2 do cabeçalho. */
const PAPEL_QUE_QUITA_A_MENOR = 'owner'

// ------------------------------------------------------------------- estado

/** A BAIXA, como o mock a guarda. `paidCents` é derivado e não entra aqui. */
interface BaixaDoMock {
  id: string
  settledOn: string
  amountCents: number
  interestCents: number
  fineCents: number
  discountCents: number
  paymentModeId: string
  bankAccountId: string | null
  cashRegisterId: string | null
  batchId: string | null
  notes: string | null
  createdAt: string
}

interface ParcelaDoMock {
  id: string
  sequence: number
  dueDate: string
  amountCents: number
  paymentModeId: string | null
  documentNumber: string | null
  baixas: BaixaDoMock[]
}

interface TituloDoMock {
  id: string
  tenantId: string
  direction: 'payable' | 'receivable'
  number: string
  documentNumber: string | null
  partnerId: string
  documentTypeId: string | null
  chartAccountId: string | null
  costCenterId: string | null
  paymentTermId: string | null
  sourceType: 'manual' | 'sale_order' | 'goods_receipt'
  sourceId: string | null
  issuedAt: string
  competenceMonth: string | null
  notes: string | null
  cancelado: boolean
  parcelas: ParcelaDoMock[]
}

interface ContaDaEmpresa extends BankAccountDto {
  tenantId: string
}

interface CaixaDaEmpresa extends CashRegisterDto {
  tenantId: string
}

interface ModoDaEmpresa extends PaymentModeDto {
  tenantId: string
}

interface Estado {
  titulos: TituloDoMock[]
  contas: ContaDaEmpresa[]
  caixas: CaixaDaEmpresa[]
  modos: ModoDaEmpresa[]
}

/** Desloca dias a partir de hoje — a agenda precisa de VENCIDO e de a vencer. */
function emDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return diaLocalISO(d)
}

function estadoInicial(): Estado {
  const contas: ContaDaEmpresa[] = [
    {
      tenantId: TENANT_MATRIZ,
      id: 'conta-0001',
      name: 'Itaú — Movimento',
      bankId: null,
      bankCode: '341',
      bankName: 'Banco Itaú S.A.',
      branchId: null,
      branchNumber: '1234',
      number: '56789',
      digit: '0',
      kind: 'checking',
      openingBalanceCents: 1_250_000,
      active: true,
    },
    {
      tenantId: TENANT_MATRIZ,
      id: 'conta-0002',
      name: 'Sicredi — Aplicação',
      bankId: null,
      bankCode: '748',
      bankName: 'Banco Cooperativo Sicredi S.A.',
      branchId: null,
      branchNumber: '0710',
      number: '11223',
      digit: '4',
      kind: 'investment',
      openingBalanceCents: 3_000_000,
      active: true,
    },
  ]

  const caixas: CaixaDaEmpresa[] = [
    {
      tenantId: TENANT_MATRIZ,
      id: 'caixa-0001',
      code: 'CX-01',
      name: 'Caixa da loja',
      openingBalanceCents: 50_000,
      active: true,
    },
  ]

  /**
   * `usableInSettlement` falso no cheque não é campo decorativo: é o que o
   * legado faz com uma cláusula solta na quitação em lote, e a tela precisa do
   * combo já sem ele para não oferecer um meio que o servidor recusa.
   */
  const modos: ModoDaEmpresa[] = [
    {
      tenantId: TENANT_MATRIZ,
      id: 'modo-0001',
      code: 'DIN',
      name: 'Dinheiro',
      adminFeePercent: 0,
      termDays: 0,
      fixedDay: null,
      usableInSettlement: true,
      active: true,
    },
    {
      tenantId: TENANT_MATRIZ,
      id: 'modo-0002',
      code: 'PIX',
      name: 'PIX',
      adminFeePercent: 0,
      termDays: 0,
      fixedDay: null,
      usableInSettlement: true,
      active: true,
    },
    {
      tenantId: TENANT_MATRIZ,
      id: 'modo-0003',
      code: 'CRT',
      name: 'Cartão de crédito',
      // 1% na escala da casa: inteiro com 4 casas implícitas.
      adminFeePercent: 10_000,
      termDays: 30,
      fixedDay: null,
      usableInSettlement: true,
      active: true,
    },
    {
      tenantId: TENANT_MATRIZ,
      id: 'modo-0004',
      code: 'CHQ',
      name: 'Cheque',
      adminFeePercent: 0,
      termDays: 0,
      fixedDay: null,
      usableInSettlement: false,
      active: true,
    },
  ]

  const titulos: TituloDoMock[] = [
    {
      id: 'tit-0001',
      tenantId: TENANT_MATRIZ,
      direction: 'payable',
      number: '1',
      documentNumber: 'NF 88.421',
      partnerId: 'parc-0001',
      documentTypeId: null,
      chartAccountId: null,
      costCenterId: null,
      paymentTermId: null,
      sourceType: 'manual',
      sourceId: null,
      issuedAt: emDias(-40),
      competenceMonth: null,
      notes: null,
      cancelado: false,
      parcelas: [
        {
          id: 'parc-tit-0001-1',
          sequence: 1,
          dueDate: emDias(-12),
          amountCents: 480_000,
          paymentModeId: 'modo-0002',
          documentNumber: 'NF 88.421 1/2',
          // Uma baixa PARCIAL no seed: é o estado que faz `PUT` e `cancel`
          // responderem 409, e o que prova que `openCents` não é o total.
          baixas: [
            {
              id: 'baixa-0001',
              settledOn: emDias(-10),
              amountCents: 200_000,
              interestCents: 0,
              fineCents: 0,
              discountCents: 0,
              paymentModeId: 'modo-0002',
              bankAccountId: 'conta-0001',
              cashRegisterId: null,
              batchId: null,
              notes: 'Adiantamento acertado por telefone.',
              createdAt: `${emDias(-10)}T14:02:00.000Z`,
            },
          ],
        },
        {
          id: 'parc-tit-0001-2',
          sequence: 2,
          dueDate: emDias(18),
          amountCents: 480_000,
          paymentModeId: 'modo-0002',
          documentNumber: 'NF 88.421 2/2',
          baixas: [],
        },
      ],
    },
    {
      id: 'tit-0002',
      tenantId: TENANT_MATRIZ,
      direction: 'payable',
      number: '2',
      documentNumber: 'NF 12.907',
      partnerId: 'parc-0006',
      documentTypeId: null,
      chartAccountId: null,
      costCenterId: null,
      paymentTermId: null,
      sourceType: 'manual',
      sourceId: null,
      issuedAt: emDias(-8),
      competenceMonth: null,
      notes: null,
      cancelado: false,
      parcelas: [
        {
          id: 'parc-tit-0002-1',
          sequence: 1,
          dueDate: emDias(-2),
          amountCents: 137_500,
          paymentModeId: 'modo-0001',
          documentNumber: null,
          baixas: [],
        },
      ],
    },
    {
      id: 'tit-0003',
      tenantId: TENANT_MATRIZ,
      direction: 'receivable',
      number: '1',
      documentNumber: 'PED 4.512',
      partnerId: 'parc-0003',
      documentTypeId: null,
      chartAccountId: null,
      costCenterId: null,
      paymentTermId: null,
      // Título que o PEDIDO DE VENDA gerou: `sourceType` é o campo que sustenta
      // "de onde veio esta conta" quando o financeiro liga para conferir.
      sourceType: 'sale_order',
      sourceId: null,
      issuedAt: emDias(-25),
      competenceMonth: null,
      notes: null,
      cancelado: false,
      parcelas: [
        {
          id: 'parc-tit-0003-1',
          sequence: 1,
          dueDate: emDias(-5),
          amountCents: 620_000,
          paymentModeId: 'modo-0002',
          documentNumber: null,
          baixas: [],
        },
        {
          id: 'parc-tit-0003-2',
          sequence: 2,
          dueDate: emDias(25),
          amountCents: 620_000,
          paymentModeId: 'modo-0002',
          documentNumber: null,
          baixas: [],
        },
      ],
    },
    {
      id: 'tit-0004',
      tenantId: TENANT_MATRIZ,
      direction: 'receivable',
      number: '2',
      documentNumber: 'PED 4.530',
      partnerId: 'parc-0002',
      documentTypeId: null,
      chartAccountId: null,
      costCenterId: null,
      paymentTermId: null,
      sourceType: 'sale_order',
      sourceId: null,
      issuedAt: emDias(-3),
      competenceMonth: null,
      notes: null,
      cancelado: false,
      parcelas: [
        {
          id: 'parc-tit-0004-1',
          sequence: 1,
          dueDate: emDias(4),
          amountCents: 189_900,
          paymentModeId: 'modo-0001',
          documentNumber: null,
          baixas: [],
        },
      ],
    },
  ]

  return { titulos, contas, caixas, modos }
}

let estado: Estado = estadoInicial()

/** Volta ao seed entre testes — o par do `resetCompras`/`resetQuotes`. */
export function resetFinanceiro(): void {
  estado = estadoInicial()
}

// --------------------------------------------------------------- derivações

function nomeDeParceiro(id: string): string {
  return store.parceiros.find((p) => p.id === id)?.legalName ?? id
}

/** `amountCents + juros + multa − desconto` — o que de fato andou na conta. */
function paidCents(b: BaixaDoMock): number {
  return b.amountCents + b.interestCents + b.fineCents - b.discountCents
}

function baixaDto(b: BaixaDoMock, installmentId: string): FinancialSettlementDto {
  return {
    id: b.id,
    installmentId,
    settledOn: b.settledOn,
    amountCents: b.amountCents,
    interestCents: b.interestCents,
    fineCents: b.fineCents,
    discountCents: b.discountCents,
    paidCents: paidCents(b),
    paymentModeId: b.paymentModeId,
    bankAccountId: b.bankAccountId,
    cashRegisterId: b.cashRegisterId,
    batchId: b.batchId,
    notes: b.notes,
    createdAt: b.createdAt,
  }
}

function quitado(p: ParcelaDoMock): number {
  return p.baixas.reduce((soma, b) => soma + b.amountCents, 0)
}

function saldo(p: ParcelaDoMock): number {
  return p.amountCents - quitado(p)
}

/**
 * A parcela como o contrato a publica.
 *
 * `overdue` sai do dia do SERVIDOR — aqui, do processo que responde. É por isso
 * que ele viaja no DTO em vez de a tela comparar com o relógio da estação: o
 * relógio errado marcaria vencido o que ainda não venceu.
 */
function parcelaDto(
  p: ParcelaDoMock,
  titulo: TituloDoMock,
  opcoes: { comBaixas: boolean },
): FinancialInstallmentDto {
  const settledCents = quitado(p)
  const openCents = p.amountCents - settledCents
  const status = openCents <= 0 ? 'settled' : 'open'
  return {
    id: p.id,
    titleId: titulo.id,
    direction: titulo.direction,
    titleNumber: titulo.number,
    partnerId: titulo.partnerId,
    partnerName: nomeDeParceiro(titulo.partnerId),
    sequence: p.sequence,
    dueDate: p.dueDate,
    amountCents: p.amountCents,
    settledCents,
    openCents,
    status,
    overdue: status === 'open' && p.dueDate < diaLocalISO(),
    paymentModeId: p.paymentModeId,
    documentNumber: p.documentNumber,
    // Presente no DETALHE do título, ausente na listagem de parcelas: ali a
    // linha é grade, não extrato.
    ...(opcoes.comBaixas ? { settlements: p.baixas.map((b) => baixaDto(b, p.id)) } : {}),
  }
}

function tituloDto(t: TituloDoMock): FinancialTitleDto {
  const totalCents = t.parcelas.reduce((soma, p) => soma + p.amountCents, 0)
  const settledCents = t.parcelas.reduce((soma, p) => soma + quitado(p), 0)
  const openCents = totalCents - settledCents
  return {
    id: t.id,
    direction: t.direction,
    number: t.number,
    documentNumber: t.documentNumber,
    partnerId: t.partnerId,
    partnerName: nomeDeParceiro(t.partnerId),
    documentTypeId: t.documentTypeId,
    chartAccountId: t.chartAccountId,
    costCenterId: t.costCenterId,
    paymentTermId: t.paymentTermId,
    sourceType: t.sourceType,
    sourceId: t.sourceId,
    issuedAt: t.issuedAt,
    competenceMonth: t.competenceMonth,
    totalCents,
    settledCents,
    openCents,
    status: t.cancelado ? 'cancelled' : openCents <= 0 ? 'settled' : 'open',
    notes: t.notes,
    installments: t.parcelas.map((p) => parcelaDto(p, t, { comBaixas: true })),
  }
}

function daEmpresa(tenantId: string): TituloDoMock[] {
  return estado.titulos.filter((t) => t.tenantId === tenantId)
}

/** Toda parcela da empresa, com o título a que pertence — a AGENDA. */
function parcelasDaEmpresa(tenantId: string): { parcela: ParcelaDoMock; titulo: TituloDoMock }[] {
  return daEmpresa(tenantId)
    .filter((t) => !t.cancelado)
    .flatMap((titulo) => titulo.parcelas.map((parcela) => ({ parcela, titulo })))
}

// ---------------------------------------------------------------- listagem

interface Consulta {
  q: string | null
  sortBy: string | null
  sortDesc: boolean
  page: number
  pageSize: number
  url: URL
}

function lerConsulta(url: URL): Consulta {
  return {
    q: url.searchParams.get('q'),
    sortBy: url.searchParams.get('sortBy'),
    sortDesc: url.searchParams.get('sortDesc') === 'true',
    page: Number(url.searchParams.get('page') ?? '1'),
    pageSize: Number(url.searchParams.get('pageSize') ?? '10'),
    url,
  }
}

/**
 * Ordena, pagina e devolve `{rows,total}` — ou o 400 que o contrato manda.
 *
 * Mesmo desenho de `compras.ts`: `sortBy` fora da whitelist, `pageSize` acima de
 * 100 e `filters` em recurso que não o publica são recusa em voz alta. Aparar em
 * silêncio faz quem pediu 500 e recebeu 100 concluir que só existem 100.
 */
function responder<T>(
  linhas: T[],
  consulta: Consulta,
  ordenaveis: readonly string[],
  padrao?: { campo: string; desc: boolean },
) {
  if (consulta.page < 1 || consulta.pageSize < 1 || consulta.pageSize > 100) {
    return problemaJson(
      400,
      'Paginação inválida: page é 1-based e pageSize vai até 100.',
      {},
      TIPO.paginacaoInvalida,
    )
  }
  if (consulta.sortBy && !ordenaveis.includes(consulta.sortBy)) {
    return problemaJson(400, `sortBy inválido: ${consulta.sortBy}.`, {}, TIPO.ordenacaoInvalida)
  }
  if (consulta.url.searchParams.get('filters')) {
    return problemaJson(400, NAO_PUBLICA_FILTERS, {}, TIPO.filtroInvalido)
  }

  const campo = consulta.sortBy ?? padrao?.campo
  const desc = consulta.sortBy ? consulta.sortDesc : (padrao?.desc ?? false)
  if (campo) {
    linhas.sort((a, b) => {
      const va = (a as Record<string, unknown>)[campo]
      const vb = (b as Record<string, unknown>)[campo]
      if (va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1
      if (vb === null || vb === undefined) return -1
      const ordem =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb))
      return desc ? -ordem : ordem
    })
  }

  const inicio = (consulta.page - 1) * consulta.pageSize
  return HttpResponse.json({
    rows: linhas.slice(inicio, inicio + consulta.pageSize),
    total: linhas.length,
  })
}

function casaTexto(q: string | null, campos: (string | null | undefined)[]): boolean {
  if (!q) return true
  const alvo = q.toLowerCase()
  return campos.some((texto) => (texto ?? '').toLowerCase().includes(alvo))
}

// --------------------------------------------------------------- validação

/**
 * O DESTINO da baixa: exatamente um entre conta e caixa.
 *
 * Devolve a lista de campos inválidos, vazia quando passa. Os dois juntos e
 * nenhum dos dois são o MESMO erro para o operador ("diga para onde o dinheiro
 * foi"), e por isso a frase nomeia o par em vez de um campo só.
 */
function destinoInvalido(
  corpo: { bankAccountId?: string | null; cashRegisterId?: string | null },
  tenantId: string,
): { path: string; message: string }[] {
  const conta = corpo.bankAccountId ?? null
  const caixa = corpo.cashRegisterId ?? null
  if ((conta === null) === (caixa === null)) {
    return [
      {
        path: 'bankAccountId',
        message: 'Informe a conta bancária OU o caixa da baixa — exatamente um dos dois.',
      },
    ]
  }
  if (conta && !estado.contas.some((c) => c.id === conta && c.tenantId === tenantId)) {
    return [{ path: 'bankAccountId', message: 'Conta bancária não encontrada.' }]
  }
  if (caixa && !estado.caixas.some((c) => c.id === caixa && c.tenantId === tenantId)) {
    return [{ path: 'cashRegisterId', message: 'Caixa não encontrado.' }]
  }
  return []
}

function modoInvalido(paymentModeId: string, tenantId: string) {
  const modo = estado.modos.find((m) => m.id === paymentModeId && m.tenantId === tenantId)
  if (!modo) return { path: 'paymentModeId', message: 'Modo de pagamento não encontrado.' }
  if (!modo.usableInSettlement) {
    return {
      path: 'paymentModeId',
      message: `O modo ${modo.name} não serve para quitação.`,
    }
  }
  return undefined
}

/** 403 da alçada — a URN é PRÓPRIA, e é por ela que a tela sabe o que oferecer. */
function semAlcadaParaQuitarAMenor(amountCents: number, saldoDaParcela: number) {
  return problemaJson(
    403,
    `O papel deste vínculo não pode quitar a menor: o valor abate ${amountCents} centavos ` +
      `e o saldo da parcela é ${saldoDaParcela} (\`financeiro:quitacao-a-menor\`).`,
    {},
    TIPO.quitacaoAMenor,
  )
}

/**
 * As recusas da baixa, na ORDEM em que o servidor as aplica.
 *
 * A ordem importa e não é estética: 400 de corpo vem antes de 409 de estado, e
 * o 403 da alçada vem por último porque só faz sentido depois de o valor ser
 * comparado com um saldo que existe. Devolve a resposta de erro, ou `undefined`
 * quando a baixa pode ser gravada.
 */
function recusaDaBaixa(
  parcela: ParcelaDoMock,
  titulo: TituloDoMock,
  valores: { amountCents: number; interestCents: number; fineCents: number; discountCents: number },
  campoDoValor: string,
) {
  if (titulo.cancelado) {
    return conflito('Título cancelado não recebe baixa.', TIPO.transicaoInvalida)
  }
  const negativo = [
    valores.amountCents <= 0
      ? { path: campoDoValor, message: 'O valor da baixa é positivo.' }
      : null,
    valores.interestCents < 0 ? { path: 'interestCents', message: 'Juros não é negativo.' } : null,
    valores.fineCents < 0 ? { path: 'fineCents', message: 'Multa não é negativa.' } : null,
    valores.discountCents < 0
      ? { path: 'discountCents', message: 'Desconto não é negativo.' }
      : null,
  ].filter((c) => c !== null)
  if (negativo.length > 0) return camposInvalidos(negativo)

  const saldoDaParcela = saldo(parcela)
  if (saldoDaParcela <= 0) {
    return conflito(
      `A parcela ${parcela.sequence} do título ${titulo.number} já está quitada.`,
      TIPO.parcelaJaQuitada,
    )
  }
  if (valores.amountCents > saldoDaParcela) {
    return conflito(
      `A baixa abate ${valores.amountCents} centavos e o saldo da parcela é ${saldoDaParcela}.`,
      TIPO.valorAcimaDoSaldo,
    )
  }
  if (valores.amountCents < saldoDaParcela && papelDaSessao() !== PAPEL_QUE_QUITA_A_MENOR) {
    return semAlcadaParaQuitarAMenor(valores.amountCents, saldoDaParcela)
  }
  return undefined
}

/**
 * As parcelas do título na escrita: 1..N sem buraco, valor positivo, ao menos
 * uma.
 *
 * Título à vista é título de UMA parcela, e não título sem parcela: sem essa
 * regra, quitar à vista precisaria de um caminho próprio.
 */
function parcelasInvalidas(corpo: FinancialTitleWriteRequest) {
  const linhas = corpo.installments ?? []
  if (linhas.length === 0) {
    return [{ path: 'installments', message: 'O título tem ao menos uma parcela.' }]
  }
  const problemas: { path: string; message: string }[] = []
  const esperadas = linhas.map((_, i) => i + 1)
  const recebidas = [...linhas].map((l) => l.sequence).sort((a, b) => a - b)
  if (esperadas.join(',') !== recebidas.join(',')) {
    problemas.push({
      path: 'installments',
      message: 'As parcelas são numeradas de 1 a N, sem buraco e sem repetição.',
    })
  }
  linhas.forEach((linha, i) => {
    if (!(linha.amountCents > 0)) {
      problemas.push({
        path: `installments[${i}].amountCents`,
        message: 'Parcela de zero é linha que a grade mostra e o caixa nunca vê.',
      })
    }
    if (!linha.dueDate) {
      problemas.push({
        path: `installments[${i}].dueDate`,
        message: 'Informe o vencimento da parcela.',
      })
    }
  })
  return problemas
}

/**
 * O CORPO do título — o que vale para `POST` e para `PUT`.
 *
 * O papel da parte é conferido contra a direção: fornecedor quando `payable`,
 * cliente quando `receivable`. Parceiro sem o papel é 400 e não silêncio — uma
 * conta a pagar lançada contra cliente é a conta que ninguém acha depois.
 */
function corpoInvalido(corpo: FinancialTitleWriteRequest) {
  const problemas: { path: string; message: string }[] = []
  const parceiro = store.parceiros.find((p) => p.id === corpo.partnerId)
  if (!parceiro) {
    problemas.push({ path: 'partnerId', message: 'Parceiro não encontrado.' })
  } else if (corpo.direction === 'payable' && !parceiro.isSupplier) {
    problemas.push({ path: 'partnerId', message: 'Conta a pagar é contra FORNECEDOR.' })
  } else if (corpo.direction === 'receivable' && !parceiro.isCustomer) {
    problemas.push({ path: 'partnerId', message: 'Conta a receber é contra CLIENTE.' })
  }
  if (!corpo.issuedAt) {
    problemas.push({ path: 'issuedAt', message: 'Informe a data de emissão.' })
  }
  // Mês de competência com dia diferente de 1 é 400: o MÊS é o dado, e aceitar
  // o dia faria duas linhas do mesmo mês competirem no resultado.
  if (corpo.competenceMonth && !corpo.competenceMonth.endsWith('-01')) {
    problemas.push({
      path: 'competenceMonth',
      message: 'A competência é o MÊS — sempre no dia 1.',
    })
  }
  return [...problemas, ...parcelasInvalidas(corpo)]
}

/** O próximo número da direção — sequencial POR LADO, como no legado. */
function proximoNumero(tenantId: string, direction: 'payable' | 'receivable'): string {
  const usados = daEmpresa(tenantId)
    .filter((t) => t.direction === direction)
    .map((t) => Number(t.number))
    .filter((n) => Number.isFinite(n))
  return String((usados.length > 0 ? Math.max(...usados) : 0) + 1)
}

function gravarParcelas(corpo: FinancialTitleWriteRequest, tituloId: string): ParcelaDoMock[] {
  return [...(corpo.installments ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map((linha) => ({
      id: `${tituloId}-${linha.sequence}`,
      sequence: linha.sequence,
      dueDate: linha.dueDate,
      amountCents: linha.amountCents,
      paymentModeId: linha.paymentModeId ?? null,
      documentNumber: linha.documentNumber ?? null,
      baixas: [],
    }))
}

function temBaixa(t: TituloDoMock): boolean {
  return t.parcelas.some((p) => p.baixas.length > 0)
}

// ---------------------------------------------------------------- handlers

export const handlersDeFinanceiro = [
  // ------------------------------------------------------------- títulos
  http.get('*/api/financial-titles', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    // Sem empresa a LEITURA DE LISTA é vazia, não erro.
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const direction = consulta.url.searchParams.get('direction')
    const status = consulta.url.searchParams.get('status')
    const partnerId = consulta.url.searchParams.get('partnerId')
    const issuedFrom = consulta.url.searchParams.get('issuedFrom')
    const issuedTo = consulta.url.searchParams.get('issuedTo')

    const linhas = daEmpresa(store.activeTenantId)
      .map(tituloDto)
      .filter((t) => (direction ? t.direction === direction : true))
      .filter((t) => (status ? t.status === status : true))
      .filter((t) => (partnerId ? t.partnerId === partnerId : true))
      .filter((t) => (issuedFrom ? t.issuedAt >= issuedFrom : true))
      .filter((t) => (issuedTo ? t.issuedAt <= issuedTo : true))
      .filter((t) => casaTexto(consulta.q, [t.number, t.documentNumber, t.partnerName]))

    return responder(linhas, consulta, ORDENAVEIS_TITULO, { campo: 'issuedAt', desc: true })
  }),

  http.get('*/api/financial-titles/:id', ({ params }) => {
    if (!store.logado) return semSessao()
    // O DETALHE por id é 409 e não lista vazia: é o código que o contrato
    // reserva para "este recurso exige empresa".
    if (!store.activeTenantId) return semEmpresaAtiva()
    const titulo = daEmpresa(store.activeTenantId).find((t) => t.id === params.id)
    if (!titulo) return naoEncontrado('Título não encontrado.')
    return HttpResponse.json(tituloDto(titulo))
  }),

  http.post('*/api/financial-titles', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const corpo = (await request.json()) as FinancialTitleWriteRequest
    const problemas = corpoInvalido(corpo)
    if (problemas.length > 0) return camposInvalidos(problemas)

    const id = novoId('tit')
    const titulo: TituloDoMock = {
      id,
      tenantId: store.activeTenantId,
      direction: corpo.direction,
      number: proximoNumero(store.activeTenantId, corpo.direction),
      documentNumber: corpo.documentNumber ?? null,
      partnerId: corpo.partnerId,
      documentTypeId: corpo.documentTypeId ?? null,
      chartAccountId: corpo.chartAccountId ?? null,
      costCenterId: corpo.costCenterId ?? null,
      paymentTermId: corpo.paymentTermId ?? null,
      // Título lançado pela TELA é `manual` por definição — os outros dois vêm
      // do pedido de venda e da entrada de nota, que gravam sozinhos.
      sourceType: 'manual',
      sourceId: null,
      issuedAt: corpo.issuedAt,
      competenceMonth: corpo.competenceMonth ?? null,
      notes: corpo.notes ?? null,
      cancelado: false,
      parcelas: [],
    }
    titulo.parcelas = gravarParcelas(corpo, id)
    estado.titulos.push(titulo)
    return HttpResponse.json(tituloDto(titulo), { status: 201 })
  }),

  http.put('*/api/financial-titles/:id', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const titulo = daEmpresa(store.activeTenantId).find((t) => t.id === params.id)
    if (!titulo) return naoEncontrado('Título não encontrado.')

    const corpo = (await request.json()) as FinancialTitleWriteRequest
    const problemas = corpoInvalido(corpo)
    // Virar a DIREÇÃO é 400 e não silêncio: o número sai de uma sequência por
    // lado, e trocar de lado manteria o número do livro antigo. O caminho é
    // cancelar e lançar outro.
    if (corpo.direction !== titulo.direction) {
      problemas.push({
        path: 'direction',
        message: 'A direção do título não muda — cancele e lance outro.',
      })
    }
    if (problemas.length > 0) return camposInvalidos(problemas)

    if (titulo.cancelado) {
      return conflito('Título cancelado não se reescreve.', TIPO.transicaoInvalida)
    }
    // O passado não se reescreve depois que o dinheiro andou.
    if (temBaixa(titulo)) {
      return conflito(
        'Este título já tem baixa lançada — lance um título novo.',
        TIPO.tituloComBaixa,
      )
    }

    titulo.documentNumber = corpo.documentNumber ?? null
    titulo.partnerId = corpo.partnerId
    titulo.documentTypeId = corpo.documentTypeId ?? null
    titulo.chartAccountId = corpo.chartAccountId ?? null
    titulo.costCenterId = corpo.costCenterId ?? null
    titulo.paymentTermId = corpo.paymentTermId ?? null
    titulo.issuedAt = corpo.issuedAt
    titulo.competenceMonth = corpo.competenceMonth ?? null
    titulo.notes = corpo.notes ?? null
    // `PUT` substitui o registro INTEIRO, parcelas incluídas.
    titulo.parcelas = gravarParcelas(corpo, titulo.id)
    return HttpResponse.json(tituloDto(titulo))
  }),

  http.post('*/api/financial-titles/:id/cancel', ({ params }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()
    const titulo = daEmpresa(store.activeTenantId).find((t) => t.id === params.id)
    if (!titulo) return naoEncontrado('Título não encontrado.')
    if (titulo.cancelado) {
      return conflito('Este título já está cancelado.', TIPO.transicaoInvalida)
    }
    if (temBaixa(titulo)) {
      return conflito('Este título já tem baixa lançada e não se cancela.', TIPO.tituloComBaixa)
    }
    titulo.cancelado = true
    return HttpResponse.json(tituloDto(titulo))
  }),

  // ------------------------------------------------------------ parcelas
  http.get('*/api/financial-installments', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })

    const direction = consulta.url.searchParams.get('direction')
    const status = consulta.url.searchParams.get('status')
    const partnerId = consulta.url.searchParams.get('partnerId')
    const dueFrom = consulta.url.searchParams.get('dueFrom')
    const dueTo = consulta.url.searchParams.get('dueTo')
    const overdue = consulta.url.searchParams.get('overdue')

    const linhas = parcelasDaEmpresa(store.activeTenantId)
      .map(({ parcela, titulo }) => parcelaDto(parcela, titulo, { comBaixas: false }))
      .filter((p) => (direction ? p.direction === direction : true))
      .filter((p) => (status ? p.status === status : true))
      .filter((p) => (partnerId ? p.partnerId === partnerId : true))
      .filter((p) => (dueFrom ? p.dueDate >= dueFrom : true))
      .filter((p) => (dueTo ? p.dueDate <= dueTo : true))
      .filter((p) => (overdue === null ? true : p.overdue === (overdue === 'true')))
      .filter((p) => casaTexto(consulta.q, [p.titleNumber, p.documentNumber, p.partnerName]))

    // O padrão é `dueDate` crescente: a agenda começa pelo que vence primeiro.
    return responder(linhas, consulta, ORDENAVEIS_PARCELA, { campo: 'dueDate', desc: false })
  }),

  // ------------------------------------------------------------- quitação
  http.post('*/api/financial-installments/:id/settlements', async ({ params, request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const alvo = parcelasDaEmpresa(store.activeTenantId).find((x) => x.parcela.id === params.id)
    if (!alvo) return naoEncontrado('Parcela não encontrada.')

    const corpo = (await request.json()) as SettlementWriteRequest
    const campos = [
      ...destinoInvalido(corpo, store.activeTenantId),
      ...(corpo.settledOn ? [] : [{ path: 'settledOn', message: 'Informe a data da baixa.' }]),
    ]
    const modo = modoInvalido(corpo.paymentModeId, store.activeTenantId)
    if (modo) campos.push(modo)
    if (campos.length > 0) return camposInvalidos(campos)

    const valores = {
      amountCents: corpo.amountCents,
      interestCents: corpo.interestCents ?? 0,
      fineCents: corpo.fineCents ?? 0,
      discountCents: corpo.discountCents ?? 0,
    }
    const recusa = recusaDaBaixa(alvo.parcela, alvo.titulo, valores, 'amountCents')
    if (recusa) return recusa

    const baixa: BaixaDoMock = {
      id: novoId('baixa'),
      settledOn: corpo.settledOn,
      ...valores,
      paymentModeId: corpo.paymentModeId,
      bankAccountId: corpo.bankAccountId ?? null,
      cashRegisterId: corpo.cashRegisterId ?? null,
      batchId: null,
      notes: corpo.notes ?? null,
      createdAt: new Date().toISOString(),
    }
    alvo.parcela.baixas.push(baixa)
    return HttpResponse.json(baixaDto(baixa, alvo.parcela.id), { status: 201 })
  }),

  http.post('*/api/financial-settlements/batch', async ({ request }) => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return semEmpresaAtiva()

    const corpo = (await request.json()) as SettlementBatchRequest
    const itens = corpo.items ?? []
    const campos = [
      ...destinoInvalido(corpo, store.activeTenantId),
      ...(corpo.settledOn ? [] : [{ path: 'settledOn', message: 'Informe a data do lote.' }]),
      ...(itens.length === 0
        ? [{ path: 'items', message: 'O lote tem ao menos uma parcela.' }]
        : []),
    ]
    const modo = modoInvalido(corpo.paymentModeId, store.activeTenantId)
    if (modo) campos.push(modo)
    // Parcela REPETIDA na mesma requisição é o mesmo pagamento contado duas
    // vezes — e é 400 porque o cliente consegue ver isso sozinho.
    const ids = itens.map((i) => i.installmentId)
    if (new Set(ids).size !== ids.length) {
      campos.push({ path: 'items', message: 'A mesma parcela aparece duas vezes no lote.' })
    }
    if (campos.length > 0) return camposInvalidos(campos)

    // TUDO OU NADA: confere as N antes de gravar a primeira. Um lote de dez em
    // que só a sétima recusa não pode deixar seis baixas gravadas.
    const alvos = []
    for (const [i, item] of itens.entries()) {
      const alvo = parcelasDaEmpresa(store.activeTenantId).find(
        (x) => x.parcela.id === item.installmentId,
      )
      if (!alvo) return naoEncontrado(`Parcela do item ${i + 1} não encontrada.`)
      const valores = {
        // Item sem valor quita o SALDO INTEIRO — repetir um número que o
        // servidor já sabe faz a tela pagar a mais quando o saldo muda entre a
        // leitura e o envio.
        amountCents: item.amountCents ?? saldo(alvo.parcela),
        interestCents: item.interestCents ?? 0,
        fineCents: item.fineCents ?? 0,
        discountCents: item.discountCents ?? 0,
      }
      const recusa = recusaDaBaixa(alvo.parcela, alvo.titulo, valores, `items[${i}].amountCents`)
      if (recusa) return recusa
      alvos.push({ parcela: alvo.parcela, valores })
    }

    const batchId = novoId('lote')
    const criadas: FinancialSettlementDto[] = alvos.map(({ parcela, valores }) => {
      const baixa: BaixaDoMock = {
        id: novoId('baixa'),
        settledOn: corpo.settledOn,
        ...valores,
        paymentModeId: corpo.paymentModeId,
        bankAccountId: corpo.bankAccountId ?? null,
        cashRegisterId: corpo.cashRegisterId ?? null,
        batchId,
        notes: corpo.notes ?? null,
        createdAt: new Date().toISOString(),
      }
      parcela.baixas.push(baixa)
      return baixaDto(baixa, parcela.id)
    })

    const resultado: SettlementBatchResultDto = {
      batchId,
      totalPaidCents: criadas.reduce((soma, b) => soma + b.paidCents, 0),
      settlements: criadas,
    }
    return HttpResponse.json(resultado, { status: 201 })
  }),

  // ---------------------------------------------------- listas de apoio
  http.get('*/api/bank-accounts', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const active = consulta.url.searchParams.get('active')
    const linhas = estado.contas
      .filter((c) => c.tenantId === store.activeTenantId)
      .filter((c) => (active === null ? true : c.active === (active === 'true')))
      .filter((c) => casaTexto(consulta.q, [c.name, c.number, c.bankName]))
      .map(({ tenantId: _tenantId, ...dto }) => dto)
    return responder(linhas, consulta, ORDENAVEIS_CONTA_BANCARIA, { campo: 'name', desc: false })
  }),

  http.get('*/api/cash-registers', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const active = consulta.url.searchParams.get('active')
    const linhas = estado.caixas
      .filter((c) => c.tenantId === store.activeTenantId)
      .filter((c) => (active === null ? true : c.active === (active === 'true')))
      .filter((c) => casaTexto(consulta.q, [c.code, c.name]))
      .map(({ tenantId: _tenantId, ...dto }) => dto)
    return responder(linhas, consulta, ORDENAVEIS_CAIXA, { campo: 'code', desc: false })
  }),

  http.get('*/api/payment-modes', ({ request }) => {
    if (!store.logado) return semSessao()
    const consulta = lerConsulta(new URL(request.url))
    if (!store.activeTenantId) return HttpResponse.json({ rows: [], total: 0 })
    const active = consulta.url.searchParams.get('active')
    const naQuitacao = consulta.url.searchParams.get('usableInSettlement')
    const linhas = estado.modos
      .filter((m) => m.tenantId === store.activeTenantId)
      .filter((m) => (active === null ? true : m.active === (active === 'true')))
      .filter((m) =>
        naQuitacao === null ? true : m.usableInSettlement === (naQuitacao === 'true'),
      )
      .filter((m) => casaTexto(consulta.q, [m.code, m.name]))
      .map(({ tenantId: _tenantId, ...dto }) => dto)
    return responder(linhas, consulta, ORDENAVEIS_MODO_DE_PAGAMENTO, {
      campo: 'code',
      desc: false,
    })
  }),
]
