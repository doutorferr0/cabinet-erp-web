import type {
  AbcCurveReportDto,
  BirthdayRowDto,
  BirthdaysReportDto,
  ProductsSoldReportDto,
  ProfessionalRankingReportDto,
  QuoteVsStockReportDto,
  QuoteVsStockRowDto,
  SalesComparisonReportDto,
  SalesComparisonRowDto,
  SalespersonReportDto,
  SalespersonRowDto,
  StockAgingReportDto,
  StockAgingRowDto,
  StockValuationReportDto,
  StockValuationRowDto,
  SupplierMovementReportDto,
} from '@/api/gerado'
import { http, HttpResponse } from 'msw'
import { TIPO, camposInvalidos, problemaJson, semSessao } from './problema'
import { orcamentosParaRelatorio } from './quotes'
import { store } from './store'

/**
 * OS DEZ RELATÓRIOS DE GESTÃO no modo mock (contrato #310, vol. 08 §8b).
 *
 * As dez operações estão em `contracts/openapi-v1.json` desde a #314 e **handler
 * nenhum as servia**. Não era esquecimento: `whitelist-do-contrato.test.ts` as
 * nomeava, uma a uma, com o motivo — *"agregação: o mock guarda linhas, não
 * somas"*. Este arquivo é esse estado, e o motivo continua VÁLIDO. O que mudou
 * foi a leitura do preço: enquanto ninguém as serve, elas caem no fallback da
 * SPA e voltam o `index.html` com **200**, que o cliente lê como
 * `urn:cabinet:erro:resposta-nao-json`. O site público é 100% mock, então a
 * primeira tela de relatório construída contra isso quebraria antes de desenhar
 * a primeira linha — e quebraria por um erro que não fala de relatório nenhum.
 *
 * ## A regra que separa este mock de um gerador de número inventado
 *
 * **Campo cuja fonte não existe no mock sai AUSENTE quando o contrato o deixa
 * opcional, e zero só quando ele é obrigatório.** É a única distinção que
 * impede o relatório de mentir com cara de apuração: `conversionPercent: 0` lê
 * como "o atendente não fecha nada", enquanto o campo ausente lê como "não há
 * como saber", que é a verdade. O medo que a #314 escreveu — *"as duas contas
 * divergiriam no primeiro arredondamento"* — se paga aqui: onde a fonte existe,
 * a conta é a do dado; onde não existe, **não há conta**, e nenhuma soma em
 * TypeScript disputa com o `GROUP BY` do outro lado.
 *
 * ## O que o mock TEM, e por isso agrega de verdade
 *
 * - **Estoque valorizado** — `variants[].priceCents`/`stockQty`/`minStock` mais
 *   `store.saldos` da empresa ativa. Nenhuma venda entra na conta.
 * - **Dias sem venda** — o mesmo saldo. Todo item sai como **nunca vendido**, e
 *   isso não é um valor de enchimento: `store.movimentos` nasce vazio e o mock
 *   não guarda pedido de venda, então "nunca vendeu" é o que o dado diz.
 * - **Aniversariantes** — `birthDate` do parceiro vinculado à empresa ativa.
 * - **Demonstrativo por atendente** — `quoteCount` sai dos orçamentos, que
 *   existem. `orderCount`/`revenueCents` são obrigatórios e saem zero;
 *   `conversionPercent` e `averageTicketCents` são opcionais e saem AUSENTES.
 *
 * ## O que ele NÃO tem, e está declarado
 *
 * **O PEDIDO DE VENDA.** `ListOrders` também não tem handler no mock, e é dele
 * que sairia todo faturamento. Por isso curva ABC, produto vendido, ranking de
 * profissional e movimentação por fornecedor respondem envelope válido com
 * `rows: []` e `summary` zerado: zero linhas é a leitura correta de "não há
 * pedido", e a tela desenha o estado vazio em vez de um total inventado.
 *
 * **O comparativo é a exceção, e de propósito.** Ele devolve os buckets do
 * período COM zero, porque o contrato manda: *"períodos sem venda aparecem com
 * zero — buraco na série é informação"*. O que se agrega ali é CALENDÁRIO, não
 * dinheiro.
 *
 * **Orçamento × estoque volta vazio por falta de `variantId`.** As 17 linhas da
 * §8.1 são transcrição e nascem com `variantId: null` (o seed não capturou a
 * ligação com o catálogo), e o contrato recorta o relatório em "só linhas com
 * variante do catálogo". Vazio aqui é a regra do contrato aplicada ao dado que
 * existe — não uma agregação que faltou escrever.
 */

/**
 * As whitelists de `sortBy` — CÓPIA da descrição de cada parâmetro no contrato,
 * conferida por igualdade em `src/data/whitelist-do-contrato.test.ts`.
 *
 * Não é zelo: o site público é 100% mock, então whitelist menor aqui é coluna
 * que ordena contra o `:3000` e responde 400 na demonstração — o defeito
 * aparece no clique do cabeçalho, nunca na suíte.
 */
