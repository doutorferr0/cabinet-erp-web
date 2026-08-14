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

/**
 * AGRUPAR POR — as colunas do quadro saem de um campo, e o campo é escolha do
 * operador (view modes, #86).
 *
 * `stageName` é o padrão porque é o que um funil É: as colunas são as etapas
 * configuradas, na ordem configurada. Os outros dois respondem perguntas que a
 * mesma consulta já contém e que a etapa esconde — "quem está carregando o
 * quê" e "de onde vêm os negócios que estão vivos".
 *
 * **A lista é curta de propósito.** Agrupar por CLIENTE daria uma coluna por
 * cliente, quase todas com um cartão só: um quadro de oitenta colunas não é
 * agrupamento, é a mesma lista virada de lado. O critério para entrar é
 * cardinalidade baixa e pergunta de gestão, não "o campo existe no DTO".
 *
 * `expectedValueCents` também fica fora, e por outro motivo: agrupar por
 * dinheiro pediria faixas (`até 5 mil`, `5 a 20 mil`), e faixa é decisão do
 * negócio — inventá-la aqui seria escrever regra de gestão em nome do user.
 */
export const AGRUPAMENTOS_DO_FUNIL = [
  { id: 'stageName', rotulo: 'Etapa' },
  { id: 'ownerName', rotulo: 'Responsável' },
  { id: 'source', rotulo: 'Origem' },
] as const

/** O agrupamento que o quadro usa quando ninguém escolheu outro. */
export const AGRUPAMENTO_PADRAO = 'stageName'

/**
 * Uma coluna do quadro, já montada.
 *
 * `etapa` só existe quando as colunas SÃO as etapas. É a diferença que a tela
 * precisa saber: só nesse caso a coluna tem um `Incluir` que sabe onde o cartão
 * nasce, e só nesse caso ganhar/perder é propriedade da própria coluna.
 */
export interface ColunaDoQuadro {
  chave: string
  titulo: string
  cartoes: CrmOpportunityDto[]
  etapa?: CrmStageDto
}

/** Campo → como ler o valor e como chamar quem não tem. */
const CAMPO_DO_AGRUPAMENTO: Record<
  string,
  { valor: (o: CrmOpportunityDto) => string | null; vazio: string }
> = {
  ownerName: { valor: (o) => o.ownerName ?? null, vazio: 'Sem responsável' },
  source: { valor: (o) => o.source ?? null, vazio: 'Sem origem' },
}

/**
 * As colunas do quadro para o agrupamento escolhido.
 *
 * Por ETAPA, as colunas vêm das etapas CONFIGURADAS — inclusive as vazias, e na
 * ordem do funil. Pelos outros campos elas vêm do DADO, porque não há lista de
 * responsáveis nem de origens para enumerar: coluna de um responsável sem
 * nenhum negócio no funil seria coluna inventada.
 *
 * A coluna do valor AUSENTE (`Sem responsável`) vai para o fim, não some: são
 * exatamente os cartões que precisam de alguém olhando.
 */
export function colunasDoQuadro(
  oportunidades: readonly CrmOpportunityDto[],
  etapas: readonly CrmStageDto[],
  agruparPor: string,
): ColunaDoQuadro[] {
  const campo = CAMPO_DO_AGRUPAMENTO[agruparPor]
  // Campo desconhecido cai na etapa: é o agrupamento que sempre existe, e o
  // quadro em branco seria pior que o quadro no padrão.
  if (!campo) {
    const porEtapa = agruparPorEtapa(oportunidades, etapas)
    return etapas.map((etapa) => ({
      chave: etapa.id,
      titulo: etapa.name,
      cartoes: porEtapa[etapa.id] ?? [],
      etapa,
    }))
  }

  const porValor = new Map<string, CrmOpportunityDto[]>()
  for (const oportunidade of oportunidades) {
    const chave = campo.valor(oportunidade) ?? ''
    const coluna = porValor.get(chave)
    if (coluna) coluna.push(oportunidade)
    else porValor.set(chave, [oportunidade])
  }

  const comValor = [...porValor.entries()]
    .filter(([chave]) => chave !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, cartoes]) => ({ chave, titulo: chave, cartoes }))

  const semValor = porValor.get('')
  return semValor ? [...comValor, { chave: '', titulo: campo.vazio, cartoes: semValor }] : comValor
}
