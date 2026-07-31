import type { ProblemDetails } from '@/api/gerado'
import { client } from '@/api/gerado/client.gen'
import type { ListProvider } from '@/data/provider'
import type { PagedResult, TableQueryState } from '@/lib/table-query'

/**
 * Adaptador de LISTAGEM entre o contrato da UI e a convenção do backend.
 *
 * Fonte: `docs/contrato/contrato-http-listagem.md` do `vitra-erp-dotnet`
 * (Aceito 2026-07-30) — que por sua vez nasceu do `src/lib/table-query.ts` deste
 * repo. Os dois lados descrevem o MESMO shape; mudança aqui = mudança nos dois.
 *
 * A UI carrega o estado da consulta como `{ q, sort: {id, desc}, page, pageSize }`.
 * O backend recebe `q`, `sortBy`, `sortDesc`, `page`, `pageSize` e devolve
 * `{ rows, total }`. A tradução mora aqui, num lugar só — espalhada pelo registry,
 * cada recurso teria a sua versão e a divergência apareceria como bug de
 * ordenação numa tela isolada.
 *
 * Deliberadamente ausente: `get(id)`. O contrato ainda não tem NENHUM endpoint de
 * item por id ("não cobre GET/PUT de agregado nem documentos — contrato próprio
 * quando existirem"), então a forma seria invenção.
 */

/** Teto de `pageSize` do contrato de listagem; acima disso o backend responde 400. */
export const PAGE_SIZE_MAX = 100

/**
 * Erro vindo do servidor, já com o que o operador precisa ver.
 *
 * O contrato manda `application/problem+json` (RFC 9457) em toda falha: o
 * `detail` é a frase que o backend escolheu para o caso. Descartá-la e mostrar
 * "algo deu errado" jogaria fora a única informação acionável da resposta.
 */
export class ErroDaApi extends Error {
  readonly status: number
  readonly detail: string | undefined

  constructor(mensagem: string, status: number, detail?: string) {
    super(mensagem)
    this.name = 'ErroDaApi'
    this.status = status
    this.detail = detail
  }
}

export interface ApiListConfig {
  /** Caminho do recurso, ex.: `/api/catalog-lookups`. */
  url: string
  /**
   * Query fixa do recurso, somada à consulta da tabela (ex.: `{ kind: 'MARCA' }`).
   * Serve para recurso discriminado; some quando o recurso tem rota própria.
   */
  fixa?: Record<string, string | number | boolean>
}

/**
 * Provider de lista sobre a API.
 *
 * O `delayMs` do `ListProvider` é ignorado de propósito: latência simulada é
 * artefato do mock. Aqui a latência é a real, e fingir outra esconderia o
 * comportamento que a tela vai ter em produção.
 */
export function createApiListProvider<T>({ url, fixa }: ApiListConfig): ListProvider<T> {
  return {
    list: async (state: TableQueryState): Promise<PagedResult<T>> => {
      const { data, error, response } = await client.get<PagedResult<T>>({
        url,
        query: { ...fixa, ...queryDaTabela(state) },
      })

      // Falha do servidor NUNCA pode virar lista vazia: "deu erro" e "não há
      // registro" pedem reações opostas do operador.
      if (error || !data) {
        throw new ErroDaApi(
          `Falha ao consultar ${url}.`,
          response?.status ?? 0,
          detalheDoProblema(error),
        )
      }
      return { rows: data.rows ?? [], total: data.total ?? 0 }
    },
  }
}

/**
 * Estado da tabela → parâmetros do backend.
 *
 * As duas guardas (`page` 1-based, `pageSize` até 100) são condições que o
 * contrato manda o servidor rejeitar com 400. Barrar aqui é preferível a mandar
 * requisição sabidamente inválida: o 400 chegaria como "erro do servidor" quando
 * o defeito é de quem chamou.
 *
 * Campo vazio é OMITIDO em vez de viajar vazio: `?q=` e `?sortBy=` fariam o
 * backend distinguir "sem filtro" de "filtro vazio" sem necessidade, e sujariam
 * a chave de cache da consulta. `sortBy` ausente = ordem padrão do recurso.
 */
export function queryDaTabela(state: TableQueryState): Record<string, string | number | boolean> {
  if (state.page < 1) {
    throw new Error(`Página inválida (${state.page}): a paginação do contrato é 1-based.`)
  }
  if (state.pageSize > PAGE_SIZE_MAX) {
    throw new Error(
      `pageSize ${state.pageSize} passa do teto de ${PAGE_SIZE_MAX} do contrato de listagem.`,
    )
  }

  const query: Record<string, string | number | boolean> = {
    page: state.page,
    pageSize: state.pageSize,
  }
  if (state.q) query.q = state.q
  if (state.sort) {
    query.sortBy = state.sort.id
    query.sortDesc = state.sort.desc
  }
  return query
}

/** `detail` do problem+json, quando o corpo do erro seguiu a RFC 9457. */
export function detalheDoProblema(erro: unknown): string | undefined {
  if (!erro || typeof erro !== 'object') return undefined
  const problema = erro as ProblemDetails
  const texto = problema.detail ?? problema.title
  return typeof texto === 'string' && texto.trim() ? texto : undefined
}
