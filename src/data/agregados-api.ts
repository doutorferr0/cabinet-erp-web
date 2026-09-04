import type {
  NavCountersDto,
  OpportunitiesSummaryDto,
  PurchaseOrdersSummaryDto,
  QuotesSummaryDto,
  StockSummaryDto,
} from '@/api/gerado'
import {
  getNavCounters,
  getOpportunitiesSummary,
  getPurchaseOrdersSummary,
  getQuotesSummary,
  getStockSummary,
} from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, repetirSeValeAPena } from '@/data/api-provider'
import { useQuery } from '@tanstack/react-query'

/**
 * FRONTEIRA DOS AGREGADOS DE KPI (#479, D11) — os quatro resumos por família
 * mais os contadores da navegação.
 *
 * ## Por que existe endpoint, e a faixa não soma a página que a grade baixou
 *
 * A faixa encima a grade, e o operador lê as duas como o mesmo assunto. Somar
 * na tela daria o total DA PÁGINA, não do conjunto: vinte linhas de 14 ordens
 * somam quatorze, mas vinte de 400 somam vinte — e o número mudaria ao paginar,
 * sem nada na tela explicando por quê. Pior: com filtro estruturado aplicado, a
 * mesma soma passaria a significar outra coisa sem trocar de rótulo.
 *
 * Por isso o servidor apura e o front só formata. É a mesma decisão de
 * `dashboard-api.ts`, e ela vale mais aqui: lá o resumo é a tela inteira, aqui
 * ele fica a 24px de uma grade que o contradiria.
 *
 * ## Nada aqui deriva percentual do servidor
 *
 * O DTO manda o valor de HOJE e a base de comparação; quem divide é a tela
 * (`variacao`, abaixo). Percentual apurado no servidor é número que o operador
 * não consegue conferir contra nada na tela — dois campos visíveis, ele confere.
 *
 * ## As cinco são `Proposto` e ainda não têm servidor
 *
 * Nasceram no contrato nesta PR; a cópia do `cabinet-erp-api` não as conhece,
 * então no par local respondem **404 `Este caminho não existe no contrato`**
 * (`natureza: 'sem-contrato'` em `rotas-do-backend.ts`). No modo mock quem
 * responde é `src/mocks/api/agregados.ts`, e a tela não sabe a diferença.
 */

/** Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo. */
export const CHAVES = {
  ordensDeCompra: ['agregados', 'ordens-de-compra'] as const,
  orcamentos: ['agregados', 'orcamentos'] as const,
  estoque: ['agregados', 'estoque'] as const,
  oportunidades: ['agregados', 'oportunidades'] as const,
  navegacao: ['agregados', 'navegacao'] as const,
}

export function useResumoDeOrdensDeCompra() {
  return useQuery({
    queryKey: CHAVES.ordensDeCompra,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getPurchaseOrdersSummary()
      return dadosOuErro<PurchaseOrdersSummaryDto>(resposta, 'Falha ao carregar o resumo.')
    },
  })
}

export function useResumoDeOrcamentos() {
  return useQuery({
    queryKey: CHAVES.orcamentos,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getQuotesSummary()
      return dadosOuErro<QuotesSummaryDto>(resposta, 'Falha ao carregar o resumo.')
    },
  })
}

export function useResumoDeEstoque() {
  return useQuery({
    queryKey: CHAVES.estoque,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getStockSummary()
      return dadosOuErro<StockSummaryDto>(resposta, 'Falha ao carregar o resumo.')
    },
  })
}

export function useResumoDeOportunidades() {
  return useQuery({
    queryKey: CHAVES.oportunidades,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getOpportunitiesSummary()
      return dadosOuErro<OpportunitiesSummaryDto>(resposta, 'Falha ao carregar o resumo.')
    },
  })
}

/**
 * Os contadores da navegação, numa leitura só.
 *
 * UMA consulta e não oito: a sidebar mostra os oito ao mesmo tempo, e oito
 * respostas seriam oito instantes no mesmo quadro — o item some de um contador
 * e aparece noutro sem nunca ter existido nos dois.
 */
export function useContadoresDaNavegacao() {
  return useQuery({
    queryKey: CHAVES.navegacao,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getNavCounters()
      return dadosOuErro<NavCountersDto>(resposta, 'Falha ao carregar os contadores.')
    },
  })
}

/**
 * A variação entre um valor e a base, em pontos percentuais inteiros — a
 * derivação que o DTO não manda pronta.
 *
 * **Base zero devolve `null`, e `null` é o que o KPI NÃO desenha.** Crescer de
 * zero para qualquer coisa é infinito, e infinito renderizado como `+100%` é
 * mentira aritmética que o operador não tem como desconfiar. Empresa no
 * primeiro mês cai exatamente nesse caso, e é o mês em que ela mais olha o
 * número.
 */
export function variacao(valor: number, base: number): number | null {
  if (base === 0) return null
  return Math.round(((valor - base) / Math.abs(base)) * 100)
}
