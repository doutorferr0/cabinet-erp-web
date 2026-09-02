import type {
  NavCountersDto,
  OpportunitiesSummaryDto,
  PurchaseOrdersSummaryDto,
  QuotesSummaryDto,
  StockSummaryDto,
} from '@/api/gerado'
import { diaLocalISO, mesDe, mesDeslocado } from '@/lib/datas'
import { http, HttpResponse } from 'msw'
import { ordensParaAgregado, recebimentosPendentes } from './compras'
import { crm } from './crm'
import { pedidosAbertos } from './pedidos'
import { semSessao } from './problema'
import { orcamentosParaAgregado } from './quotes'
import { store } from './store'

/**
 * OS CINCO AGREGADOS DE KPI no modo mock (#479, D11 da Reface 2.0) — os quatro
 * resumos por família mais os contadores da navegação.
 *
 * ## Por que um arquivo só, e não um resumo dentro de cada módulo
 *
 * Porque o consumidor é UM: a faixa de KPI, que é o mesmo componente em todas as
 * listagens. Espalhar os cinco handlers pelos cinco módulos poria a mesma
 * decisão de desenho — *quais quatro números cabem numa faixa* — em cinco
 * arquivos, e ela derivaria. O ESTADO continua onde estava: cada módulo exporta
 * o seu leitor (`ordensParaAgregado`, `orcamentosParaAgregado`,
 * `pedidosAbertos`) e este arquivo só compõe. Nenhum `estado` privado é lido
 * daqui, e é isso que impede a faixa de contar "aberto" diferente da grade que
 * ela encima.
 *
 * ## Nada aqui inventa histórico
 *
 * A série da sparkline sai das DATAS dos próprios documentos do mock, agrupadas
 * por mês. Mês sem documento vale zero, e os meses inteiramente vazios ANTES do
 * primeiro documento são cortados — série que começa com seis zeros desenha uma
 * queda que nunca houve, e o contrato já declara que menos de doze pontos é
 * resposta legítima.
 *
 * A consequência é honesta e visível: seed magro dá sparkline curta. Preenchê-la
 * com um perfil bonito daria ao operador do site público um gráfico que não
 * descreve nada — o mesmo defeito que `AvisoDeCobertura` existe para não
 * cometer.
 */

/** Doze meses FECHADOS, do mais antigo para o mais recente. `2026-08`, ... */
export function mesesFechados(qtd = 12, hoje: Date = new Date()): string[] {
  const atual = mesDe(hoje)
  const chaves: string[] = []
  for (let passos = qtd; passos >= 1; passos--) {
    const { ano, mes } = mesDeslocado(atual, -passos)
    chaves.push(`${ano}-${String(mes).padStart(2, '0')}`)
  }
  return chaves
}

/** `2026-08-31` → `2026-08`. Data ausente não entra em mês nenhum. */
function mesDaData(iso: string | null): string | null {
  return iso ? iso.slice(0, 7) : null
}

/**
 * Soma `valor` por mês sobre a janela fechada, cortando os zeros da FRENTE.
 *
 * Só os da frente: zero no meio é informação (mês em que ninguém vendeu), zero
 * antes do primeiro documento é ausência de histórico. Confundir os dois faz a
 * sparkline de uma empresa nova mostrar um tombo.
 */
export function serieMensal(
  linhas: readonly { data: string | null; valor: number }[],
  hoje: Date = new Date(),
): number[] {
  const porMes = new Map<string, number>()
  for (const { data, valor } of linhas) {
    const chave = mesDaData(data)
    if (!chave) continue
    porMes.set(chave, (porMes.get(chave) ?? 0) + valor)
  }

  const serie = mesesFechados(12, hoje).map((chave) => porMes.get(chave) ?? 0)
  const primeiro = serie.findIndex((v) => v !== 0)
  return primeiro === -1 ? [] : serie.slice(primeiro)
}

