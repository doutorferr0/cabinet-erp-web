import type { DestinoDoMovimento, EtapaDoFunil, OportunidadeDoFunil, PorEtapa } from './funil-tipos'

/**
 * Agrupamento e movimentação do funil — STAGED, não integrado (ver ../README.md).
 *
 * Derivado de `stages.ts` e `DealListContent.tsx` do Atomic CRM (MIT, ver NOTICE).
 *
 * ## O que sobreviveu da fonte
 *
 * A regra de que etapa desconhecida cai na PRIMEIRA etapa configurada, em vez de
 * a oportunidade sumir da tela. É a escolha certa: se o servidor devolver uma
 * etapa que a configuração não conhece, um cartão fora de lugar é um erro que o
 * operador vê e reporta; um cartão ausente é um erro que ninguém nota até a
 * venda se perder.
 *
 * ## O que mudou, e é o ponto desta reescrita
 *
 * O original faz `column.splice(...)` sobre os arrays que estão DENTRO do estado
 * do React e devolve `{...dealsByStage, [etapa]: column}`. O objeto de fora é
 * novo, os arrays de dentro são os mesmos — mutados no lugar. Funciona lá porque
 * um `isEqual` de lodash no `useEffect` mascara a comparação por referência que
 * deixou de valer. Aqui as funções são puras: `mover` devolve arrays novos, e
 * comparação por referência volta a significar o que promete.
 */

/**
 * Lista plana → mapa etapa → cartões, cada coluna ordenada por `ordem`.
 *
 * Toda etapa configurada aparece no resultado, inclusive vazia — a coluna vazia
 * é informação ("ninguém em Negociação"), não ausência de dado.
 */
export function agruparPorEtapa(
  oportunidades: readonly OportunidadeDoFunil[],
  etapas: readonly EtapaDoFunil[],
): PorEtapa {
  const vazio: PorEtapa = {}
  for (const etapa of etapas) vazio[etapa.valor] = []
  if (etapas.length === 0) return vazio

  const primeira = etapas[0].valor
  const conhecidas = new Set(etapas.map((e) => e.valor))

  for (const oportunidade of oportunidades) {
    const alvo = conhecidas.has(oportunidade.etapa) ? oportunidade.etapa : primeira
    vazio[alvo].push(oportunidade)
  }

  for (const etapa of etapas) {
    vazio[etapa.valor] = [...vazio[etapa.valor]].sort((a, b) => a.ordem - b.ordem)
  }
  return vazio
}

/** Soma dos valores de uma coluna, em centavos. `null` conta como zero, não como buraco. */
export function somaDaColuna(cartoes: readonly OportunidadeDoFunil[]): number {
  return cartoes.reduce((total, c) => total + (c.valorCents ?? 0), 0)
}

/**
 * Move um cartão e devolve um mapa NOVO — puro, sem tocar no que entrou.
 *
 * Movimento nulo (mesma etapa, mesma posição) devolve o mapa original por
 * referência, para que quem chama consiga desistir sem comparar conteúdo.
 */
export function mover(
  porEtapa: PorEtapa,
  oportunidadeId: string,
  destino: DestinoDoMovimento,
): PorEtapa {
  const origem = Object.keys(porEtapa).find((etapa) =>
    porEtapa[etapa].some((c) => c.id === oportunidadeId),
  )
  if (origem === undefined) return porEtapa
  if (porEtapa[destino.etapa] === undefined) return porEtapa
  if (destino.precedeId === oportunidadeId) return porEtapa

  const cartao = porEtapa[origem].find((c) => c.id === oportunidadeId)
  if (cartao === undefined) return porEtapa

  const semCartao = porEtapa[origem].filter((c) => c.id !== oportunidadeId)
  const alvo = origem === destino.etapa ? semCartao : porEtapa[destino.etapa]

  const posicao =
    destino.precedeId === null ? alvo.length : alvo.findIndex((c) => c.id === destino.precedeId)
  // `precedeId` apontando para cartão que não está mais na coluna (lista
  // filtrada, dado velho): vai para o fim em vez de para a posição -1, que
  // `splice` interpretaria como "penúltimo" e mandaria o cartão para um lugar
  // que ninguém pediu.
  const indice = posicao < 0 ? alvo.length : posicao

  if (origem === destino.etapa) {
    const antes = porEtapa[origem].findIndex((c) => c.id === oportunidadeId)
    if (indice === antes) return porEtapa
    const nova = [...semCartao]
    nova.splice(indice, 0, { ...cartao, etapa: destino.etapa })
    return { ...porEtapa, [origem]: nova }
  }

  const chegada = [...alvo]
  chegada.splice(indice, 0, { ...cartao, etapa: destino.etapa })
  return { ...porEtapa, [origem]: semCartao, [destino.etapa]: chegada }
}