export const ORDENAVEIS_CURVA_ABC = ['revenueCents', 'quantity', 'description']
export const ORDENAVEIS_PRODUTO_VENDIDO = ['revenueCents', 'quantity', 'orderCount', 'description']
export const ORDENAVEIS_COMPARATIVO = ['bucket', 'revenueCents', 'orderCount']
export const ORDENAVEIS_ATENDENTE = [
  'revenueCents',
  'orderCount',
  'quoteCount',
  'conversionPercent',
  'salespersonName',
  'bucket',
]
export const ORDENAVEIS_PROFISSIONAL = [
  'revenueCents',
  'orderCount',
  'averageTicketCents',
  'professionalName',
  'lastSaleAt',
]
export const ORDENAVEIS_FORNECEDOR = [
  'revenueCents',
  'quantity',
  'supplierName',
  'orderCount',
  'lineCount',
  'productCount',
]
export const ORDENAVEIS_ESTOQUE_VALORIZADO = ['valueCents', 'quantity', 'minStock', 'description']
export const ORDENAVEIS_DIAS_SEM_VENDA = [
  'daysWithoutSale',
  'valueCents',
  'quantity',
  'lastSaleAt',
  'description',
]
export const ORDENAVEIS_ORCAMENTO_X_ESTOQUE = [
  'shortageQuantity',
  'quotedQuantity',
  'stockQuantity',
  'description',
]
export const ORDENAVEIS_ANIVERSARIANTES = ['day', 'name', 'age']

/**
 * Nenhum dos dez publica `filters`, e o recorte de cada um é parâmetro PRÓPRIO
 * (`supplierId`, `productGroup`, `pieceType`, `role`…).
 *
 * Consequência prática, e é ela que este comentário guarda: `filters` que chegue
 * a qualquer um destes caminhos tem de ser **400**, não silêncio. Aparar em
 * silêncio devolve o relatório inteiro com a condição desenhada no painel, e
 * quem lê conclui que ela não estreita nada.
 */
const NAO_PUBLICA_FILTERS = 'Este recurso não publica o parâmetro filters.'

/** A página pedida, já validada. */
interface Pagina {
  page: number
  pageSize: number
  sortBy: string | null
  sortDesc: boolean
}

/**
 * A fronteira comum aos dez: sessão, `filters`, paginação e `sortBy`.
 *
 * Devolve a resposta de RECUSA, ou a página válida. Vem antes de qualquer conta
 * porque é o que o servidor de verdade faz — e porque relatório que soma o
 * período inteiro para depois descobrir que o `pageSize` era 500 gasta a conta
 * duas vezes e responde 400 do mesmo jeito.
 */
function fronteira(
  url: URL,
  ordenaveis: readonly string[],
): { recusa: Response } | { pagina: Pagina } {
  if (!store.logado) return { recusa: semSessao() }

  if (url.searchParams.has('filters')) {
    return { recusa: problemaJson(400, NAO_PUBLICA_FILTERS, {}, TIPO.filtroInvalido) }
  }

  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '50')
  if (!Number.isInteger(page) || !Number.isInteger(pageSize)) {
    return {
      recusa: problemaJson(
        400,
        'Paginação inválida: page e pageSize são inteiros.',
        {},
        TIPO.paginacaoInvalida,
      ),
    }
  }
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return {
      recusa: problemaJson(
        400,
        'Paginação inválida: page é 1-based e pageSize vai até 100.',
        {},
        TIPO.paginacaoInvalida,
      ),
    }
  }

  const sortBy = url.searchParams.get('sortBy')
  if (sortBy && !ordenaveis.includes(sortBy)) {
    return { recusa: problemaJson(400, `sortBy inválido: ${sortBy}.`, {}, TIPO.ordenacaoInvalida) }
  }

  return {
    pagina: { page, pageSize, sortBy, sortDesc: url.searchParams.get('sortDesc') === 'true' },
  }
}

const DIA = /^\d{4}-\d{2}-\d{2}$/

/**
 * O período — `from`/`to` são OBRIGATÓRIOS nos sete que os publicam.
 *
 * **Período invertido é 400, não zero linhas** (precedente vivo do
 * `GetCrmLostReasonsReport`). Zero linhas seria indistinguível de "não houve
 * venda no período", e quem digitou a data trocada concluiria a coisa errada
 * sobre o próprio negócio.
 */
