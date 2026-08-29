import type {
  CostSimulationDto,
  CostSimulationRequest,
  PagedResultOfPriceIndexDto,
  PriceIndexDto,
  VariantTablePriceDto,
  VariantTablePricesWriteRequest,
} from '@/api/gerado'
import {
  listPriceIndexes,
  listVariantTablePrices,
  replaceVariantTablePrices,
  simulateCostProfile,
} from '@/api/gerado'
import {
  PAGE_SIZE_MAX,
  type RespostaDaApi,
  dadosOuErro,
  repetirSeValeAPena,
} from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DE PREÇO — a tabela do fornecedor, o índice de venda e a simulação
 * de margem.
 *
 * As três famílias estão no contrato desde a #335/G9 e as dez operações estão
 * em `ROTAS_DO_BACKEND`. O que faltava era CONSUMIDOR: até esta issue elas eram
 * do terceiro estado da varredura de 25/08 — "publicado, servido e sem
 * consumidor", ao lado de comissões, recebimento e relatórios.
 *
 * ## As duas metades da formação de preço, e qual delas é deste trilho
 *
 * O legado forma preço com duas entradas (`legado-softlux.md` §Formação de
 * preço): `Custo` — o perfil por fornecedor, quatro descontos em cascata e
 * treze encargos — é a metade de COMPRA; `Indice_preco` é a metade de VENDA.
 * As duas se CADASTRAM em outro lugar; aqui elas só se LEEM. Criar perfil e
 * índice é `api#231`/`api#232` (a decisão D1), e uma tela que os editasse
 * daqui daria duas autoridades sobre o mesmo número.
 *
 * O que é deste trilho é a terceira entrada, que é por VARIANTE:
 * `Preco_Produto.Pre_Tabela`, a tabela do fornecedor. Ela se edita aqui porque
 * é onde ela mora — na ficha da peça.
 *
 * ## O que a tela CALCULA e o que ela PEDE
 *
 * O preço de venda sugerido a tela calcula (`vendaSugeridaCents`): é uma
 * multiplicação, a fórmula está medida contra 41 de 41 casos reais, e pedi-la
 * ao servidor custaria uma requisição por linha para reproduzir `a × b`.
 *
 * A MARGEM a tela pede. São vinte e três parcelas, quatro delas incidindo
 * sobre a venda e não sobre a compra, e a ordem do arredondamento é dado do
 * legado — o custo se arredonda ANTES da subtração, e é isso que faz o lucro
 * gravado bater em 357 dos 376 índices reais em vez de 179. Reproduzir essa
 * conta aqui seria copiar regra de servidor para dentro da tela, e regra
 * copiada envelhece calada.
 */

/** Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo. */
export const CHAVES_PRECO = {
  indices: ['precos', 'indices'] as const,
  tabelas: (variantId: string) => ['precos', 'tabelas', variantId] as const,
}

/**
 * Os índices de venda de TODOS os fornecedores, inclusive os inativos.
 *
 * Pede a primeira página no teto do contrato em vez de paginar, pelo mesmo
 * motivo de `useDepositos`: quem abre a ficha de uma peça precisa do índice de
 * cada fornecedor dela, e o cadastro tem centenas de linhas, não milhares (376
 * no legado inteiro).
 *
 * **Inativo entra na lista de propósito, e a tela precisa dele.** Índice
 * inativo NÃO precifica — o contrato diz que a variante daquele fornecedor
 * volta a devolver `calculatedUnitPriceCents` nulo. Se a lista o escondesse, a
 * tela não saberia distinguir "este fornecedor não tem índice" de "o índice
 * dele está desligado", e as duas pedem providências diferentes de quem opera.
 */
export function useIndicesDePreco() {
  return useQuery({
    queryKey: CHAVES_PRECO.indices,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listPriceIndexes({
        page: 1,
        pageSize: PAGE_SIZE_MAX,
      })
      const pagina = dadosOuErro<PagedResultOfPriceIndexDto>(
        resposta,
        'Falha ao carregar os índices de venda.',
      )
      return pagina.rows ?? []
    },
  })
}

/**
 * O índice de um fornecedor — `undefined` quando ele não tem.
 *
 * Um índice por fornecedor por empresa é regra do contrato (o segundo cadastro
 * é 409), então achar o primeiro é achar o único.
 */
export function indiceDoFornecedor(
  indices: readonly PriceIndexDto[],
  supplierId: string,
): PriceIndexDto | undefined {
  return indices.find((indice) => indice.supplierId === supplierId)
}

