import type {
  QuoteVsStockReportDto,
  StockAgingReportDto,
  StockValuationReportDto,
} from '@/api/gerado'
import { getQuoteVsStockReport, getStockAgingReport, getStockValuationReport } from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, repetirSeValeAPena } from '@/data/api-provider'
import { useQuery } from '@tanstack/react-query'

/**
 * FRONTEIRA DOS RELATÓRIOS DE ESTOQUE — os três da web#352.
 *
 * `GetStockValuationReport`, `GetStockAgingReport` e `GetQuoteVsStockReport`
 * saem daqui, e não do cliente gerado direto: é a regra de acesso a dado do
 * repositório. Os outros sete relatórios do contrato (#310) ainda não têm tela e
 * por isso não têm hook — entrada de fronteira sem consumidor é código que
 * ninguém exercita.
 *
 * ## Por que o envelope INTEIRO, e não `{rows,total}`
 *
 * `VitraDataTable` recebe um `TableFetcher` que devolve linhas e total, e é o
 * caminho certo para listagem de cadastro. Relatório não cabe nele: o `summary`
 * é do RECORTE INTEIRO e as `rows` são da PÁGINA, e os dois vêm na MESMA
 * resposta de propósito. Espremer o envelope em `{rows,total}` obrigaria a tela
 * a pedir o total por outra chamada, com outros parâmetros e outro instante — e
 * duas apurações do mesmo número divergem no primeiro arredondamento.
 *
 * ## O ECO do depósito é uma resposta, não um enfeite
 *
 * O recorte por depósito (`warehouseId`) é novo no contrato e o servidor pode
 * ainda não sabê-lo: o saldo agregado por empresa (`product_tenant.stock_qty`)
 * não tem a dimensão, e quem responder por ele devolve 200 com o total da
 * empresa. O envelope ecoa `warehouseId`, e `recorteDoEnvelope` transforma esse
 * eco na única pergunta que a tela precisa fazer antes de escrever o nome do
 * depósito num cabeçalho: **o servidor recortou, ou só respondeu?**
 */

/** Chaves de cache num lugar só — a consulta inteira entra na chave. */
export const CHAVES_RELATORIOS = {
  estoqueValorizado: (consulta: ConsultaDeEstoqueValorizado) =>
    ['relatorios', 'estoque-valorizado', consulta] as const,
  estoqueParado: (consulta: ConsultaDeEstoqueParado) =>
    ['relatorios', 'estoque-parado', consulta] as const,
  orcadoContraEstoque: (consulta: ConsultaDeOrcadoContraEstoque) =>
    ['relatorios', 'orcado-contra-estoque', consulta] as const,
}

/**
 * O que toda consulta de relatório de estoque tem: a página, a ordem e o
 * depósito. `null` em `sortBy` é "a ordem padrão do relatório", que o contrato
 * declara por operação — mandar `sortBy=` vazio faria o servidor distinguir
 * ausência de vazio sem necessidade.
 */
interface ConsultaComum {
  warehouseId: string | null
  sortBy: string | null
  sortDesc: boolean
  page: number
  pageSize: number
}

export interface ConsultaDeEstoqueValorizado extends ConsultaComum {
  productGroup: string | null
  includeZero: boolean
  belowMinimumOnly: boolean
}

export interface ConsultaDeEstoqueParado extends ConsultaComum {
  productGroup: string | null
  includeZero: boolean
  minDaysWithoutSale: number
}

export interface ConsultaDeOrcadoContraEstoque extends ConsultaComum {
  from: string
  to: string
  shortageOnly: boolean
}

/**
 * A consulta da tela → os parâmetros do contrato.
 *
 * **Campo vazio é OMITIDO**, mesma regra de `queryDaTabela`: `?warehouseId=` e
 * `?sortBy=` fariam o servidor separar "sem recorte" de "recorte vazio", e o
 * primeiro é o comportamento padrão, não um valor.
 */
function comuns(consulta: ConsultaComum): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {
    page: consulta.page,
    pageSize: consulta.pageSize,
  }
  if (consulta.warehouseId) query.warehouseId = consulta.warehouseId
  if (consulta.sortBy) {
    query.sortBy = consulta.sortBy
    query.sortDesc = consulta.sortDesc
  }
  return query
}

