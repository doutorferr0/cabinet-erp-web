import type { ProblemDetails } from '@/api/gerado'
import { apiFetch } from '@/api/http'
import type { ListProvider } from '@/data/provider'
import { filtrosValidos } from '@/lib/filtro-de-consulta'
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
 * ## A porta única decide o que é falha
 *
 * O cliente gerado (Orval) devolve `{ data, status, headers }` e NUNCA lança por
 * status HTTP — quem converte status em decisão são os helpers daqui
 * (`dadosOuErro`, `itemOuNulo`, `respostaOk`). Espalhar `if (status...)` pelos
 * módulos recriaria em cada um a chance de tratar 404 como erro ou 409 como
 * "não encontrado".
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

/**
 * Resposta do transporte (`apiFetch`), na convenção do cliente gerado.
 *
 * Os tipos gerados por operação (`getProductResponse` etc.) são uniões
 * discriminadas por `status` — todos assinam esta forma estrutural, e é ela que
 * os helpers recebem. `status: 0` = a requisição nem chegou a ter resposta
 * (rede fora); o union gerado não o declara porque o gerador só conhece o
 * contrato.
 */
export interface RespostaDaApi {
  data?: unknown
  status: number
  headers?: Headers
}

/** 2xx. `status: 0` (rede fora) e qualquer 4xx/5xx ficam de fora. */
export function respostaOk(resposta: RespostaDaApi): boolean {
  return resposta.status >= 200 && resposta.status < 300
}

/**
 * O corpo do sucesso, ou `ErroDaApi` — o caminho padrão de toda leitura/escrita
 * que espera corpo. O `corpo` do erro viaja inteiro no `ErroDaApi`: é dele que
 * sai o membro de extensão do problem+json (`idDoParceiroExistente`).
 */
export function dadosOuErro<T>(resposta: RespostaDaApi, mensagem: string): T {
  if (!respostaOk(resposta) || resposta.data === undefined) {
    throw new ErroDaApi(mensagem, resposta.status, detalheDoProblema(resposta.data), resposta.data)
  }
  return resposta.data as T
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
export function itemOuNulo<T>(resposta: RespostaDaApi, onde: string): T | null {
  if (resposta.status === 404) return null
  return dadosOuErro<T>(resposta, `Falha ao consultar ${onde}.`)
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
 * O filtro estruturado da listagem NÃO existe no contrato v1.
 *
 * `contracts/openapi-v1.json` publica `q`, `sortBy`, `sortDesc`, `page` e
 * `pageSize` — não há parâmetro por onde `campo + operador + valor` viaje. Falta
 * de caminho, não escolha: o desenho do parâmetro é decisão do contrato e sai por
 * PR próprio (ver `docs/integracao.md`).
 *
 * **Recusa em voz alta em vez de ignorar.** A alternativa — mandar a requisição
 * sem os filtros — devolveria a lista COMPLETA com a tela mostrando três filtros
 * aplicados: dado certo do servidor respondendo a pergunta errada, que é a pior
 * forma de errar numa listagem. A tela do recurso HTTP simplesmente não declara
 * campos filtráveis; se alguém declarar, quebra aqui, na hora, em vez de mentir
 * na frente do operador.
 */
export function recusarFiltroSemContrato(state: TableQueryState, url: string): void {
  if (filtrosValidos(state.filtros ?? []).length === 0) return
  throw new Error(
    `Filtro estruturado não existe no contrato de ${url}: a listagem HTTP conhece q/sortBy/page/pageSize. Remova os campos filtráveis desta tela ou publique o parâmetro no contrato antes.`,
  )
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
      recusarFiltroSemContrato(state, url)

      const resposta = await apiFetch<RespostaDaApi>(
        urlComQuery(url, { ...fixa, ...queryDaTabela(state) }),
        { method: 'GET' },
      )

      // Falha do servidor NUNCA pode virar lista vazia: "deu erro" e "não há
      // registro" pedem reações opostas do operador.
      const data = dadosOuErro<PagedResult<T>>(resposta, `Falha ao consultar ${url}.`)
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

/**
 * Query string na MESMA serialização do cliente gerado (`URLSearchParams`,
 * valores por `String()`): o provider genérico de lista não pode montar URL
 * diferente da que as operações geradas montam para os mesmos parâmetros.
 */
function urlComQuery(url: string, query: Record<string, string | number | boolean>): string {
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(query)) {
    params.append(chave, String(valor))
  }
  const texto = params.toString()
  return texto.length > 0 ? `${url}?${texto}` : url
}

/** `detail` do problem+json, quando o corpo do erro seguiu a RFC 9457. */
export function detalheDoProblema(corpo: unknown): string | undefined {
  if (!corpo || typeof corpo !== 'object') return undefined
  const problema = corpo as ProblemDetails
  const texto = problema.detail ?? problema.title
  return typeof texto === 'string' && texto.trim() ? texto : undefined
}
