/**
 * Contrato de consulta de listagem — tratado COMO SE fosse servidor.
 * O provider mock aplica q/sort/paginação; na integração, o fetcher vira
 * chamada HTTP gerada pelo codegen (@hey-api/openapi-ts) sem tocar nos
 * componentes.
 */

import type { FiltroDaTabela, Juncao } from '@/lib/filtro-de-consulta'

export interface TableSort {
  id: string
  desc: boolean
}

export interface TableQueryState {
  q: string
  sort: TableSort | null
  /** 1-based. */
  page: number
  pageSize: number
  /**
   * Filtros estruturados da listagem (campo + operador + valor).
   *
   * **Opcional de propósito.** Ausência é "sem filtro", e o estado é montado à
   * mão em teste e em provider — exigir `filtros: []` em toda literal só
   * espalharia ruído. Quem oferece a UI de filtro é a tela, declarando os campos
   * filtráveis; quem RESPONDE é o provider, e nem todo provider sabe (ver
   * `createApiListProvider`, que recusa em voz alta em vez de ignorar).
   */
  filtros?: FiltroDaTabela[]
  /** `and` (padrão) ou `or` entre todos os filtros da lista. */
  juncao?: Juncao
}

export interface PagedResult<T> {
  rows: T[]
  total: number
}

// TODO(contract): substituir pelo fetch gerado do OpenAPI na integração.
export type TableFetcher<T> = (state: TableQueryState) => Promise<PagedResult<T>>