/**
 * O PREÇO DE VENDA SUGERIDO — `round(Pre_Tabela × Ipr_Indice, 2)`.
 *
 * É o coração do preço no legado, e a fórmula está aqui na forma CORRIGIDA:
 * a base é o preço de TABELA bruto, não o líquido de compra. A proc
 * `CalcularProduto` tem os dois ramos (`if @Cus_cambio > 0` usa o líquido), mas
 * `Cus_Cambio` tem **zero linhas em 385 perfis** — o caminho vivo é a tabela, e
 * o líquido é ramo morto. A correção é de 2026-08-24 (G9, web#335/api#187),
 * medida contra `docs/legado/config/indice_preco.csv`, **41 de 41 casos ao
 * centavo**. Quem repreçar sobre o líquido reproduz outra coisa.
 *
 * O líquido continua entrando no CUSTO — só não na VENDA. E o índice é aplicado
 * ANTES de qualquer imposto de saída: imposto e taxa entram no custo, para
 * apurar lucro, e não empurram preço.
 *
 * ## A conta, em inteiros
 *
 * `tablePriceCents` é centavo; `indexValue` é inteiro com 4 casas implícitas
 * (`25600` = 2,5600). O produto direto seria centavo × 10.000, então a divisão
 * fecha a escala:
 *
 *     venda_cents = round(tablePriceCents × indexValue ÷ 10.000)
 *
 * Inteiro do começo ao fim, sem passar por float: `2,56` não existe em binário,
 * e três dessas multiplicações empilham a diferença em cima do centavo — que é
 * a razão de o contrato inteiro trafegar percentual como inteiro escalado.
 *
 * **`null` quando não há índice, e nunca zero.** Peça sem índice do fornecedor
 * não tem preço sugerido; mostrar `R$ 0,00` afirmaria um preço que ninguém
 * calculou, e o operador leria "de graça" onde a verdade é "não sei".
 */
export function vendaSugeridaCents(
  tablePriceCents: number,
  indice: PriceIndexDto | undefined,
): number | null {
  if (!indice || !indice.active) return null
  return Math.round((tablePriceCents * indice.indexValue) / 10_000)
}

/**
 * As tabelas de preço da variante — uma linha por fornecedor.
 *
 * Lista curta e sem paginação por desenho do contrato: são os fornecedores da
 * peça, não um cadastro. Mesmo formato de `stock-balances`, que também devolve
 * o conjunto inteiro por variante.
 *
 * `enabled` só com variante escolhida: sem ela a primeira renderização pediria
 * `/api/table-prices/undefined` e receberia um 404 sem significado. E variante
 * ainda não gravada não tem id do servidor — a aba não a oferece.
 */
export function useTabelasDaVariante(variantId: string | null) {
  return useQuery({
    queryKey: CHAVES_PRECO.tabelas(variantId ?? ''),
    enabled: variantId !== null,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listVariantTablePrices(variantId as string)
      return dadosOuErro<VariantTablePriceDto[]>(resposta, 'Falha ao carregar a tabela de preço.')
    },
  })
}

/**
 * A ESCRITA da tabela — `PUT`, e ele SUBSTITUI a lista inteira.
 *
 * Não há "gravar uma linha": o corpo é o conjunto das tabelas daquela variante,
 * e fornecedor que não vier no `prices` **sai**. É o mesmo `PUT` de todo este
 * contrato, e o efeito é o que a tela precisa dizer em voz alta — quem apaga a
 * linha da grade e grava apagou o preço daquele fornecedor no servidor, não só
 * na tela.
 *
 * A escrita exige `precos:gerenciar`, ação que nenhum template de fábrica
 * concede: `Proprietário` e `Administrador` alcançam por `grants_all`, e quem
 * entra com `Operação completa` vê **403 `papel-insuficiente`**. É decisão do
 * api e a tela não a antecipa — quem vende usa o preço, quem o define responde
 * pela margem, e conferir papel aqui seria copiar a matriz de permissão do
 * servidor para dentro do formulário.
 *
 * Invalida também `['produtos']`: o preço de tabela é o que alimenta o
 * `calculatedUnitPriceCents` do item de orçamento, e deixar o detalhe do
 * produto em cache mostraria o preço de antes da gravação.
 */
export function useGravarTabelas(variantId: string | null) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async (corpo: VariantTablePricesWriteRequest) => {
      const resposta: RespostaDaApi = await replaceVariantTablePrices(variantId as string, corpo)
      return dadosOuErro<VariantTablePriceDto[]>(resposta, 'Falha ao gravar a tabela de preço.')
    },
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: CHAVES_PRECO.tabelas(variantId ?? '') })
      cliente.invalidateQueries({ queryKey: ['produtos'] })
    },
  })
}