/** O mês corrente e o anterior fechado, em chave `AAAA-MM`. */
function mesCorrenteEAnterior(hoje: Date = new Date()): [string, string] {
  const atual = mesDe(hoje)
  const anterior = mesDeslocado(atual, -1)
  return [
    `${atual.ano}-${String(atual.mes).padStart(2, '0')}`,
    `${anterior.ano}-${String(anterior.mes).padStart(2, '0')}`,
  ]
}

/** Dia de hoje e o de daqui a 7 dias — a janela de "vence nesta semana". */
function janelaDaSemana(): [string, string] {
  return [diaLocalISO(), diaLocalISO(new Date(Date.now() + 7 * 86_400_000))]
}

// ------------------------------------------------------------------ compras

function resumoDeOrdensDeCompra(tenantId: string): PurchaseOrdersSummaryDto {
  const ordens = ordensParaAgregado(tenantId)
  const [mesAtual, mesAnterior] = mesCorrenteEAnterior()
  const [hoje, emUmaSemana] = janelaDaSemana()

  const abertas = ordens.filter((o) => o.status !== 'cancelled' && !o.recebidaPorInteiro)
  const somaDoMes = (mes: string) =>
    ordens
      .filter((o) => o.status !== 'cancelled' && mesDaData(o.orderedAt) === mes)
      .reduce((soma, o) => soma + o.totalCents, 0)

  return {
    openOrders: abertas.length,
    openOrdersValueCents: abertas.reduce((soma, o) => soma + o.totalCents, 0),
    lateOrders: abertas.filter((o) => o.expectedAt !== null && o.expectedAt < hoje).length,
    arrivingThisWeek: abertas.filter(
      (o) => o.expectedAt !== null && o.expectedAt >= hoje && o.expectedAt <= emUmaSemana,
    ).length,
    monthValueCents: somaDoMes(mesAtual),
    previousMonthValueCents: somaDoMes(mesAnterior),
    monthlyValueSeries: serieMensal(
      ordens
        .filter((o) => o.status !== 'cancelled')
        .map((o) => ({ data: o.orderedAt, valor: o.totalCents })),
    ),
  }
}

// ------------------------------------------------------------------- vendas

function resumoDeOrcamentos(): QuotesSummaryDto {
  const orcamentos = orcamentosParaAgregado()
  const [mesAtual, mesAnterior] = mesCorrenteEAnterior()
  const [hoje, emUmaSemana] = janelaDaSemana()

  // Aberto = não cancelado e ainda não fechado. `dataFechamento` é o carimbo de
  // "virou pedido", e é ele que tira o orçamento da fila — não a validade, que
  // vence sem fechar nada.
  const abertos = orcamentos.filter((o) => !o.cancelado && o.dataFechamento === null)

  return {
    openQuotes: abertos.length,
    openQuotesValueCents: abertos.reduce((soma, o) => soma + o.totalCents, 0),
    expiringThisWeek: abertos.filter(
      (o) => o.dataValidade !== null && o.dataValidade >= hoje && o.dataValidade <= emUmaSemana,
    ).length,
    wonThisMonth: orcamentos.filter((o) => mesDaData(o.dataFechamento) === mesAtual).length,
    monthValueCents: orcamentos
      .filter((o) => !o.cancelado && mesDaData(o.dataEmissao) === mesAtual)
      .reduce((soma, o) => soma + o.totalCents, 0),
    previousMonthValueCents: orcamentos
      .filter((o) => !o.cancelado && mesDaData(o.dataEmissao) === mesAnterior)
      .reduce((soma, o) => soma + o.totalCents, 0),
    monthlyValueSeries: serieMensal(
      orcamentos
        .filter((o) => !o.cancelado)
        .map((o) => ({ data: o.dataEmissao, valor: o.totalCents })),
    ),
  }
}

// ------------------------------------------------------------------ estoque