function periodo(url: URL): { recusa: Response } | { from: string; to: string } {
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const faltando = [
    ...(from ? [] : [{ path: 'from', message: 'Informe a data inicial.' }]),
    ...(to ? [] : [{ path: 'to', message: 'Informe a data final.' }]),
  ]
  if (faltando.length > 0) return { recusa: camposInvalidos(faltando) }
  if (!DIA.test(from as string) || !DIA.test(to as string)) {
    return {
      recusa: camposInvalidos([
        { path: 'from', message: 'Data em formato inválido (AAAA-MM-DD).' },
      ]),
    }
  }
  if ((from as string) > (to as string)) {
    return {
      recusa: camposInvalidos([
        { path: 'to', message: 'A data final não pode ser anterior à inicial.' },
      ]),
    }
  }
  return { from: from as string, to: to as string }
}

/**
 * Ordena e corta a página — sobre a linha INTERNA, que é numérica.
 *
 * A conversão para o DTO vem DEPOIS, e essa ordem é a regra: `quantity`,
 * `minStock` e os percentuais viajam como **string** no contrato (decimal
 * exato — a mesma razão pela qual dinheiro é centavo inteiro e float é veto).
 * Ordenar sobre o texto colocaria `'10'` antes de `'9'`, e o relatório de
 * estoque mostraria a segunda maior quantidade no topo sem nenhum sintoma.
 *
 * A ordenação trata AUSENTE como desconhecido e o joga para o fim NOS DOIS
 * SENTIDOS — é o que o contrato escreve em dois lugares: item sem preço "não
 * vale zero, vale desconhecido", e quem nunca vendeu "não tem dias a contar".
 * Ordenar `undefined` como zero levaria o desconhecido para o topo do crescente
 * e enterraria justamente as linhas que o relatório existe para mostrar.
 */
function paginar<T extends Record<string, unknown>>(
  linhas: readonly T[],
  pagina: Pagina,
  padrao: { campo: string; desc: boolean },
): { rows: T[]; total: number } {
  const campo = pagina.sortBy ?? padrao.campo
  const desc = pagina.sortBy ? pagina.sortDesc : padrao.desc
  const ordenadas = [...linhas].sort((a, b) => comparar(a[campo], b[campo], desc))
  const inicio = (pagina.page - 1) * pagina.pageSize
  return { rows: ordenadas.slice(inicio, inicio + pagina.pageSize), total: linhas.length }
}

function comparar(a: unknown, b: unknown, desc: boolean): number {
  const aVazio = a === undefined || a === null
  const bVazio = b === undefined || b === null
  if (aVazio && bVazio) return 0
  if (aVazio) return 1
  if (bVazio) return -1
  const ordem =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  return desc ? -ordem : ordem
}

/**
 * Quantidade como o contrato a declara: TEXTO com três casas.
 *
 * `numeric(18,3)` do outro lado, e é por isso que ela não viaja como `number`:
 * 0,1 + 0,2 em ponto flutuante não dá 0,3, e uma peça que some meia unidade por
 * arredondamento aparece como divergência de inventário meses depois.
 */
function decimal(valor: number): string {
  return valor.toFixed(3)
}

/** O membro opcional só existe quando há valor — `undefined` explícito não passa. */
function seHouver<K extends string, V>(chave: K, valor: V | undefined): Record<K, V> | object {
  return valor === undefined ? {} : ({ [chave]: valor } as Record<K, V>)
}

/** O tenant ativo, ou `null` — quem lê relatório sem empresa recebe envelope vazio. */
function tenantAtivo(): string | null {
  return store.activeTenantId
}

// ---------------------------------------------------------------------------
// as fontes que o mock TEM
// ---------------------------------------------------------------------------

/** Uma variante do catálogo com o saldo da empresa ativa somado entre depósitos. */
interface LinhaDeEstoque {
  variantId: string
  description: string
  productGroup: string | null
  quantity: number
  unitPriceCents: number | null
  minStock: number
  /** O `updatedAt` mais antigo entre os saldos — de quando a peça está parada ali. */
  desde: string | null
}

/**
 * A descrição da VARIANTE, e não a do produto.
 *
 * A linha do relatório de estoque é por variante: duas cores da mesma luminária
 * são dois saldos, dois preços e duas decisões de compra. Sem o acabamento e o
 * tamanho no texto, a tela mostraria a mesma descrição duas vezes com números
 * diferentes, que é o jeito mais rápido de fazer alguém achar que o relatório
 * está somando errado.
 */
function descricaoDaVariante(
  descricao: string,
  finish: string | null | undefined,
  size: string | null | undefined,
): string {
  return [descricao, finish, size].filter((parte) => parte).join(' · ')
}

