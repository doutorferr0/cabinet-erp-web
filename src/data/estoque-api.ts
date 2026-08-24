import type {
  PagedResultOfStockBalanceDto,
  PagedResultOfStockLocationDto,
  StockBalanceDto,
  StockLocationDto,
  StockMovementDto,
} from '@/api/gerado'
import { listStockBalances, listStockLocations, listStockMovements } from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  dadosOuErro,
  queryDaTabela,
  repetirSeValeAPena,
} from '@/data/api-provider'
import type { PagedResult, TableFetcher } from '@/lib/table-query'
import { useQuery } from '@tanstack/react-query'

/**
 * FRONTEIRA DE ESTOQUE — depósito, saldo por depósito e kardex.
 *
 * As três operações são do contrato e o backend as serve (`api#79` fase 2,
 * migração `0030` + `src/modules/estoque/`). A tela não chama o cliente gerado:
 * pede daqui, como manda a regra de acesso a dado.
 *
 * ## A dimensão que o saldo ganhou
 *
 * `stock_balances` é cache derivado do kardex (ADR-009) por **(depósito,
 * variante)**, e `balanceAfter` do movimento passou a ser o saldo DO DEPÓSITO —
 * não o total do produto na empresa. Enquanto houver um depósito só, os dois
 * números coincidem; a partir do segundo, não. É por isso que a tela precisa
 * dizer de qual depósito está falando.
 *
 * ## O NOME do depósito não vem nas duas respostas que o usam
 *
 * `StockBalanceDto` e `StockMovementDto` trazem `locationId` (uuid) e nada de
 * `locationName` — decisão declarada no contrato: quem recebeu o punhado de
 * linhas pede `ListStockLocations` **uma vez** e resolve os nomes com ela. Daí
 * `useNomesDeDeposito`, que é essa resolução num lugar só. Pedir o nome ao
 * servidor em cada linha seria junção que a tela sabe fazer sozinha.
 *
 * ## O que NÃO existe aqui, e por quê
 *
 * Filtro de depósito na QUERY. Nem `ListStockBalances` nem `ListStockMovements`
 * publicam parâmetro de `locationId` — o saldo já vem uma linha por depósito, e
 * é sobre esse punhado que a tela recorta. Inventar `?locationId=` daria 400 no
 * servidor real e passaria no mock, que é o pior dos dois mundos.
 */

/** Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo. */
export const CHAVES_ESTOQUE = {
  depositos: ['estoque', 'depositos'] as const,
  saldos: (variantId: string) => ['estoque', 'saldos', variantId] as const,
  kardex: (variantId: string) => ['estoque', 'kardex', variantId] as const,
}

/**
 * Os depósitos da empresa ativa — todos, inclusive os INATIVOS.
 *
 * Pede a primeira página no teto do contrato em vez de paginar, pelo mesmo
 * motivo de `useFunis`: quem escolhe depósito precisa ver todos, e uma empresa
 * tem locais em dezenas, não em milhares.
 *
 * **Inativo entra na lista de propósito.** Ele não recebe movimento novo (o
 * servidor recusa com 409), mas o saldo que ficou lá continua existindo e
 * continua no kardex — esconder o depósito apagaria da tela linhas que a
 * resposta traz, e o operador veria saldo sem dono.
 */
export function useDepositos() {
  return useQuery({
    queryKey: CHAVES_ESTOQUE.depositos,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listStockLocations({
        page: 1,
        pageSize: PAGE_SIZE_MAX,
        sortBy: 'code',
      })
      const pagina = dadosOuErro<PagedResultOfStockLocationDto>(
        resposta,
        'Falha ao carregar os depósitos.',
      )
      return pagina.rows ?? []
    },
  })
}

/**
 * `locationId` → nome legível, para as duas respostas que só trazem o uuid.
 *
 * Devolve o próprio uuid quando o depósito não está na lista — não um traço nem
 * vazio. Movimento de depósito que sumiu da listagem é justamente o caso em que
 * o operador precisa do identificador para perguntar o que aconteceu; trocar por
 * "—" transformaria um dado incômodo em nenhum dado.
 */
export function nomeDoDeposito(depositos: readonly StockLocationDto[], locationId: string): string {
  const deposito = depositos.find((d) => d.id === locationId)
  return deposito ? deposito.name : locationId
}

/**
 * O saldo da variante em CADA depósito.
 *
 * **Lista curta por natureza**: uma linha por depósito onde a peça esteve. Pede
 * o conjunto inteiro no teto do contrato porque o recorte por depósito acontece
 * na tela — paginar e depois filtrar mostraria "nenhum saldo neste depósito"
 * para uma linha que está na página 2.
 *
 * **Depósito sem linha não aparece com zero, e isso é informação:** um depósito
 * que nunca viu a peça diz outra coisa de um que a zerou. Completar a resposta
 * com zeros afirmaria contagem que ninguém fez.
 *
 * `enabled` só com variante escolhida: sem ela a primeira renderização pediria
 * `/api/variants/undefined/stock-balances` e receberia um 404 sem significado.
 */
export function useSaldosDaVariante(variantId: string | null) {
  return useQuery({
    queryKey: CHAVES_ESTOQUE.saldos(variantId ?? ''),
    enabled: variantId !== null,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listStockBalances(variantId as string, {
        page: 1,
        pageSize: PAGE_SIZE_MAX,
        sortBy: 'qty',
        sortDesc: true,
      })
      const pagina = dadosOuErro<PagedResultOfStockBalanceDto>(
        resposta,
        'Falha ao carregar o saldo por depósito.',
      )
      return pagina.rows ?? []
    },
  })
}

/**
 * O recorte por depósito do saldo — o filtro da tela, aplicado ao conjunto
 * INTEIRO que `useSaldosDaVariante` trouxe.
 *
 * `null` = todos os depósitos. Função pura e exportada de propósito: é a regra
 * que o teste exercita sem montar tela.
 */
export function saldosDoDeposito(
  saldos: readonly StockBalanceDto[],
  locationId: string | null,
): StockBalanceDto[] {
  if (locationId === null) return [...saldos]
  return saldos.filter((saldo) => saldo.locationId === locationId)
}

/** A soma das linhas visíveis — o total do recorte, não o total da empresa. */
export function somaDosSaldos(saldos: readonly StockBalanceDto[]): number {
  return saldos.reduce((soma, saldo) => soma + saldo.qty, 0)
}

/**
 * O kardex da variante, paginado PELO SERVIDOR.
 *
 * Ao contrário do saldo, aqui a paginação é de verdade: movimento é append-only
 * e cresce sem teto. Por isso o filtro de depósito da tela **não** alcança esta
 * grade — recortar a página corrente daria ao operador "3 movimentos neste
 * depósito" quando existem 300, e nada na tela distinguiria os dois números. A
 * dimensão aparece como COLUNA, que é o que a página pode afirmar com verdade.
 */
export function fetcherDoKardex(variantId: string): TableFetcher<StockMovementDto> {
  return async (state): Promise<PagedResult<StockMovementDto>> => {
    const { q: _q, ...query } = queryDaTabela(state)
    const resposta: RespostaDaApi = await listStockMovements(variantId, query)
    const pagina = dadosOuErro<PagedResult<StockMovementDto>>(
      resposta,
      'Falha ao carregar o kardex.',
    )
    return { rows: pagina.rows ?? [], total: pagina.total ?? 0 }
  }
}