function resumoDeEstoque(): StockSummaryDto {
  const variantes = store.produtos.flatMap((p) => p.variants ?? []).filter((v) => v.active)
  const [mesAtual] = mesCorrenteEAnterior()

  // Valoração PELO PREÇO, e variante sem preço fica FORA da soma — é o critério
  // que `GET /api/reports/stock-valuation` já usa, e o KPI não pode estrear um
  // segundo. Somar zero pela variante sem preço faria buraco de cadastro
  // aparecer como estoque barato; ele sai contado em `unpricedVariants`.
  const comPreco = variantes.filter((v) => v.priceCents !== null)
  const valor = comPreco.reduce((soma, v) => soma + (v.stockQty ?? 0) * (v.priceCents ?? 0), 0)

  // O mock não guarda fotografia de fechamento: o saldo é UM, o de agora. O
  // valor do mês anterior sai do mesmo número, e por isso a variação nasce em
  // zero — que é a resposta honesta de quem não tem histórico, e não um número
  // bonito. O servidor de verdade tem a fotografia; o mock diz que não tem.
  return {
    variantCount: variantes.length,
    criticalItems: variantes.filter((v) => (v.stockQty ?? 0) < (v.minStock ?? 0)).length,
    stockValueCents: valor,
    previousMonthStockValueCents: valor,
    unpricedVariants: variantes.length - comPreco.length,
    movementsThisMonth: store.movimentos.filter((m) => mesDaData(m.occurredAt) === mesAtual).length,
    // A série é a CONTAGEM de movimentos por mês, não o valor: o KPI que ela
    // acompanha é `movementsThisMonth`. Sparkline de valor ao lado de um número
    // de contagem seria duas unidades no mesmo cartão.
    monthlyValueSeries: serieMensal(
      store.movimentos.map((m) => ({ data: m.occurredAt, valor: 1 })),
    ),
  }
}

// ---------------------------------------------------------------------- crm

/** Estágios que não são de ganho nem de perda — as colunas abertas do funil. */
function estagiosAbertos(): Set<string> {
  return new Set(crm.estagios.filter((e) => !e.isWon && !e.isLost).map((e) => e.id))
}

function resumoDeOportunidades(): OpportunitiesSummaryDto {
  const abertos = estagiosAbertos()
  const ganhos = new Set(crm.estagios.filter((e) => e.isWon).map((e) => e.id))
  const probabilidade = new Map(crm.estagios.map((e) => [e.id, e.probability]))
  const [mesAtual, mesAnterior] = mesCorrenteEAnterior()

  const abertas = crm.oportunidades.filter((o) => abertos.has(o.stageId))
  const ganhasNoMes = (mes: string) =>
    crm.oportunidades.filter((o) => ganhos.has(o.stageId) && mesDaData(o.closedAt) === mes)

  return {
    openOpportunities: abertas.length,
    openValueCents: abertas.reduce((soma, o) => soma + (o.expectedValueCents ?? 0), 0),
    // `probability` é int com 4 casas implícitas (`1000000` = 100%), a mesma
    // convenção de `discountPercent`. Dividir por 1_000_000 devolve a fração.
    weightedValueCents: abertas.reduce(
      (soma, o) =>
        soma +
        Math.round(((o.expectedValueCents ?? 0) * (probabilidade.get(o.stageId) ?? 0)) / 1_000_000),
      0,
    ),
    wonThisMonth: ganhasNoMes(mesAtual).length,
    wonThisMonthCents: ganhasNoMes(mesAtual).reduce(
      (soma, o) => soma + (o.expectedValueCents ?? 0),
      0,
    ),
    previousMonthWonCents: ganhasNoMes(mesAnterior).reduce(
      (soma, o) => soma + (o.expectedValueCents ?? 0),
      0,
    ),
    monthlyWonSeries: serieMensal(
      crm.oportunidades
        .filter((o) => ganhos.has(o.stageId))
        .map((o) => ({ data: o.closedAt, valor: o.expectedValueCents ?? 0 })),
    ),
  }
}

// ---------------------------------------------------------------------- nav

