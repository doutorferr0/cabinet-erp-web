import type { PagedResult, TableQueryState } from '@/lib/table-query'

/**
 * Provider mock compartilhado: aplica q/sort/paginação COMO SE fosse o servidor,
 * com latência simulada (testes passam 0). Cada mock entrega só o predicado de
 * busca — o resto do comportamento é idêntico em todas as listagens.
 *
 * TODO(contract): sai inteiro quando o fetcher virar chamada gerada do OpenAPI.
 */

/** Minúsculas sem acento — a busca da listagem ignora ambos. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), 'pt-BR')
}

/** Recebe o termo já normalizado; use `normalize()` nos campos comparados. */
export type MockMatcher<T> = (row: T, q: string) => boolean

export function pagedMock<T>(
  all: readonly T[],
  state: TableQueryState,
  matches: MockMatcher<T>,
  delayMs = 300,
): Promise<PagedResult<T>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = normalize(state.q.trim())
      let rows = q ? all.filter((row) => matches(row, q)) : [...all]

      if (state.sort) {
        const key = state.sort.id as keyof T
        const dir = state.sort.desc ? -1 : 1
        rows = [...rows].sort((a, b) => dir * compareValues(a[key], b[key]))
      }

      const total = rows.length
      const start = (state.page - 1) * state.pageSize
      resolve({ rows: rows.slice(start, start + state.pageSize), total })
    }, delayMs)
  })
}

/** Leitura de um registro só (`fetchX(id)`), com a mesma latência simulada. */
export function mockDelay<T>(value: T, delayMs = 200): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delayMs)
  })
}
