/**
 * AGRUPAMENTO das linhas de um relatório — a quebra com contagem e subtotal.
 *
 * ## Agrupa o que ESTÁ CARREGADO, e diz isso
 *
 * O servidor não publica `groupBy` em nenhuma das dez operações de
 * `/api/reports`, e nenhum envelope traz agregado por grupo. Então a quebra é do
 * cliente, sobre as linhas que vieram — e por isso a tela sobe `pageSize` ao
 * teto do contrato (100) assim que um agrupamento é escolhido, e o rodapé DIZ
 * quando o teto cortou. É a mesma regra do padrão de view modes: coluna montada
 * com uma página é coluna falsa, e o jeito honesto de conviver com isso é
 * declarar o corte, não escondê-lo.
 *
 * O subtotal do grupo, portanto, **não é** o `summary` do envelope. Os dois
 * aparecem na mesma tela de propósito: em cima, os números do recorte inteiro;
 * na quebra, o que as linhas à vista somam. Confundi-los é o defeito clássico
 * destes relatórios, e a moldura os separa por posição, por voz e por rótulo.
 *
 * ## A ordem dos grupos é a ordem que o servidor mandou
 *
 * Sem `ordem` explícita, os grupos saem na ordem de PRIMEIRA APARIÇÃO das
 * linhas. Ordenar por nome aqui desmancharia o `sortBy` que o operador acabou de
 * clicar no cabeçalho — ele pediu "as maiores primeiro" e receberia "as em
 * ordem alfabética de tipo". Faixa (parado) e atende/falta (orçado × estoque)
 * têm ordem natural e a declaram; tipo de produto não tem e não declara.
 */

/**
 * O tom de uma linha ou de um grupo. Semântico, nunca decorativo — é o que
 * separa "esta linha está em falta" de "esta linha é azul".
 */
export type TomDeRelatorio = 'neutro' | 'ok' | 'warn' | 'bad'

export interface AgrupamentoDeRelatorio<T> {
  id: string
  /** O que vai no seletor "Agrupar por". */
  rotulo: string
  /** A chave do grupo, que também é o título da barra de quebra. */
  chave: (linha: T) => string
  /**
   * Ordem entre os grupos, quando ela existe no domínio (faixas de dias,
   * atende/falta). Chave fora da lista vai para o fim, na ordem de aparição.
   */
  ordem?: readonly string[]
  /** O tom da barra do grupo — a faixa dos +365 dias é `bad`, não enfeite. */
  tom?: (chave: string) => TomDeRelatorio
}

export interface GrupoDeRelatorio<T> {
  chave: string
  tom: TomDeRelatorio
  linhas: readonly T[]
}

export function agrupar<T>(
  linhas: readonly T[],
  agrupamento: AgrupamentoDeRelatorio<T>,
): readonly GrupoDeRelatorio<T>[] {
  const porChave = new Map<string, T[]>()
  for (const linha of linhas) {
    const chave = agrupamento.chave(linha)
    const atual = porChave.get(chave)
    if (atual) atual.push(linha)
    else porChave.set(chave, [linha])
  }

  const aparicao = [...porChave.keys()]
  const ordem = agrupamento.ordem
  const posicao = (chave: string) => {
    if (!ordem) return aparicao.indexOf(chave)
    const i = ordem.indexOf(chave)
    // Chave que o domínio não previu vai para o fim, e não para o começo: o
    // grupo desconhecido é o que menos merece o topo da leitura.
    return i === -1 ? ordem.length + aparicao.indexOf(chave) : i
  }

  return aparicao
    .sort((a, b) => posicao(a) - posicao(b))
    .map((chave) => ({
      chave,
      tom: agrupamento.tom?.(chave) ?? 'neutro',
      linhas: porChave.get(chave) as T[],
    }))
}

/**
 * Soma de uma coluna que viaja como STRING decimal (quantidade) ou como inteiro
 * de centavos (dinheiro).
 *
 * Devolve `null` quando NENHUMA linha do grupo tem o valor — e não zero. Um
 * grupo inteiro sem preço somando "R$ 0,00" afirmaria que aquele estoque não
 * vale nada, quando o que se sabe dele é que não se sabe.
 */
export function somar<T>(
  linhas: readonly T[],
  valor: (linha: T) => number | null | undefined,
): number | null {
  let total = 0
  let algum = false
  for (const linha of linhas) {
    const n = valor(linha)
    if (n === null || n === undefined || !Number.isFinite(n)) continue
    total += n
    algum = true
  }
  return algum ? total : null
}

/** Quantidade do contrato (string decimal) como número, ou `null` se não converte. */
export function numeroDaQuantidade(texto: string | null | undefined): number | null {
  if (texto === null || texto === undefined) return null
  const n = Number(texto)
  return Number.isFinite(n) ? n : null
}
