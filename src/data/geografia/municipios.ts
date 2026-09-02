/**
 * GEOGRAFIA — os 5571 municípios do IBGE, como dado LOCAL do front.
 *
 * ## Por que local, e não um recurso do contrato
 *
 * A lista de municípios é pública, oficial e igual para todo mundo: não é dado
 * da empresa, não tem multi-tenant, não tem escrita. Publicar `/api/cities`
 * seria pedir ao backend que servisse de proxy para um arquivo que não muda —
 * uma rota, um handler, uma paginação e um cache a mais para responder sempre a
 * mesma coisa. Enquanto o único consumo é a busca de cidade dos cadastros, o
 * arquivo aqui responde na hora e funciona offline, inclusive no site público,
 * que é 100% mock.
 *
 * **O que muda na fase fiscal:** ali a geografia deixa de ser conveniência de
 * tela e vira dado de documento (a NF-e exige o código do município em `cMun`).
 * Nesse dia a fonte passa a ser o servidor, porque o que a nota carimba tem de
 * ser o que o servidor validou — e a migração é barata justamente porque o
 * `codigo` guardado desde já É o código do IBGE, não um id inventado. Ver
 * `docs/geografia-ibge.md`.
 *
 * ## Por que carregado sob demanda
 *
 * O asset tem 140 KB (49,6 KB comprimido). Importado de cima, entraria no chunk
 * que toda tela puxa, e a esmagadora maioria das sessões nunca abre uma busca de
 * cidade. Com `import()` o Vite o isola num chunk próprio, pedido no primeiro
 * uso e mantido em memória depois — o custo é de quem usa.
 */

import type { ListProvider } from '@/data/provider'
import { normalize, pagedMock } from '@/mocks/query'

/**
 * Um município, na forma que os formulários gravam desde sempre
 * (`cidadeCodigo`/`cidadeNome`/`uf`). O que mudou não foi o formato — foi o
 * `codigo` deixar de ser sequencial inventado e passar a ser o do IBGE.
 */
export interface Municipio {
  /** Código do IBGE, 7 dígitos, como TEXTO — é identificador, não quantidade. */
  codigo: string
  /** Grafia oficial do IBGE ('Santo André'), não caixa-alta. */
  nome: string
  /** Sigla da UF ('SP'). */
  uf: string
}

/** A forma do asset gerado por `scripts/gera-municipios-ibge.mjs`. */
interface DatasetIbge {
  fonte: string
  geradoEm: string
  total: number
  ufs: Record<string, [number, string][]>
}

let carga: Promise<readonly Municipio[]> | null = null

/**
 * Os municípios, achatados e ordenados por nome. A promessa é memoizada: o
 * segundo chamador espera a MESMA carga, e não uma segunda.
 */
export function carregarMunicipios(): Promise<readonly Municipio[]> {
  carga ??= import('./municipios-ibge.json').then((modulo) => {
    const dataset = modulo.default as unknown as DatasetIbge
    const linhas: Municipio[] = []
    for (const [uf, municipios] of Object.entries(dataset.ufs)) {
      for (const [codigo, nome] of municipios) {
        linhas.push({ codigo: String(codigo), nome, uf })
      }
    }
    // Um `Intl.Collator`, não um por comparação: `localeCompare` monta o
    // collator a cada chamada, e são ~70 mil comparações para ordenar 5571
    // nomes — a diferença é de dezenas de milissegundos para segundos.
    const comparador = new Intl.Collator('pt-BR')
    return linhas.sort(
      (a, b) => comparador.compare(a.nome, b.nome) || comparador.compare(a.uf, b.uf),
    )
  })
  return carga
}

/**
 * Busca de cidade — a mesma fronteira das outras tabelas de apoio: só consulta,
 * sem cadastro. Casa por código (prefixo digitado) e por nome normalizado, que é
 * o que deixa `sao paulo` achar 'São Paulo'.
 *
 * A paginação em memória aqui NÃO é simulação de servidor: o conjunto está na
 * máquina de quem procura, e paginar é o que a `DataTable` pede. Por isso o
 * `delayMs` default é 0 — a espera real é o chunk chegando, uma vez só.
 */
export const municipiosIbge: ListProvider<Municipio> = {
  /**
   * Nem `'servidor'` (não veio de rede) nem `'exemplo'` (não é ficção): é dado
   * oficial que mora aqui. `AvisoDadosDeExemplo` só acende para `'exemplo'`, e
   * está certo — avisar "dados de exemplo" sobre a lista do IBGE seria mentir
   * na direção contrária.
   */
  origem: 'local',
  async list(state, delayMs = 0) {
    const linhas = await carregarMunicipios()
    return pagedMock(
      linhas,
      state,
      (municipio, q) =>
        municipio.codigo.startsWith(q) ||
        normalize(municipio.nome).includes(q) ||
        normalize(municipio.uf) === q,
      delayMs,
    )
  },
}
