/**
 * Contrato de consulta de listagem — tratado COMO SE fosse servidor.
 * O provider mock aplica q/sort/paginação; na integração, o fetcher vira
 * chamada HTTP gerada pelo codegen (@hey-api/openapi-ts) sem tocar nos
 * componentes.
 */

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
}

export interface PagedResult<T> {
  rows: T[]
  total: number
}

// TODO(contract): substituir pelo fetch gerado do OpenAPI na integração.
export type TableFetcher<T> = (state: TableQueryState) => Promise<PagedResult<T>>
