import {
  type CampoFiltravel,
  type FiltroDaTabela,
  type Juncao,
  OPERADORES,
  type OperadorDeFiltro,
  dispensaValor,
  novoFiltroId,
} from '@/lib/filtro-de-consulta'

/**
 * O FILTRO NA URL — a consulta que se manda por mensagem e sobrevive ao F5.
 *
 * Sem isto a listagem filtrada só existe dentro da aba que a montou: recarregar
 * devolve a lista inteira, e "olha esses vencendo em agosto" vira um roteiro de
 * cliques colado no chat. O endereço é o único estado que o navegador já sabe
 * guardar, compartilhar e restaurar sozinho.
 *
 * ## O vocabulário é o do CONTRATO, não um segundo inventado aqui
 *
 * `filters` (array JSON) + `joinOperator` são exatamente os parâmetros que
 * `filtrosDaTabela` monta para o servidor, com os mesmos nomes de campo e os
 * mesmos operadores em inglês. Um formato curto próprio (`f=name:iLike:stella`)
 * economizaria caracteres e criaria a terceira grafia do mesmo filtro — e é
 * traduzir operador entre camadas que já quebrou a ordenação neste repo.
 *
 * ## `variante` volta dos CAMPOS da tela, e não da URL
 *
 * O que viaja é o que o servidor entende; `variante` é decisão de tela (qual
 * controle desenhar) e não tem por que estar no endereço. Ao decodificar, cada
 * filtro reencontra a variante no `CampoFiltravel` declarado pela listagem —
 * **e campo que a tela não oferece é DESCARTADO**. URL editada à mão não pode
 * injetar um filtro que a tela não sabe desenhar nem o contrato sabe responder:
 * o servidor devolveria 400 e a tela mostraria erro de servidor por um endereço
 * torto.
 *
 * ## Quem LÊ é o router, não o `window`
 *
 * A leitura sai de `router.state.location.search`, já parseado pelas mesmas
 * regras com que o router escreveu (`parseSearchWith(JSON.parse)`). Ler
 * `window.location` à mão custaria reimplementar essas regras — e, com história
 * em memória (o router de teste, o dialog), o `window` sequer é onde o endereço
 * está: a tela abriria sem o filtro que o endereço carrega.
 *
 * ## `page` e a ordenação ficam de fora
 *
 * Mesma régua da consulta favorita: `page` é onde a pessoa parou de rolar
 * naquele instante, e restaurá-la abriria o link de outra pessoa na página 4.
 * A ordenação fica de fora por enquanto porque ela já se lê no cabeçalho da
 * tabela — quem recebe o link vê a seta e reordena com um clique.
 */

/** Nomes dos parâmetros — os do contrato, mais a busca livre que a barra já tem. */
export const PARAM_FILTROS = 'filters'
export const PARAM_JUNCAO = 'joinOperator'
export const PARAM_BUSCA = 'q'

export interface ConsultaNaUrl {
  q: string
  filtros: FiltroDaTabela[]
  juncao: Juncao
}

/** Item do `filters` como ele viaja: sem `filtroId` e sem `variante`. */
interface ItemNaUrl {
  field: string
  operator: OperadorDeFiltro
  value?: string | string[]
}

/**
 * O que a URL passa a dizer sobre a consulta atual.
 *
 * Devolve `undefined` no parâmetro que deve SUMIR do endereço, e não `''`:
 * `?q=&filters=` é um endereço que anuncia dois filtros vazios, e ele seria o
 * estado normal de toda listagem recém-aberta. `undefined` explícito também é o
 * que APAGA um parâmetro que estava lá — omitir a chave só o deixaria de pé.
 *
 * **`filters` sai como ARRAY, não como texto já serializado.** O router
 * serializa o search com `JSON.stringify` e o lê de volta com `JSON.parse`
 * (`stringifySearchWith`/`parseSearchWith`, padrão do TanStack): entregar a ele
 * uma string que por acaso é JSON válido faria o valor sair ASPADO e escapado
 * no endereço, e a leitura crua devolveria um texto onde a tela espera uma
 * lista. Quem monta o JSON é o serializador, uma vez só.
 */
export function consultaParaUrl({ q, filtros, juncao }: ConsultaNaUrl): Record<string, unknown> {
  const itens: ItemNaUrl[] = filtros.map((filtro) => ({
    field: filtro.id,
    operator: filtro.operador,
    ...(dispensaValor(filtro.operador) ? {} : { value: filtro.valor }),
  }))
  return {
    [PARAM_BUSCA]: q === '' ? undefined : q,
    [PARAM_FILTROS]: itens.length === 0 ? undefined : itens,
    // `and` é o padrão: escrevê-lo no endereço só o alongaria sem dizer nada
    // que a ausência já não diga. Mesma regra do `filtrosDaTabela`.
    [PARAM_JUNCAO]: juncao === 'or' ? 'or' : undefined,
  }
}

function ehOperador(valor: unknown): valor is OperadorDeFiltro {
  return typeof valor === 'string' && (OPERADORES as readonly string[]).includes(valor)
}

function valorLido(bruto: unknown): string | string[] {
  if (Array.isArray(bruto)) return bruto.map((v) => String(v))
  if (bruto === undefined || bruto === null) return ''
  return String(bruto)
}

/**
 * Os itens do `filters`, venha ele como lista já parseada (router) ou como texto
 * cru (leitura direta do endereço, link colado, endereço editado à mão).
 */
function itensLidos(bruto: unknown): ItemNaUrl[] {
  let lido: unknown = bruto
  if (typeof bruto === 'string') {
    try {
      lido = JSON.parse(bruto)
    } catch {
      // URL truncada ao ser colada, JSON estragado, parâmetro de outro sistema
      // com o mesmo nome: a tela abre sem filtro. Derrubar a listagem por causa
      // do endereço seria trocar uma consulta perdida por uma tela perdida.
      return []
    }
  }
  if (!Array.isArray(lido)) return []
  return lido.filter((item): item is ItemNaUrl => {
    if (!item || typeof item !== 'object') return false
    const i = item as Partial<ItemNaUrl>
    return typeof i.field === 'string' && ehOperador(i.operator)
  })
}

/**
 * O que a URL diz, traduzido para o estado da listagem.
 *
 * `campos` é a lista que a TELA declara filtrável — é ela que devolve a
 * `variante` e que barra o campo estranho.
 */
export function consultaDaUrl(
  busca: Record<string, unknown>,
  campos: readonly CampoFiltravel[],
): ConsultaNaUrl {
  const q = typeof busca[PARAM_BUSCA] === 'string' ? (busca[PARAM_BUSCA] as string) : ''
  const itens = itensLidos(busca[PARAM_FILTROS])

  const filtros: FiltroDaTabela[] = []
  for (const item of itens) {
    const campo = campos.find((c) => c.id === item.field)
    if (!campo) continue
    filtros.push({
      filtroId: novoFiltroId(),
      id: campo.id,
      variante: campo.variante,
      operador: item.operator,
      valor: dispensaValor(item.operator) ? '' : valorLido(item.value),
    })
  }

  return { q, filtros, juncao: busca[PARAM_JUNCAO] === 'or' ? 'or' : 'and' }
}
