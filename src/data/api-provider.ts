import type { ProblemDetails } from '@/api/gerado'
import { client } from '@/api/gerado/client.gen'
import type { ListProvider } from '@/data/provider'
import type { PagedResult, TableQueryState } from '@/lib/table-query'

/**
 * Adaptador de LISTAGEM entre o contrato da UI e a convenção de listagem HTTP.
 *
 * A convenção nasceu do `src/lib/table-query.ts` deste repo e está registrada em
 * `docs/integracao.md` (semânticas inegociáveis) — é o front que a define, e quem
 * implementar o contrato honra o mesmo shape.
 *
 * A UI carrega o estado da consulta como `{ q, sort: {id, desc}, page, pageSize }`.
 * O servidor recebe `q`, `sortBy`, `sortDesc`, `page`, `pageSize` e devolve
 * `{ rows, total }`. A tradução mora aqui, num lugar só — espalhada pelo registry,
 * cada recurso teria a sua versão e a divergência apareceria como bug de
 * ordenação numa tela isolada.
 *
 * O item por id (`itemOuNulo`) entrou com o primeiro `GET /api/{recurso}/{id}` do
 * contrato (produtos) — antes disso, rota e código de "não encontrado" seriam
 * invenção.
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
  /**
   * O corpo do problem+json como veio.
   *
   * A RFC 9457 permite **membros de extensão**, e o backend usa isso para dizer
   * o que fazer a seguir (`existingPartnerId` no 409 de documento repetido).
   * Guardar só `status` e `detail` jogaria fora justamente a parte acionável —
   * e a tela ficaria com uma frase que descreve a saída sem poder tomá-la.
   */
  readonly corpo: unknown

  constructor(mensagem: string, status: number, detail?: string, corpo?: unknown) {
    super(mensagem)
    this.name = 'ErroDaApi'
    this.status = status
    this.detail = detail
    this.corpo = corpo
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
 * Política de repetição das consultas HTTP (`retry` do TanStack Query).
 *
 * **4xx não se repete.** É a resposta do servidor sobre O PEDIDO: 404 não vai
 * virar 200, e 409 "nenhuma empresa ativa" espera uma AÇÃO da pessoa. Com a
 * repetição padrão (3 tentativas com espera crescente), a tela fica ~7s em
 * esqueleto antes de dizer o que já se sabia na primeira resposta.
 *
 * 5xx e falha de rede continuam repetindo — aí repetir resolve mesmo.
 */
export function repetirSeValeAPena(tentativa: number, erro: unknown): boolean {
  if (erro instanceof ErroDaApi && erro.status >= 400 && erro.status < 500) return false
  return tentativa < 3
}

/** Retorno do cliente gerado, na forma que o `@hey-api` devolve sem `throwOnError`. */
export interface RespostaDaApi<T> {
  data?: T | undefined
  error?: unknown
  /** Ausente quando a requisição não chegou a ter resposta (rede fora). */
  response?: Response | undefined
}

/**
 * Item por id: o registro, ou `null` quando não existe.
 *
 * **404 é resposta, não falha.** "Não existe" é resultado legítimo de uma consulta
 * por id (o operador digitou um código morto, o registro foi removido em outra
 * sessão) e a tela já sabe dizer isso. Qualquer OUTRO status rejeita: 409 sem
 * empresa ativa e 500 viram "não encontrado" se forem tratados juntos, e aí o
 * operador procura um registro que está lá.
 */
export function itemOuNulo<T>(resposta: RespostaDaApi<T>, onde: string): T | null {
  if (resposta.response?.status === 404) return null
  if (resposta.error || !resposta.data) {
    throw new ErroDaApi(
      `Falha ao consultar ${onde}.`,
      resposta.response?.status ?? 0,
      detalheDoProblema(resposta.error),
      resposta.error,
    )
  }
  return resposta.data
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