function contadoresDaNavegacao(tenantId: string): NavCountersDto {
  const hoje = diaLocalISO()
  const variantes = store.produtos.flatMap((p) => p.variants ?? []).filter((v) => v.active)

  return {
    quotesOpen: orcamentosParaAgregado().filter((o) => !o.cancelado && o.dataFechamento === null)
      .length,
    ordersOpen: pedidosAbertos(),
    purchaseOrdersOpen: ordensParaAgregado(tenantId).filter(
      (o) => o.status !== 'cancelled' && !o.recebidaPorInteiro,
    ).length,
    goodsReceiptsPending: recebimentosPendentes(tenantId),
    opportunitiesOpen: crm.oportunidades.filter((o) => estagiosAbertos().has(o.stageId)).length,
    tasksDue: store.tarefas.filter((t) => t.status !== 'done' && t.dueOn && t.dueOn <= hoje).length,
    todosOpen: store.todos.filter((t) => !t.done).length,
    stockCritical: variantes.filter((v) => (v.stockQty ?? 0) < (v.minStock ?? 0)).length,
  }
}

// ----------------------------------------------------------------- handlers

/**
 * Sem empresa ativa TUDO responde zero, e não 409.
 *
 * É a semântica da Etapa 0, a mesma de `GET /api/dashboard/summary`: o domínio
 * responde VAZIO, não erro — e vazio, para número, é zero. Um 409 aqui faria a
 * faixa de KPI derrubar a listagem inteira por não haver empresa escolhida,
 * quando a listagem abaixo dela mostraria a lista vazia sem reclamar.
 */
const ZERADO = {
  purchaseOrders: {
    openOrders: 0,
    openOrdersValueCents: 0,
    lateOrders: 0,
    arrivingThisWeek: 0,
    monthValueCents: 0,
    previousMonthValueCents: 0,
    monthlyValueSeries: [],
  } satisfies PurchaseOrdersSummaryDto,
  quotes: {
    openQuotes: 0,
    openQuotesValueCents: 0,
    expiringThisWeek: 0,
    wonThisMonth: 0,
    monthValueCents: 0,
    previousMonthValueCents: 0,
    monthlyValueSeries: [],
  } satisfies QuotesSummaryDto,
  stock: {
    variantCount: 0,
    criticalItems: 0,
    stockValueCents: 0,
    previousMonthStockValueCents: 0,
    unpricedVariants: 0,
    movementsThisMonth: 0,
    monthlyValueSeries: [],
  } satisfies StockSummaryDto,
  opportunities: {
    openOpportunities: 0,
    openValueCents: 0,
    weightedValueCents: 0,
    wonThisMonth: 0,
    wonThisMonthCents: 0,
    previousMonthWonCents: 0,
    monthlyWonSeries: [],
  } satisfies OpportunitiesSummaryDto,
  nav: {
    quotesOpen: 0,
    ordersOpen: 0,
    purchaseOrdersOpen: 0,
    goodsReceiptsPending: 0,
    opportunitiesOpen: 0,
    tasksDue: 0,
    todosOpen: 0,
    stockCritical: 0,
  } satisfies NavCountersDto,
}

export const handlersDeAgregados = [
  http.get('*/api/purchases/orders-summary', () => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json(ZERADO.purchaseOrders)
    return HttpResponse.json(resumoDeOrdensDeCompra(store.activeTenantId))
  }),

  http.get('*/api/sales/quotes-summary', () => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json(ZERADO.quotes)
    return HttpResponse.json(resumoDeOrcamentos())
  }),

  http.get('*/api/stock/summary', () => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json(ZERADO.stock)
    return HttpResponse.json(resumoDeEstoque())
  }),

  http.get('*/api/crm/opportunities-summary', () => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json(ZERADO.opportunities)
    return HttpResponse.json(resumoDeOportunidades())
  }),

  http.get('*/api/nav/counters', () => {
    if (!store.logado) return semSessao()
    if (!store.activeTenantId) return HttpResponse.json(ZERADO.nav)
    return HttpResponse.json(contadoresDaNavegacao(store.activeTenantId))
  }),
]