/**
 * A SIMULAÇÃO de custo e margem, sob um perfil.
 *
 * `POST` e não `GET` porque o corpo é a pergunta: preço de tabela, venda
 * líquida e as duas comissões. Não grava nada — é apuração, e o resultado é a
 * decomposição em vinte e três parcelas mais o lucro.
 *
 * ## `netSaleCents` é ENTRADA, e a separação é deliberada
 *
 * O preço de venda nasce do índice, que é o outro trilho do módulo; recalculá-lo
 * dentro da simulação daria duas autoridades sobre o mesmo número. Sem ele a
 * resposta traz só a decomposição da COMPRA e deixa `profitCents` nulo — quatro
 * parcelas do custo (Simples, cartão, custo fixo e desconto de custo) incidem
 * sobre a VENDA, e sem venda elas valem zero, o que faria o custo sair menor do
 * que é.
 *
 * ## O ICMS não está aí, e o campo que diz isso é `excludesIcms`
 *
 * `CostProfileDto` não publica `Cus_TributacaoICMS` nem os seis campos que
 * dependem dele. Aquilo ramifica o custo em **sete caminhos** — substituição
 * tributária domina 317 dos 385 perfis reais — e qual deles reproduzir é
 * decisão de CONTADOR, pendente. O contrato não devolve `icmsCents` zerado de
 * propósito: para 317 perfis ele é o maior componente do custo, e um zero ali
 * seria a mentira mais cara da tela. Quem exibe o resultado é obrigado a ler
 * `excludesIcms` e dizer.
 */
export function useSimularMargem() {
  return useMutation({
    mutationFn: async ({
      costProfileId,
      corpo,
    }: {
      costProfileId: string
      corpo: CostSimulationRequest
    }) => {
      const resposta: RespostaDaApi = await simulateCostProfile(costProfileId, corpo)
      return dadosOuErro<CostSimulationDto>(resposta, 'Falha ao simular a margem.')
    },
  })
}

/**
 * As parcelas da simulação em ordem de EXTRATO, para a tela não decidir isso.
 *
 * A ordem é a da conta, não a alfabética nem a do schema: entra a tabela, saem
 * os quatro descontos, fecha o líquido da cascata, saem os três créditos, fecha
 * o líquido de compra, entram os encargos, fecha a compra e depois o custo.
 * Quem lê a coluna de cima para baixo refaz a conta com o dedo — que é o que um
 * extrato de custo serve para permitir.
 *
 * `sinal` diz como a linha entra na soma; a tela usa para o "−" e para a cor,
 * não para calcular. `base` marca as quatro parcelas que incidem sobre a VENDA
 * e não sobre a compra: sem `netSaleCents` elas chegam zeradas, e sem essa
 * marca o operador leria o zero como "não tem" em vez de "não perguntei".
 */
export interface ParcelaDaSimulacao {
  campo: keyof CostSimulationDto
  rotulo: string
  sinal: '+' | '−'
  /** `total` = linha de fechamento, não parcela. */
  destaque?: boolean
  /** A parcela incide sobre a venda líquida, não sobre a compra. */
  sobreVenda?: boolean
}

export const PARCELAS_DA_SIMULACAO: readonly ParcelaDaSimulacao[] = [
  { campo: 'tablePriceCents', rotulo: 'Preço de tabela', sinal: '+' },
  { campo: 'discount1Cents', rotulo: '1º desconto', sinal: '−' },
  { campo: 'discount2Cents', rotulo: '2º desconto', sinal: '−' },
  { campo: 'discount3Cents', rotulo: '3º desconto', sinal: '−' },
  { campo: 'discount4Cents', rotulo: '4º desconto', sinal: '−' },
  { campo: 'grossNetCents', rotulo: 'Líquido da cascata', sinal: '+', destaque: true },
  { campo: 'icmsCreditCents', rotulo: 'Crédito de ICMS', sinal: '−' },
  { campo: 'pisCreditCents', rotulo: 'Crédito de PIS', sinal: '−' },
  { campo: 'cofinsCreditCents', rotulo: 'Crédito de COFINS', sinal: '−' },
  { campo: 'netPurchaseCents', rotulo: 'Líquido de compra', sinal: '+', destaque: true },
  { campo: 'ipiCents', rotulo: 'IPI', sinal: '+' },
  { campo: 'packagingCents', rotulo: 'Embalagem', sinal: '+' },
  { campo: 'financialCents', rotulo: 'Financeiro', sinal: '+' },
  { campo: 'freightCents', rotulo: 'Frete', sinal: '+' },
  { campo: 'otherCents', rotulo: 'Outros', sinal: '+' },
  { campo: 'purchaseCents', rotulo: 'Compra', sinal: '+', destaque: true },
  { campo: 'simplesCents', rotulo: 'Simples', sinal: '+', sobreVenda: true },
  { campo: 'cardCents', rotulo: 'Cartão', sinal: '+', sobreVenda: true },
  { campo: 'fixedCostCents', rotulo: 'Custo fixo', sinal: '+', sobreVenda: true },
  { campo: 'costDiscountCents', rotulo: 'Desconto de custo', sinal: '+', sobreVenda: true },
  { campo: 'costCents', rotulo: 'Custo', sinal: '+', destaque: true },
  { campo: 'internalCommissionCents', rotulo: 'Comissão interna', sinal: '−' },
  { campo: 'externalCommissionCents', rotulo: 'Comissão externa', sinal: '−' },
]