function estoqueDaEmpresa(tenantId: string, incluirZero: boolean): LinhaDeEstoque[] {
  const saldoPorVariante = new Map<string, { qty: number; desde: string | null }>()
  for (const saldo of store.saldos) {
    if (saldo.tenantId !== tenantId) continue
    const atual = saldoPorVariante.get(saldo.variantId) ?? { qty: 0, desde: null }
    saldoPorVariante.set(saldo.variantId, {
      qty: atual.qty + saldo.qty,
      desde:
        atual.desde === null || saldo.updatedAt < atual.desde
          ? (saldo.updatedAt ?? null)
          : atual.desde,
    })
  }

  const linhas: LinhaDeEstoque[] = []
  for (const produto of store.produtos) {
    for (const variante of produto.variants) {
      const saldo = saldoPorVariante.get(variante.id)
      const quantidade = saldo?.qty ?? 0
      if (quantidade === 0 && !incluirZero) continue
      linhas.push({
        variantId: variante.id,
        description: descricaoDaVariante(produto.description, variante.finish, variante.size),
        // `productGroup` do contrato é o TIPO do produto no cadastro. O mock não
        // guarda um segundo agrupamento, e inventar um faria o filtro do
        // relatório recortar por algo que a tela de produto não mostra.
        productGroup: produto.productTypeName ?? null,
        quantity: quantidade,
        // `null` é SEM PREÇO; zero é preço zero. Os dois existem no seed e o
        // contrato os separa: um vai para `withoutPriceCount`, o outro vale 0.
        unitPriceCents: variante.priceCents ?? null,
        // Variante sem mínimo cadastrado não está abaixo de mínimo nenhum — o
        // campo é obrigatório no DTO, e zero é o mínimo que não morde.
        minStock: variante.minStock ?? 0,
        desde: saldo?.desde ?? null,
      })
    }
  }
  return linhas
}

function valorDaLinha(linha: LinhaDeEstoque): number | undefined {
  if (linha.unitPriceCents === null) return undefined
  return Math.round(linha.quantity * linha.unitPriceCents)
}

function diasDesde(iso: string | null, hoje: Date): number | undefined {
  if (!iso) return undefined
  const inicio = Date.parse(iso)
  if (Number.isNaN(inicio)) return undefined
  return Math.max(0, Math.floor((hoje.getTime() - inicio) / 86_400_000))
}

// ---------------------------------------------------------------------------
// os buckets do comparativo — calendário, não dinheiro
// ---------------------------------------------------------------------------

type Granularidade = 'month' | 'quarter' | 'semester' | 'year'

const GRANULARIDADES = ['month', 'quarter', 'semester', 'year'] as const

/**
 * O demonstrativo por atendente NÃO aceita `year`, e o comparativo aceita.
 *
 * São dois enums diferentes no contrato, e o genérico abaixo é o que impede uma
 * whitelist só para os dois: o `granularity` que sai no envelope precisa ser do
 * TIPO do relatório que respondeu, senão o mock aceitaria um agrupamento que o
 * servidor de verdade recusa — e o defeito só apareceria contra o `:3000`.
 */
const GRANULARIDADES_DO_ATENDENTE = ['month', 'quarter', 'semester'] as const

/**
 * Os buckets do período, do primeiro ao último — INCLUSIVE os sem venda.
 *
 * "Buraco na série é informação": omitir o mês vazio faz o gráfico ligar julho
 * em setembro como se agosto não existisse. Aqui todos vêm vazios, e é a mesma
 * regra: o mock não tem pedido, então a série honesta é a série de zeros.
 */
function bucketsDoPeriodo(
  from: string,
  to: string,
  granularidade: Granularidade,
): SalesComparisonRowDto[] {
  const [anoDe, mesDe] = [Number(from.slice(0, 4)), Number(from.slice(5, 7))]
  const [anoAte, mesAte] = [Number(to.slice(0, 4)), Number(to.slice(5, 7))]
  const chaves: { bucket: string; label: string }[] = []

  for (let ano = anoDe; ano <= anoAte; ano++) {
    const primeiro = ano === anoDe ? mesDe : 1
    const ultimo = ano === anoAte ? mesAte : 12
    for (let mes = primeiro; mes <= ultimo; mes++) {
      const chave = rotuloDoBucket(ano, mes, granularidade)
      if (chaves.at(-1)?.bucket === chave.bucket) continue
      chaves.push(chave)
    }
  }

  return chaves.map((chave) => ({
    bucket: chave.bucket,
    label: chave.label,
    orderCount: 0,
    revenueCents: 0,
  }))
}

function rotuloDoBucket(ano: number, mes: number, granularidade: Granularidade) {
  if (granularidade === 'year') return { bucket: String(ano), label: String(ano) }
  if (granularidade === 'semester') {
    const s = mes <= 6 ? 1 : 2
    return { bucket: `${ano}-S${s}`, label: `${s}º semestre de ${ano}` }
  }
  if (granularidade === 'quarter') {
    const t = Math.ceil(mes / 3)
    return { bucket: `${ano}-T${t}`, label: `${t}º trimestre de ${ano}` }
  }
  const mm = String(mes).padStart(2, '0')
  return { bucket: `${ano}-${mm}`, label: `${mm}/${ano}` }
}