/**
 * O que o servidor fez com o `warehouseId` que a tela pediu.
 *
 * - `empresa` — ninguém pediu recorte; a resposta é da empresa inteira e está
 *   certa assim.
 * - `confirmado` — o eco bate com o pedido: os números são daquele depósito.
 * - `ignorado` — pediu-se recorte e o eco não confirma (veio ausente, nulo ou
 *   de outro depósito). **A resposta é da empresa inteira com nome de
 *   depósito**, e é o caso que a tela precisa dizer em voz alta em vez de
 *   rotular a coluna e deixar o operador concluir sozinho.
 *
 * Função pura e exportada de propósito: é a regra, e o teste a exercita sem
 * montar tela.
 */
export type Recorte =
  | { estado: 'empresa' }
  | { estado: 'confirmado'; warehouseId: string }
  | { estado: 'ignorado'; warehouseId: string }

export function recorteDoEnvelope(
  pedido: string | null,
  ecoado: string | null | undefined,
): Recorte {
  if (!pedido) return { estado: 'empresa' }
  if (ecoado === pedido) return { estado: 'confirmado', warehouseId: pedido }
  return { estado: 'ignorado', warehouseId: pedido }
}

/**
 * Estoque valorizado — a foto do agora, sem período.
 *
 * `asOf` do envelope é o instante da foto e a tela o exibe: sem ele, o relatório
 * impresso às 9h é indistinguível do das 18h. `valuationBasis` diz sobre qual
 * preço a valoração foi feita — hoje só `sale_price`, e a tela escreve isso a
 * partir do que o servidor afirma, não do que supõe.
 */
export function useEstoqueValorizado(consulta: ConsultaDeEstoqueValorizado) {
  return useQuery({
    queryKey: CHAVES_RELATORIOS.estoqueValorizado(consulta),
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getStockValuationReport({
        ...comuns(consulta),
        ...(consulta.productGroup ? { productGroup: consulta.productGroup } : {}),
        includeZero: consulta.includeZero,
        belowMinimumOnly: consulta.belowMinimumOnly,
      })
      return dadosOuErro<StockValuationReportDto>(
        resposta,
        'Falha ao carregar o estoque valorizado.',
      )
    },
  })
}

/**
 * Estoque parado — quantidade, dias sem venda e última venda.
 *
 * `minDaysWithoutSale` viaja SEMPRE, inclusive zero: zero é o padrão do
 * contrato e omiti-lo daria o mesmo resultado, mas mandá-lo mantém a chave de
 * cache igual à consulta que a tela mostra na barra.
 */
export function useEstoqueParado(consulta: ConsultaDeEstoqueParado) {
  return useQuery({
    queryKey: CHAVES_RELATORIOS.estoqueParado(consulta),
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getStockAgingReport({
        ...comuns(consulta),
        ...(consulta.productGroup ? { productGroup: consulta.productGroup } : {}),
        includeZero: consulta.includeZero,
        minDaysWithoutSale: consulta.minDaysWithoutSale,
      })
      return dadosOuErro<StockAgingReportDto>(resposta, 'Falha ao carregar o estoque parado.')
    },
  })
}

/**
 * Orçado × estoque — o que foi prometido contra o que existe em casa.
 *
 * `from`/`to` são OBRIGATÓRIOS no contrato, e por isso não são opcionais aqui:
 * agregação sem recorte de período responde outra pergunta e cresce para
 * sempre.
 */
export function useOrcadoContraEstoque(consulta: ConsultaDeOrcadoContraEstoque) {
  return useQuery({
    queryKey: CHAVES_RELATORIOS.orcadoContraEstoque(consulta),
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getQuoteVsStockReport({
        ...comuns(consulta),
        from: consulta.from,
        to: consulta.to,
        shortageOnly: consulta.shortageOnly,
      })
      return dadosOuErro<QuoteVsStockReportDto>(
        resposta,
        'Falha ao carregar o comparativo de orçamento e estoque.',
      )
    },
  })
}
