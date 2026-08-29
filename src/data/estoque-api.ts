import type {
  PagedResultOfStockBalanceDto,
  PagedResultOfStockLocationDto,
  StockBalanceDto,
  StockLocationDto,
  StockMovementDto,
  StockMovementRequest,
} from '@/api/gerado'
import {
  createStockMovement,
  listStockBalances,
  listStockLocations,
  listStockMovements,
} from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  dadosOuErro,
  queryDaTabela,
  repetirSeValeAPena,
} from '@/data/api-provider'
import type { PagedResult, TableFetcher } from '@/lib/table-query'
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
    queryFn: () => buscarSaldosDaVariante(variantId as string),
  })
}

/**
 * A mesma leitura, IMPERATIVA — para quem precisa do saldo fora de um render.
 *
 * O inventário é o caso: ele lê o saldo de uma variante no instante em que o
 * operador acrescenta a linha à contagem, e de novo no instante de aplicar o
 * ajuste. Nenhum dos dois é um render — são gestos —, e um hook por linha
 * obrigaria a montar componente para consultar.
 *
 * Fica AQUI e não lá porque a chamada ao cliente gerado é desta fronteira: é
 * este arquivo que a guarda de `familia-de-estoque.test.ts` lê para dizer quem
 * consome `ListStockBalances`.
 */
export async function buscarSaldosDaVariante(variantId: string): Promise<StockBalanceDto[]> {
  const resposta: RespostaDaApi = await listStockBalances(variantId, {
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

/**
 * O LANÇAMENTO — a única escrita de estoque que o contrato publica.
 *
 * `CreateStockMovement` é uma operação só, e as três telas de lançamento
 * (entrada, saída, ajuste) são a MESMA chamada com sinais diferentes. O corpo
 * tem três campos e nada mais: `locationId`, `delta` e `reason`. Não há tipo de
 * movimento, não há documento, não há origem — o servidor grava tudo o que vem
 * daqui como `manual`, e recusa origem vinda do cliente de propósito (deixar a
 * tela afirmar que uma baixa saiu de uma venda que ninguém conferiu).
 *
 * ## O que a tela NÃO pré-valida, e é decisão
 *
 * **Variante nunca precificada.** Movimento numa variante sem linha de
 * `product_tenant` faz o SERVIDOR criar a linha — estoque é fato físico, preço é
 * decisão comercial, e um não espera o outro (decisão do user, 2026-08-18,
 * escrita no cabeçalho de `src/modules/estoque/rotas.ts` do api). A tela não
 * confere isso antes de mandar: conferir exigiria saber a regra do servidor de
 * cor, e regra copiada envelhece calada. Se vier recusa, ela aparece pelo
 * `detail` do problem+json.
 *
 * Mesma razão para o DEPÓSITO PADRÃO: `locationId` ausente significa "o padrão
 * da empresa", que o servidor CRIA sob demanda. A tela oferece o seletor já
 * preenchido quando há depósito, e manda `null` quando não há — nunca cadastra
 * depósito por conta própria para poder movimentar.
 *
 * ## As quatro recusas que chegam daqui, e nenhuma delas é pré-validada
 *
 * | quando | status |
 * |---|---|
 * | `delta` ausente ou `reason` em branco | 400 com `fields[]` |
 * | variante não encontrada · depósito que a empresa não tem | 404 |
 * | depósito INATIVO | 409 |
 * | movimento deixaria o saldo do DEPÓSITO negativo | 409 |
 *
 * A do saldo negativo é a que mais aparece na operação, e a tela **não** a
 * antecipa comparando com o saldo que carregou: entre a leitura e o clique
 * outro operador pode ter movimentado, e recusar aqui mostraria "não tem saldo"
 * para um pedido que o servidor aceitaria — ou pior, deixaria passar um que ele
 * recusa. Quem conta é quem grava.
 *
 * ## O que se invalida, e por quê são TRÊS chaves
 *
 * Um movimento muda os dois caches do ADR-009 e a grade que os explica:
 * `stock_balances` (o saldo do depósito), `product_tenant.stock_qty` (o total da
 * variante, que viaja como `stockQty` no `ProductVariantDto`) e o kardex. A
 * terceira é `['produtos']` porque o `stockQty` da variante mora no detalhe do
 * produto — invalidar só as duas de estoque deixaria a tela de produto exibindo
 * o total de antes do movimento, que é a divergência que o ADR-009 chama de
 * fraude ou bug.
 */
export function useLancarMovimento(variantId: string | null) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (corpo: StockMovementRequest) => lancarMovimento(variantId as string, corpo),
    onSuccess: () => invalidarEstoqueDaVariante(cliente, variantId ?? ''),
  })
}

/**
 * O lançamento, IMPERATIVO — a mesma escrita sem um hook por variante.
 *
 * O inventário lança N movimentos de uma vez (um por linha divergente), e
 * `useLancarMovimento` é ligado a UMA variante: chamá-lo em laço exigiria um
 * hook por linha, que é justamente o que as regras de hook proíbem. A função é
 * a mesma chamada; o que o hook acrescenta é a invalidação, e ela está logo
 * abaixo, para quem lança em laço invalidar no fim.
 */
export async function lancarMovimento(
  variantId: string,
  corpo: StockMovementRequest,
): Promise<StockMovementDto> {
  const resposta: RespostaDaApi = await createStockMovement(variantId, corpo)
  return dadosOuErro<StockMovementDto>(resposta, 'Falha ao lançar o movimento.')
}

/**
 * As TRÊS chaves que um movimento suja, num lugar só.
 *
 * `['produtos']` está aqui pelo motivo escrito em `useLancarMovimento`: o
 * `stockQty` da variante mora no detalhe do produto, e invalidar só as duas de
 * estoque deixaria a tela de produto exibindo o total de antes do movimento.
 */
export function invalidarEstoqueDaVariante(cliente: QueryClient, variantId: string): void {
  cliente.invalidateQueries({ queryKey: CHAVES_ESTOQUE.saldos(variantId) })
  cliente.invalidateQueries({ queryKey: CHAVES_ESTOQUE.kardex(variantId) })
  cliente.invalidateQueries({ queryKey: ['produtos'] })
}
