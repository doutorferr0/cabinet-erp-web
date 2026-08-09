import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { mockDelay, normalize, pagedMock } from '@/mocks/query'

/**
 * CAMADA DE DADOS — o único ponto que muda na integração.
 *
 * As telas NUNCA importam de `src/mocks/` diretamente: elas pedem ao provider
 * do recurso (`src/data/index.ts`). Hoje todo provider é mock (regra da fase,
 * CLAUDE.md); quando o backend publicar o OpenAPI, cada `createMock*Provider`
 * vira o cliente gerado pelo codegen (@hey-api/openapi-ts) e nenhum
 * componente de tela muda.
 *
 * Ver `docs/integracao.md` para o passo a passo da troca.
 */

/** Recurso só de consulta: tabelas de apoio e as consultas read-only (§9 padrão 8). */
export interface ListProvider<T> {
  /** Listagem paginada — quem aplica q/sort/paginação é o servidor. */
  list(state: TableQueryState, delayMs?: number): Promise<PagedResult<T>>
}

/**
 * Recurso com cadastro completo. Espelha o que o backend vai expor:
 * `GET /recurso?q&sort&page&pageSize` e `GET /recurso/{id}`.
 */
export interface ResourceProvider<T> extends ListProvider<T> {
  /** Um registro por id; `null` quando não existe. */
  get(id: number, delayMs?: number): Promise<T | null>
  /**
   * Registro em branco para o "Incluir". Local por natureza — o backend não
   * fornece isso; na integração continua sendo default do formulário.
   */
  empty(id: number): T
}

export interface MockListConfig<T> {
  rows: readonly T[]
  /** Predicado da busca; `q` chega normalizado (minúsculo, sem acento). */
  matches: (row: T, q: string) => boolean
  /** Latência simulada; testes passam 0 na chamada. */
  delayMs?: number
}

export function createMockListProvider<T>({
  rows,
  matches,
  delayMs = 300,
}: MockListConfig<T>): ListProvider<T> {
  return {
    list: (state, override = delayMs) => pagedMock(rows, state, matches, override),
  }
}

export function tabelaDeApoio<T extends { codigo: string; nome: string }>({
  rows,
}: {
  rows: readonly T[]
}): ListProvider<T> {
  return createMockListProvider({
    rows,
    matches: (row, q) => row.codigo.includes(q) || normalize(row.nome).includes(q),
    delayMs: 200,
  })
}

export interface MockResourceConfig<T> extends MockListConfig<T> {
  empty: (id: number) => T
  /** Como achar o registro pelo id (default: campo `id`). */
  findById?: (rows: readonly T[], id: number) => T | undefined
  getDelayMs?: number
}

/**
 * Monta um provider a partir de dados em memória. Toda a semântica de
 * servidor (filtro, ordenação, paginação, latência) vive em `pagedMock`.
 */
export function createMockProvider<T extends { id: number }>({
  rows,
  matches,
  empty,
  findById = (all, id) => all.find((r) => r.id === id),
  delayMs = 300,
  getDelayMs = 200,
}: MockResourceConfig<T>): ResourceProvider<T> {
  return {
    ...createMockListProvider({ rows, matches, delayMs }),
    get: (id, override = getDelayMs) => mockDelay(findById(rows, id) ?? null, override),
    empty,
  }
}

/** Reexportado para os predicados de busca dos providers. */
export { normalize }