function granularidadeDe<T extends Granularidade>(url: URL, aceitas: readonly T[]) {
  const pedida = url.searchParams.get('granularity') ?? 'month'
  if (!(aceitas as readonly string[]).includes(pedida)) {
    return {
      recusa: camposInvalidos([
        { path: 'granularity', message: `Granularidade inválida: ${pedida}.` },
      ]),
    }
  }
  return { granularidade: pedida as T }
}

// ---------------------------------------------------------------------------
// os handlers
// ---------------------------------------------------------------------------

export const handlersDeRelatorios = [
  // ------------------------------------------------------------- curva ABC
  http.get('*/api/reports/abc-curve', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_CURVA_ABC)
    if ('recusa' in porta) return porta.recusa
    const janela = periodo(url)
    if ('recusa' in janela) return janela.recusa

    // Sem pedido de venda no mock não há faturamento a curvar. `classACount` e
    // companhia são obrigatórios e saem zero — com `rows` vazio, a tela desenha
    // o estado vazio e não um "80% do faturamento" de coisa nenhuma.
    const corpo: AbcCurveReportDto = {
      from: janela.from,
      to: janela.to,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total: 0,
      summary: { revenueCents: 0, classACount: 0, classBCount: 0, classCCount: 0 },
      rows: [],
    }
    return HttpResponse.json(corpo)
  }),

  // -------------------------------------------------------- produto vendido
  http.get('*/api/reports/products-sold', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_PRODUTO_VENDIDO)
    if ('recusa' in porta) return porta.recusa
    const janela = periodo(url)
    if ('recusa' in janela) return janela.recusa

    const corpo: ProductsSoldReportDto = {
      from: janela.from,
      to: janela.to,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total: 0,
      summary: { quantity: decimal(0), revenueCents: 0 },
      rows: [],
    }
    return HttpResponse.json(corpo)
  }),

  // ---------------------------------------------------- comparativo de vendas
  http.get('*/api/reports/sales-comparison', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_COMPARATIVO)
    if ('recusa' in porta) return porta.recusa
    const janela = periodo(url)
    if ('recusa' in janela) return janela.recusa
    const grao = granularidadeDe(url, GRANULARIDADES)
    if ('recusa' in grao) return grao.recusa

    // A SÉRIE É REAL, os valores é que são zero. `previousRevenueCents` fica
    // AUSENTE no primeiro bucket — não há período anterior dentro do recorte, e
    // zero ali leria como "no mês passado não se vendeu nada", afirmação que
    // este relatório não tem como fazer.
    //
    // `deltaPercent` fica ausente em TODOS: variação percentual sobre base zero
    // não existe, e publicar `"0.00"` seria dizer "não variou" onde a resposta
    // certa é "não há de que variar".
    const serie: SalesComparisonRowDto[] = bucketsDoPeriodo(
      janela.from,
      janela.to,
      grao.granularidade,
    ).map((linha, i) => (i === 0 ? linha : { ...linha, previousRevenueCents: 0, deltaCents: 0 }))

    const { rows, total } = paginar(serie as unknown as Record<string, unknown>[], porta.pagina, {
      campo: 'bucket',
      desc: false,
    })

    const corpo: SalesComparisonReportDto = {
      from: janela.from,
      to: janela.to,
      granularity: grao.granularidade,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total,
      summary: { revenueCents: 0, orderCount: 0 },
      rows: rows as unknown as SalesComparisonRowDto[],
    }
    return HttpResponse.json(corpo)
  }),

  // -------------------------------------------------- demonstrativo por atendente
  http.get('*/api/reports/salesperson-performance', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_ATENDENTE)
    if ('recusa' in porta) return porta.recusa
    const janela = periodo(url)
    if ('recusa' in janela) return janela.recusa
    const grao = granularidadeDe(url, GRANULARIDADES_DO_ATENDENTE)
    if ('recusa' in grao) return grao.recusa

    const tenantId = tenantAtivo()
    const filtro = url.searchParams.get('salespersonId')

    // O ORÇAMENTO EXISTE NO MOCK, e é metade da pergunta deste relatório: "quanto
    // do que ele atendeu virou venda". A outra metade (o pedido) não existe —
    // por isso `conversionPercent` e `averageTicketCents` saem AUSENTES, e não
    // 0%: quem lê 0% conclui que o atendente não fecha nada.
    //
    // DIVERGÊNCIA CONHECIDA, e ela é HERDADA: o orçamento do mock não guarda
    // `tenantId` — `listQuotes` também não o recorta por empresa. Aqui a empresa
    // ativa decide se HÁ contagem, não QUAIS documentos entram nela. No servidor
    // de verdade o recorte é do RLS, e nada neste arquivo o substitui; o dia em
    // que o mock der empresa ao orçamento, este laço passa a filtrar por ela sem
    // mudar de forma.
    const porAtendenteBucket = new Map<string, SalespersonRowDto>()
    if (tenantId) {
      for (const orcamento of orcamentosParaRelatorio()) {
        if (orcamento.cancelled) continue
        if (!orcamento.issuedAt) continue
        if (orcamento.issuedAt < janela.from || orcamento.issuedAt > janela.to) continue
        if (filtro && orcamento.salespersonId !== filtro) continue
        const ano = Number(orcamento.issuedAt.slice(0, 4))
        const mes = Number(orcamento.issuedAt.slice(5, 7))
        const { bucket } = rotuloDoBucket(ano, mes, grao.granularidade)
        const nome = orcamento.salespersonName ?? 'SEM ATENDENTE'
        const chave = `${orcamento.salespersonId ?? ''}|${bucket}`
        const atual = porAtendenteBucket.get(chave) ?? {
          salespersonId: orcamento.salespersonId,
          salespersonName: nome,
          bucket,
          quoteCount: 0,
          orderCount: 0,
          revenueCents: 0,
        }
        porAtendenteBucket.set(chave, { ...atual, quoteCount: atual.quoteCount + 1 })
      }
    }

    const linhas = [...porAtendenteBucket.values()]
    const { rows, total } = paginar(linhas as unknown as Record<string, unknown>[], porta.pagina, {
      campo: 'quoteCount',
      desc: true,
    })

    const corpo: SalespersonReportDto = {
      from: janela.from,
      to: janela.to,
      granularity: grao.granularidade,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total,
      summary: {
        revenueCents: 0,
        orderCount: 0,
        quoteCount: linhas.reduce((soma, linha) => soma + linha.quoteCount, 0),
      },
      rows: rows as unknown as SalespersonRowDto[],
    }
    return HttpResponse.json(corpo)
  }),

  // --------------------------------------------------- ranking de profissional
  http.get('*/api/reports/professional-ranking', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_PROFISSIONAL)
    if ('recusa' in porta) return porta.recusa
    const janela = periodo(url)
    if ('recusa' in janela) return janela.recusa

    // "Só entram pedidos COM profissional", diz o contrato — e pedido é o que o
    // mock não guarda. Montar o ranking a partir de ORÇAMENTO seria trocar a
    // pergunta em silêncio: indicação que virou proposta não é indicação que
    // virou faturamento, e é o segundo número que decide comissão.
    const corpo: ProfessionalRankingReportDto = {
      from: janela.from,
      to: janela.to,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total: 0,
      summary: { revenueCents: 0, orderCount: 0 },
      rows: [],
    }
    return HttpResponse.json(corpo)
  }),

  // ------------------------------------------------ movimentação por fornecedor
  http.get('*/api/reports/supplier-movement', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_FORNECEDOR)
    if ('recusa' in porta) return porta.recusa
    const janela = periodo(url)
    if ('recusa' in janela) return janela.recusa

    const corpo: SupplierMovementReportDto = {
      from: janela.from,
      to: janela.to,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total: 0,
      summary: { quantity: decimal(0), revenueCents: 0 },
      rows: [],
    }
    return HttpResponse.json(corpo)
  }),

  // ------------------------------------------------------- estoque valorizado
  http.get('*/api/reports/stock-valuation', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_ESTOQUE_VALORIZADO)
    if ('recusa' in porta) return porta.recusa

    const asOf = new Date().toISOString()
    const tenantId = tenantAtivo()
    const incluirZero = url.searchParams.get('includeZero') === 'true'
    const soAbaixoDoMinimo = url.searchParams.get('belowMinimumOnly') === 'true'
    const grupo = url.searchParams.get('productGroup')

    // A LINHA INTERNA É NUMÉRICA e vira DTO só depois de ordenar e paginar —
    // ver `paginar`. `valueCents` ausente é item SEM preço, e ele não vale zero:
    // vale desconhecido, e vai para o fim da ordenação nos dois sentidos.
    const linhas = (tenantId ? estoqueDaEmpresa(tenantId, incluirZero) : [])
      .filter((linha) => !grupo || linha.productGroup === grupo)
      .map((linha) => ({
        ...linha,
        valueCents: valorDaLinha(linha),
        belowMinimum: linha.minStock > 0 && linha.quantity < linha.minStock,
      }))
      .filter((linha) => !soAbaixoDoMinimo || linha.belowMinimum)

    const { rows, total } = paginar(linhas, porta.pagina, { campo: 'valueCents', desc: true })

    const dto: StockValuationRowDto[] = rows.map((linha) => ({
      variantId: linha.variantId,
      description: linha.description,
      productGroup: linha.productGroup,
      quantity: decimal(linha.quantity),
      unitPriceCents: linha.unitPriceCents,
      ...seHouver('valueCents', linha.valueCents),
      minStock: decimal(linha.minStock),
      belowMinimum: linha.belowMinimum,
    }))

    const corpo: StockValuationReportDto = {
      asOf,
      // O DÉBITO DECLARADO da #310, e ele viaja no DTO: custo não existe no
      // schema e a decisão D1 (Custo+Índice) não foi tomada, então o estoque sai
      // a preço de VENDA. O dia em que `"cost"` for possível, a tela já sabe
      // olhar para este campo antes de escrever "valorizado" no cabeçalho.
      valuationBasis: 'sale_price',
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total,
      // O `summary` é do PERÍODO INTEIRO, e não da página — regra 2 da #310.
      // Somar as linhas visíveis faria a página 1 de 500 produtos declarar que
      // o estoque vale o dos cinquenta primeiros.
      summary: {
        valueCents: linhas.reduce((soma, linha) => soma + (linha.valueCents ?? 0), 0),
        itemCount: linhas.length,
        belowMinimumCount: linhas.filter((linha) => linha.belowMinimum).length,
        withoutPriceCount: linhas.filter((linha) => linha.unitPriceCents === null).length,
      },
      rows: dto,
    }
    return HttpResponse.json(corpo)
  }),

  // ------------------------------------------------------------ dias sem venda
  http.get('*/api/reports/stock-aging', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_DIAS_SEM_VENDA)
    if ('recusa' in porta) return porta.recusa

    const agora = new Date()
    const tenantId = tenantAtivo()
    const incluirZero = url.searchParams.get('includeZero') === 'true'
    const grupo = url.searchParams.get('productGroup')
    const minimoDeDias = Number(url.searchParams.get('minDaysWithoutSale') ?? '0')
    if (!Number.isInteger(minimoDeDias) || minimoDeDias < 0) {
      return camposInvalidos([
        {
          path: 'minDaysWithoutSale',
          message: 'Informe um número inteiro de dias, a partir de 0.',
        },
      ])
    }

    // TODO ITEM SAI COMO NUNCA VENDIDO, e não é enchimento: `store.movimentos`
    // nasce vazio e o mock não guarda pedido de venda. `lastSaleAt` e
    // `daysWithoutSale` ficam AUSENTES — o `null` do primeiro seria uma data
    // desconhecida com cara de resposta, e zero no segundo diria "vendeu hoje".
    //
    // E quem nunca vendeu SATISFAZ qualquer `minDaysWithoutSale`: está parado há
    // mais tempo que qualquer corte. Excluí-lo faria o filtro esconder
    // exatamente o pior caso que ele existe para encontrar.
    const linhas = (tenantId ? estoqueDaEmpresa(tenantId, incluirZero) : [])
      .filter((linha) => !grupo || linha.productGroup === grupo)
      .map((linha) => ({
        ...linha,
        valueCents: valorDaLinha(linha),
        daysInStock: diasDesde(linha.desde, agora),
      }))

    const { rows, total } = paginar(linhas, porta.pagina, {
      campo: 'daysWithoutSale',
      desc: true,
    })

    const dto: StockAgingRowDto[] = rows.map((linha) => ({
      variantId: linha.variantId,
      description: linha.description,
      productGroup: linha.productGroup,
      quantity: decimal(linha.quantity),
      ...seHouver('valueCents', linha.valueCents),
      ...seHouver('daysInStock', linha.daysInStock),
    }))

    const corpo: StockAgingReportDto = {
      asOf: agora.toISOString(),
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total,
      summary: {
        itemCount: linhas.length,
        neverSoldCount: linhas.length,
        valueCents: linhas.reduce((soma, linha) => soma + (linha.valueCents ?? 0), 0),
      },
      rows: dto,
    }
    return HttpResponse.json(corpo)
  }),

  // -------------------------------------------------------- orçamento × estoque
  http.get('*/api/reports/quote-vs-stock', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_ORCAMENTO_X_ESTOQUE)
    if ('recusa' in porta) return porta.recusa
    const janela = periodo(url)
    if ('recusa' in janela) return janela.recusa

    const tenantId = tenantAtivo()
    const soFalta = url.searchParams.get('shortageOnly') === 'true'

    // SÓ ORÇAMENTOS ATIVOS (cancelado não promete nada) e SÓ linhas com variante
    // do catálogo — item digitado livre não tem saldo com que comparar. As 17
    // linhas da §8.1 nascem com `variantId: null`, então este relatório sai
    // VAZIO no seed: é a regra do contrato aplicada ao dado que existe.
    const prometido = new Map<string, { quantity: number; quotes: Set<string> }>()
    if (tenantId) {
      for (const orcamento of orcamentosParaRelatorio()) {
        if (orcamento.cancelled) continue
        if (!orcamento.issuedAt) continue
        if (orcamento.issuedAt < janela.from || orcamento.issuedAt > janela.to) continue
        for (const item of orcamento.items) {
          if (!item.variantId) continue
          const atual = prometido.get(item.variantId) ?? { quantity: 0, quotes: new Set<string>() }
          atual.quantity += item.quantity
          atual.quotes.add(orcamento.id)
          prometido.set(item.variantId, atual)
        }
      }
    }

    const saldos = new Map(
      (tenantId ? estoqueDaEmpresa(tenantId, true) : []).map((linha) => [linha.variantId, linha]),
    )
    const linhas = [...prometido.entries()]
      .map(([variantId, pedido]) => {
        const emCasa = saldos.get(variantId)
        const emEstoque = emCasa?.quantity ?? 0
        return {
          variantId,
          description: emCasa?.description ?? variantId,
          quotedQuantity: pedido.quantity,
          stockQuantity: emEstoque,
          // A SOMA DOS ORÇAMENTOS NÃO DESCONTA o que já virou pedido, e é
          // deliberado: o pedido consome estoque por conta própria, e abater
          // aqui esconderia o compromisso duas vezes.
          shortageQuantity: Math.max(0, pedido.quantity - emEstoque),
          quoteCount: pedido.quotes.size,
        }
      })
      .filter((linha) => !soFalta || linha.shortageQuantity > 0)

    const { rows, total } = paginar(linhas, porta.pagina, {
      campo: 'shortageQuantity',
      desc: true,
    })

    const dto: QuoteVsStockRowDto[] = rows.map((linha) => ({
      variantId: linha.variantId,
      description: linha.description,
      quotedQuantity: decimal(linha.quotedQuantity),
      stockQuantity: decimal(linha.stockQuantity),
      shortageQuantity: decimal(linha.shortageQuantity),
      quoteCount: linha.quoteCount,
      sufficient: linha.shortageQuantity === 0,
    }))

    const corpo: QuoteVsStockReportDto = {
      from: janela.from,
      to: janela.to,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total,
      summary: {
        variantCount: linhas.length,
        shortageCount: linhas.filter((linha) => linha.shortageQuantity > 0).length,
      },
      rows: dto,
    }
    return HttpResponse.json(corpo)
  }),

  // ------------------------------------------------------------ aniversariantes
  http.get('*/api/reports/birthdays', ({ request }) => {
    const url = new URL(request.url)
    const porta = fronteira(url, ORDENAVEIS_ANIVERSARIANTES)
    if ('recusa' in porta) return porta.recusa

    const mes = Number(url.searchParams.get('month') ?? '')
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return camposInvalidos([{ path: 'month', message: 'Informe o mês, de 1 a 12.' }])
    }

    const papel = url.searchParams.get('role')
    if (papel && !['customer', 'professional', 'supplier'].includes(papel)) {
      return camposInvalidos([{ path: 'role', message: `Papel inválido: ${papel}.` }])
    }

    const tenantId = tenantAtivo()
    const hoje = new Date()

    // SÓ OS VINCULADOS à empresa ativa e ATIVOS: parceiro do grupo sem vínculo
    // com esta empresa não é cliente desta loja, e a lista de aniversário é a
    // lista de quem se liga.
    const linhas: BirthdayRowDto[] = (tenantId ? store.parceiros : [])
      .filter((parceiro) => {
        const vinculo = tenantId ? parceiro.vinculos[tenantId] : undefined
        if (!vinculo || !vinculo.active) return false
        if (!parceiro.birthDate) return false
        if (Number(parceiro.birthDate.slice(5, 7)) !== mes) return false
        if (papel === 'customer' && !parceiro.isCustomer) return false
        if (papel === 'professional' && !parceiro.isProfessional) return false
        if (papel === 'supplier' && !parceiro.isSupplier) return false
        return true
      })
      .map((parceiro) => {
        const nascimento = parceiro.birthDate as string
        return {
          partnerId: parceiro.id,
          name: parceiro.tradeName || parceiro.legalName,
          birthDate: nascimento,
          day: Number(nascimento.slice(8, 10)),
          // A IDADE QUE ELE COMPLETA NESTE ANO, não a de hoje: a lista serve
          // para dar os parabéns, e no dia 3 do mês a idade "atual" de quem faz
          // no dia 20 estaria um ano atrás do que a mensagem vai dizer.
          age: hoje.getFullYear() - Number(nascimento.slice(0, 4)),
          mobilePhone: parceiro.mobilePhone,
          email: parceiro.email,
          isCustomer: parceiro.isCustomer,
          isProfessional: parceiro.isProfessional,
        }
      })

    const { rows, total } = paginar(linhas as unknown as Record<string, unknown>[], porta.pagina, {
      campo: 'day',
      desc: false,
    })

    const corpo: BirthdaysReportDto = {
      month: mes,
      page: porta.pagina.page,
      pageSize: porta.pagina.pageSize,
      total,
      summary: {
        partnerCount: linhas.length,
        // Aniversariante sem telefone e sem e-mail é linha que a operação não
        // consegue USAR — o número existe para a tela poder dizer quantos da
        // lista não têm por onde ser parabenizados.
        withoutContactCount: linhas.filter((linha) => !linha.mobilePhone && !linha.email).length,
      },
      rows: rows as unknown as BirthdayRowDto[],
    }
    return HttpResponse.json(corpo)
  }),
]
