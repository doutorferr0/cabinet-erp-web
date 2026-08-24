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

/**
 * DE ONDE VEIO A LINHA que a tela está mostrando.
 *
 * Não é detalhe de implementação: é o que separa "13 pedidos de compra" de
 * "13 pedidos de compra INVENTADOS". Na sessão 60 um usuário real, logado no
 * site real, leu a fixture do Softlux como se fosse o movimento da empresa dele
 * — e a tela não tinha como desmentir, porque ninguém guardava essa informação
 * em lugar nenhum. Agora guarda aqui, no único ponto que sabe a resposta: o
 * provider.
 *
 * `exemplo` é a origem dos recursos que ainda leem `src/mocks/` — dado de
 * demonstração, e o `Gravar` dessas telas é `console.info`. `servidor` é o
 * default de quem fala HTTP, e é por isso que ele é o valor AUSENTE: provider
 * novo que esquecer de se declarar não ganha aviso, o que é o certo — o erro
 * caro é o contrário, avisar de menos numa tela de ficção.
 *
 * Some entrada por entrada, junto com o mock: no dia em que `pedidosCompra`
 * virar HTTP, a marca sai do registry e o aviso some das quatro telas sem
 * ninguém lembrar de apagá-lo.
 */
export type OrigemDosDados = 'servidor' | 'exemplo'

/** Recurso só de consulta: tabelas de apoio e as consultas read-only (§9 padrão 8). */
export interface ListProvider<T> {
  /** Listagem paginada — quem aplica q/sort/paginação é o servidor. */
  list(state: TableQueryState, delayMs?: number): Promise<PagedResult<T>>
  /** `'exemplo'` quando as linhas são fixture; ausente quer dizer servidor. */
  readonly origem?: OrigemDosDados
}

/**
 * O que uma tela de DOCUMENTO precisa: abrir um registro por id, ou um em
 * branco. Ela não lista — quem lista é a listagem, que é outra tela.
 *
 * Existe separado do `ResourceProvider` porque o tipo da LINHA e o do
 * DOCUMENTO divergem assim que o recurso vira HTTP: a grade recebe o DTO cru
 * (para o `sortBy` casar com a whitelist do servidor) e o formulário recebe a
 * forma traduzida. `produtosApi` já é assim; `/api/quotes` (#134) é o primeiro
 * com tela de documento.
 */
export interface DocumentoProvider<T> {
  /** Mesma marca do `ListProvider` — a tela de documento a lê sozinha. */
  readonly origem?: OrigemDosDados
  /**
   * Um registro por id; `null` quando não existe.
   *
   * **O id é TEXTO, como veio da rota.** Era `number` enquanto todo recurso com
   * tela de documento era array local — e `TelaDeDocumento` fazia
   * `Number(idParam)` para chegar aqui. O primeiro recurso HTTP a passar por
   * esse esqueleto (`/api/quotes`, #134) tem id de servidor, e `Number('orc-1')`
   * é **`NaN`**: a tela pediria o registro `NaN` e diria "não encontrado" para
   * um documento que existe, sem erro nenhum no caminho.
   *
   * Parâmetro de rota É string. Quem sabe converter é o provider, que conhece a
   * forma do próprio id — não o esqueleto, que não conhece nenhuma.
   */
  get(id: string, delayMs?: number): Promise<T | null>
  /**
   * Registro em branco para o "Incluir". Local por natureza — o backend não
   * fornece isso; na integração continua sendo default do formulário.
   *
   * **Sem argumento.** Quem chamava passava um id inventado (`Date.now() %
   * 100000`) para um registro que ainda não existe; o provider é quem sabe se o
   * branco precisa de id e qual. Os providers HTTP (`produtosApi`, `funis`) já
   * eram assim.
   */
  empty(): T
}

/**
 * Recurso com cadastro completo, cuja LINHA e cujo DOCUMENTO são o mesmo tipo —
 * o caso dos recursos mock. Espelha o que o backend vai expor:
 * `GET /recurso?q&sort&page&pageSize` e `GET /recurso/{id}`.
 */
export interface ResourceProvider<T> extends ListProvider<T>, DocumentoProvider<T> {}

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
    origem: 'exemplo',
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
  /** Recebe o id que o PROVIDER gerou para o registro em branco. */
  empty: (id: number) => T
  /** Como achar o registro pelo id (default: campo `id`, comparado como TEXTO). */
  findById?: (rows: readonly T[], id: string) => T | undefined
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
  // Compara como TEXTO: o id do recurso mock é número e o da rota é string, e
  // `===` entre os dois é sempre falso — o registro existiria e a tela diria
  // que não. `String()` nos dois lados é a conversão que o `Number(idParam)` do
  // esqueleto fazia, agora no lugar que sabe qual é a forma do id.
  findById = (all, id) => all.find((r) => String(r.id) === id),
  delayMs = 300,
  getDelayMs = 200,
}: MockResourceConfig<T>): ResourceProvider<T> {
  return {
    // A marca de origem vem no espalhamento do provider de lista, e serve às
    // duas telas: a listagem lê `data.<recurso>.origem`, e a de documento a lê
    // do próprio `provider` que já recebe.
    ...createMockListProvider({ rows, matches, delayMs }),
    get: (id, override = getDelayMs) => mockDelay(findById(rows, id) ?? null, override),
    // O id do registro em branco é do PROVIDER: quem abre o "Incluir" não tem
    // por que inventar um, e inventava (`Date.now() % 100000`) em cada tela.
    empty: () => empty(proximoIdEmBranco()),
  }
}

/**
 * Id do registro em branco dos recursos mock.
 *
 * Ele NÃO é um id de verdade — o registro ainda não existe. Serve só para o
 * formulário ter uma chave estável enquanto está sendo preenchido, e some no
 * dia em que o recurso virar HTTP (aí o número é do servidor, no 201).
 */
let sequenciaEmBranco = 0

function proximoIdEmBranco(): number {
  sequenciaEmBranco += 1
  return -sequenciaEmBranco
}

/** Reexportado para os predicados de busca dos providers. */
export { normalize }
