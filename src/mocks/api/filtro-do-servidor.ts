import type { ListFilter } from '@/api/gerado'
import {
  type FiltroDaTabela,
  OPERADORES,
  type OperadorDeFiltro,
  type VarianteDeFiltro,
  linhaPassaNosFiltros,
} from '@/lib/filtro-de-consulta'

/**
 * FILTRO ESTRUTURADO DO LADO DO SERVIDOR FALSO — a peça que `handlers.ts` e
 * `crm.ts` compartilham.
 *
 * Nasceu dentro de `crm.ts` (PR #114) e saiu de lá quando o segundo consumidor
 * apareceu. Não é arrumação: **a regra que ela carrega é uma regra de
 * FRONTEIRA**, e fronteira em duas cópias vira duas fronteiras. Campo fora da
 * whitelist tem de ser 400 no produto, no parceiro e na oportunidade pelo mesmo
 * motivo e com o mesmo texto; duas implementações divergem calado, e a
 * divergência só aparece com o operador na frente.
 *
 * ## Por que o servidor falso filtra de verdade
 *
 * O contrário é PIOR do que não ter filtro: o parâmetro `filters` sai da tela,
 * chega aqui e é DESCARTADO em silêncio — a listagem devolve tudo enquanto o
 * painel mostra a condição aplicada. O operador lê "3 registros atendem" numa
 * lista de 40 e não tem como saber de quem é o erro. Em `cabinetonline.cc`, que
 * roda em modo mock, isso não é limitação de mock: é a tela afirmando o que não é.
 *
 * ## O tipo de cada campo é do SERVIDOR, não da tela
 *
 * `variante` não viaja no contrato — é decisão de qual controle desenhar. Sem
 * ela a comparação de data cairia em texto, e `lte '2026-08-05'` deixaria de
 * fora o próprio dia 5, que tem hora no ISO guardado. Por isso cada recurso
 * declara aqui o tipo dos campos que publica.
 *
 * `undefined` = **o recurso não publica `filters`**. Aí o filtro que chegar é
 * 400, exatamente como o contrato manda, em vez de resposta larga demais.
 */
export type CamposFiltraveis = Record<string, VarianteDeFiltro>

/** Condições do contrato → o vocabulário de `filtro-de-consulta`, ou o texto do 400. */
export function condicoesDoPedido(
  bruto: string,
  filtraveis: CamposFiltraveis | undefined,
): FiltroDaTabela[] | string {
  if (!filtraveis) return 'Este recurso não publica o parâmetro filters.'

  let pedidos: unknown
  try {
    pedidos = JSON.parse(bruto)
  } catch {
    return 'filters não é JSON válido.'
  }
  if (!Array.isArray(pedidos)) return 'filters é um array JSON de condições.'

  const condicoes: FiltroDaTabela[] = []
  for (const [indice, pedido] of (pedidos as ListFilter[]).entries()) {
    const variante = filtraveis[pedido?.field ?? '']
    if (!variante) {
      return `Campo não filtrável: ${pedido?.field}. A whitelist é ${Object.keys(filtraveis).join(', ')}.`
    }
    // Operador fora do vocabulário é 400, e a razão é a mesma do campo fora da
    // whitelist: `filtroCasa` não reconhece a palavra, a condição não recorta
    // nada, e a listagem devolve TUDO com a tela mostrando o filtro aplicado.
    // O contrato tipa `operator` como enum — aceitar qualquer texto era o mesmo
    // silêncio que este arquivo existe para acabar.
    if (!(OPERADORES as readonly string[]).includes(pedido?.operator ?? '')) {
      return `Operador inválido: ${pedido?.operator}. O vocabulário é ${OPERADORES.join(', ')}.`
    }
    condicoes.push({
      // A chave de linha é da TELA e não viaja; aqui ela só precisa ser única.
      filtroId: `condicao-${indice}`,
      id: pedido.field,
      variante,
      operador: pedido.operator as OperadorDeFiltro,
      valor: pedido.value ?? '',
    })
  }
  return condicoes
}

/**
 * Aplica `filters` + `joinOperator` da URL às linhas, ou devolve o texto do 400.
 *
 * `filters` se soma ao `q` com AND, como o contrato descreve: `q` é texto livre
 * sobre os campos que o recurso escolheu, `filters` é campo a campo. Quem chama
 * já aplicou o `q` — esta função só acrescenta.
 */
export function aplicarFiltros<T>(
  rows: T[],
  url: URL,
  filtraveis: CamposFiltraveis | undefined,
): T[] | string {
  const pedido = url.searchParams.get('filters')
  if (!pedido) return rows

  const condicoes = condicoesDoPedido(pedido, filtraveis)
  if (typeof condicoes === 'string') return condicoes

  const juncao = url.searchParams.get('joinOperator') === 'or' ? 'or' : 'and'
  return rows.filter((item) => linhaPassaNosFiltros(item, condicoes, juncao))
}
