import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'

/**
 * Agrupamento do quadro do funil.
 *
 * Derivado de `stages.ts` e `DealListContent.tsx` do Atomic CRM (MIT — ver
 * `NOTICE` na raiz), colhido em `docs/harvest/kanban-funil/`.
 *
 * ## O que veio da fonte
 *
 * A regra de que **etapa desconhecida cai na PRIMEIRA etapa configurada**, em
 * vez de o cartão sumir da tela. Um cartão fora de lugar é um erro que o
 * operador vê e reporta; um cartão ausente é um erro que ninguém nota até a
 * venda se perder.
 *
 * ## O que mudou, e é o ponto da reescrita
 *
 * O original faz `splice` nos arrays que estão DENTRO do estado do React e
 * precisa de um `isEqual` do lodash para disfarçar a comparação por referência
 * que deixou de valer. Aqui as funções são PURAS — e, como o movimento é
 * gravado no servidor por uma requisição só (`PATCH …/stage`), o quadro nem
 * guarda mapa em estado: ele reagrupa o que a consulta devolveu.
 */

export type PorEtapa = Record<string, CrmOpportunityDto[]>

/**
 * Lista plana → mapa etapa → cartões, cada coluna na ordem do servidor.
 *
 * Toda etapa configurada aparece no resultado, **inclusive vazia**: coluna
 * vazia é informação ("ninguém em Negociação"), não ausência de dado.
 */
export function agruparPorEtapa(
  oportunidades: readonly CrmOpportunityDto[],
  etapas: readonly CrmStageDto[],
): PorEtapa {
  const porEtapa: PorEtapa = {}
  for (const etapa of etapas) porEtapa[etapa.id] = []
  const primeira = etapas[0]
  if (!primeira) return porEtapa

  for (const oportunidade of oportunidades) {
    const coluna = porEtapa[oportunidade.stageId] ?? porEtapa[primeira.id]
    coluna?.push(oportunidade)
  }

  // `order` é do servidor — ele é quem reordena a coluna inteira, numa
  // transação, quando o cartão se move. Aqui só se respeita o que veio.
  for (const etapa of etapas) {
    porEtapa[etapa.id]?.sort((a, b) => a.order - b.order)
  }
  return porEtapa
}

/**
 * Soma da coluna, em centavos. Valor `null` (ainda não estimado) conta como
 * zero — é diferente de não existir, mas somar `null` como buraco daria `NaN`
 * no total inteiro da etapa.
 */
export function somaDaColuna(cartoes: readonly CrmOpportunityDto[]): number {
  return cartoes.reduce((total, c) => total + (c.expectedValueCents ?? 0), 0)
}

/**
 * Quem o cartão representa: o parceiro cadastrado ou, quando o lead ainda não
 * virou cadastro, o contato solto. `null` quando não há nem um nem outro — e aí
 * a linha simplesmente não aparece, em vez de um travessão sem sentido.
 */
export function quemDoCartao(oportunidade: CrmOpportunityDto): string | null {
  return oportunidade.partnerName ?? oportunidade.contactName ?? null
}
