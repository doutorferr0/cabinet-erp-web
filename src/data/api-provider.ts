import { client } from '@/api/gerado/client.gen'
import type { ListProvider } from '@/data/provider'
import type { PagedResult, TableQueryState } from '@/lib/table-query'

/**
 * Adaptador de LISTAGEM entre o contrato da UI e a convenção do backend.
 *
 * A UI carrega o estado da consulta como `{ q, sort: {id, desc}, page, pageSize }`
 * (`src/lib/table-query.ts`). O backend recebe `q`, `sortBy`, `sortDesc`, `page`,
 * `pageSize` e devolve `{ rows, total }`. A tradução mora aqui, num lugar só —
 * espalhada pelo registry, cada recurso teria a sua versão e a divergência
 * apareceria como bug de ordenação numa tela só.
 *
 * Essa convenção NÃO é suposição: é a forma literal de `GET /api/catalog-lookups`,
 * o único endpoint de lista publicado até agora, e é o que o teste exercita.
 *
 * Deliberadamente ausente: `get(id)`. O contrato ainda não tem NENHUM endpoint de
 * item por id, então a forma (rota, 404 vira `null`, id numérico ou uuid) seria
 * invenção. Entra quando o backend publicar o primeiro — ver `docs/integracao.md`.
 */

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
      const { data, error } = await client.get<PagedResult<T>>({
        url,
        query: { ...fixa, ...queryDaTabela(state) },
      })

      // Falha do servidor NUNCA pode virar lista vazia: "deu erro" e "não há
      // registro" pedem reações opostas do operador.
      if (error || !data) throw new Error(`Falha ao consultar ${url}.`)
      return { rows: data.rows ?? [], total: data.total ?? 0 }
    },
  }
}

/**
 * Estado da tabela → parâmetros do backend.
 *
 * Campo vazio é OMITIDO em vez de viajar vazio: `?q=` e `?sortBy=` fariam o
 * backend distinguir "sem filtro" de "filtro vazio" sem necessidade, e sujariam
 * a chave de cache da consulta.
 */
export function queryDaTabela(state: TableQueryState): Record<string, string | number | boolean> {
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
