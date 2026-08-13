import type {
  ProductDetailDto,
  ProductDto,
  ProductVariantDto,
  ProductWriteRequest,
  VariantWriteRequest,
} from '@/api/gerado'
import {
  createProduct,
  createVariant,
  getProduct,
  updateProduct,
  updateVariant,
} from '@/api/gerado'
import {
  ErroDaApi,
  type RespostaDaApi,
  createApiListProvider,
  detalheDoProblema,
  itemOuNulo,
  respostaOk,
} from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'
import { formatQuantidade, parseQuantidade } from '@/lib/formatters'
import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { type Produto, type ProdutoVariante, produtoVazio } from '@/mocks/produtos'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DE PRODUTOS — o primeiro cadastro servido pelo backend.
 *
 * `GET /api/products` (listagem) e `GET /api/products/{id}` (detalhe) existem no
 * contrato; a tela deixou de ler `src/mocks/produtos.ts`.
 *
 * ## O contrato v1 é MENOR que a tela
 *
 * A §6 da transcrição tem 5 abas; o `ProductDetailDto` traz `code`, `description`,
 * `active` e a grade de variantes. O que o servidor ainda não conhece continua
 * aparecendo em branco no formulário — a alternativa seria esconder abas que a
 * transcrição registra, apagando o que o cadastro precisa vir a ter. O mapa
 * campo-a-campo do que falta está em `docs/integracao.md`; a tela avisa o
 * operador em vez de deixar o branco passar por dado.
 *
 * ## A escrita é REPARTIDA, e continua menor que a tela
 *
 * O produto grava por `POST /api/products` e `PUT /api/products/{id}`, com
 * `ProductWriteRequest` de 3 campos (`code`, `description`, `active`). A grade de
 * Valores grava por endpoint PRÓPRIO — `POST/PUT
 * /api/products/{productId}/variants[/{id}]` —, então um `Gravar` da tela pode
 * virar várias requisições, e não há transação entre elas (o contrato não
 * oferece uma). As demais abas seguem sem escrita, e a tela diz isso.
 *
 * Nenhum corpo leva `id` ou `tenantId` (decisão do backend: a empresa vem da
 * sessão, o id vem da rota — campo que o cliente não escolhe não existe no
 * corpo). Na escrita, o escopo errado não falha em silêncio: o RLS recusa com
 * 403 e o `detail` chega à tela.
 *
 * **O que NÃO se escreve:** estoque atual. Desde o kardex (`stock_movements`,
 * append-only), o saldo é derivado de movimento — `POST
 * /api/variants/{variantId}/stock-movements` existe no contrato e ainda não tem
 * tela; enquanto não tiver, a grade não finge que ajusta estoque.
 */

export const URL_PRODUTOS = '/api/products'

/**
 * Whitelist de `sortBy` do backend (`contrato-http-listagem.md`: "Whitelist
 * `code`/`description`/`active`; ordem padrão por código"). Fora dela o servidor
 * responde 400 — por isso as colunas da listagem são chaveadas pelos nomes do DTO
 * e não pelos nomes em português: o `accessorKey` da coluna É o `sortBy` que viaja.
 */
export const ORDENAVEIS: readonly string[] = ['code', 'description', 'active']

/**
 * Variante do contrato → linha da grade §6.3.
 *
 * `indice` e `tipoValor` ficam vazios: não existem no `ProductVariantDto`, e
 * preencher com algo plausível seria inventar dado. `stockQty` vem no DTO e não
 * tem coluna na grade — a §6.3 mostra `Est.Mínimo`, não estoque atual. E desde o
 * kardex (`/api/variants/{variantId}/stock-movements`) o estoque atual é
 * DERIVADO: não se escreve nele, escreve-se movimento.
 *
 * O `id` da variante agora é PRESERVADO: com `PUT …/variants/{id}` no contrato,
 * é ele que separa "alterar esta linha" de "criar outra".
 */
export function varianteDoContrato(dto: ProductVariantDto): ProdutoVariante {
  return {
    id: dto.id,
    ativo: dto.active,
    acabamento: dto.finish,
    tamanho: dto.size,
    valorTabelaCentavos: dto.priceCents,
    indice: '',
    estoqueMinimo: formatQuantidade(dto.minStock),
    tipoValor: null,
  }
}

/**
 * Detalhe do contrato → registro do formulário.
 *
 * Base em `produtoVazio`: os campos fora do contrato v1 nascem em branco, e é
 * assim que devem ficar — herdá-los de um mock daria ao operador dado de mentira
 * com cara de dado do servidor.
 *
 * `valorTabelaCentavos` (nível produto) continua 0 de propósito: a §6.3 põe preço
 * na VARIANTE e o schema do backend confirma (`product_tenant.price_cents` ligado
 * à variante). Derivar "o preço da primeira variante" seria regra inventada aqui.
 */
export function produtoDoContrato(dto: ProductDetailDto): Produto {
  return {
    ...produtoVazio(dto.id),
    nossoCodigo: dto.code,
    nossaDescricao: dto.description,
    ativo: dto.active,
    // Os TRÊS códigos do legado, que a extração confirmou (2026-08-13): a
    // operação usa os três, e quem decorou o reduzido não acha o produto pelo
    // nosso.
    codigoEspecial: dto.specialCode ?? '',
    codigoReduzido: dto.shortCode ?? '',
    // Entrada e saída podem ter unidades DIFERENTES — comprar em caixa e vender
    // em peça é rotina do ramo. Por isso são quatro campos e não dois.
    unidadeEntradaUnidade: dto.unitIn ?? null,
    unidadeEntradaQuantidade: dto.unitInQty ?? '',
    unidadeSaidaUnidade: dto.unitOut ?? null,
    unidadeSaidaQuantidade: dto.unitOutQty ?? '',
    // Classificação do catálogo: o NOME preenche o combo (é o que o operador
    // vê e escolhe), o ID fica guardado para a escrita devolver — ver a nota do
    // tipo `Produto`.
    tipoProduto: dto.productTypeName ?? '',
    tipoProdutoId: dto.productTypeId ?? null,
    marca: dto.brandName ?? '',
    marcaId: dto.brandId ?? null,
    fabrica: dto.factoryName ?? '',
    fabricaId: dto.factoryId ?? null,
    variantes: dto.variants.map(varianteDoContrato),
  }
}

/**
 * A listagem devolve o `ProductDto` CRU (sem tradução para os nomes em
 * português). Traduzir aqui quebraria a ordenação: o `sortBy` que viaja é o
 * `accessorKey` da coluna, e a whitelist do servidor é em inglês.
 */
export interface ProdutosProvider extends ListProvider<ProductDto> {
  list(state: TableQueryState): Promise<PagedResult<ProductDto>>
  /** Um produto por id (uuid); `null` quando não existe (404). */
  get(id: string): Promise<Produto | null>
  /** Registro em branco do "Incluir" — local, o backend não fornece. */
  empty(): Produto
}

export const produtosApi: ProdutosProvider = {
  ...createApiListProvider<ProductDto>({ url: URL_PRODUTOS }),

  async get(id) {
    const dto = itemOuNulo<ProductDetailDto>(await getProduct(id), `o produto ${id}`)
    return dto ? produtoDoContrato(dto) : null
  },

  empty: () => produtoVazio(),
}

/**
 * O que a tela GRAVA de um produto — recorte estrutural, não o `Produto` inteiro.
 *
 * O formulário passa o registro completo; a desativação pela listagem passa a
 * própria linha traduzida. Os dois entram pela mesma porta de propósito: quando o
 * `ProductWriteRequest` crescer, o campo novo aparece aqui uma vez e os dois
 * caminhos o levam. Caminho paralelo montando corpo à mão seria o lugar onde o
 * campo novo seria esquecido — e `PUT` que esquece campo APAGA campo.
 */
export interface CamposGravaveis {
  nossoCodigo: string
  nossaDescricao: string
  ativo: boolean
  /** Os outros dois códigos do legado — ver `produtoDoContrato`. */
  codigoEspecial: string
  codigoReduzido: string
  unidadeEntradaUnidade: string | null
  unidadeEntradaQuantidade: string
  unidadeSaidaUnidade: string | null
  unidadeSaidaQuantidade: string
  /** IDs da classificação — a tela não os edita, só os devolve. */
  tipoProdutoId: string | null
  marcaId: string | null
  fabricaId: string | null
}

/**
 * Registro do formulário → corpo da escrita do PRODUTO.
 *
 * SÓ os 3 campos do `ProductWriteRequest`. A grade de variantes NÃO entra aqui —
 * não porque não se grave (agora se grava), mas porque ela tem endpoint PRÓPRIO:
 * `POST/PUT /api/products/{productId}/variants[/{id}]`. Empacotá-la neste corpo
 * seria pedir ao servidor que ignorasse campo. `id` e `tenantId` ficam fora pelo
 * motivo de sempre: o id vai na rota do PUT e a empresa vem da sessão.
 */
export function produtoParaContrato(values: CamposGravaveis): ProductWriteRequest {
  return {
    code: values.nossoCodigo,
    description: values.nossaDescricao,
    active: values.ativo,
    specialCode: values.codigoEspecial,
    shortCode: values.codigoReduzido,
    unitIn: values.unidadeEntradaUnidade,
    unitInQty: values.unidadeEntradaQuantidade,
    unitOut: values.unidadeSaidaUnidade,
    unitOutQty: values.unidadeSaidaQuantidade,
    // Só o ID viaja, e ele vem da LEITURA, não do combo: o formulário escolhe
    // por nome e o contrato escreve por id. Mandar nulo porque a tela não tem o
    // id apagaria a classificação do produto no `PUT`.
    productTypeId: values.tipoProdutoId,
    brandId: values.marcaId,
    factoryId: values.fabricaId,
  }
}

/**
 * Corpo da DESATIVAÇÃO — a linha da listagem de volta, com `active: false`.
 *
 * O `Excluir` da barra de ações nunca apaga (padrão 8). Passar pela
 * `produtoParaContrato` com os PRÓPRIOS valores da linha é o que garante que só a
 * situação muda: o `PUT` substitui o registro inteiro, e `code`/`description`
 * mandados como nulo porque "a listagem não é o formulário" apagariam o cadastro
 * inteiro para desativá-lo. Mesmo argumento do `corpoDeDesativacao` de parceiros.
 *
 * A linha basta porque o `ProductWriteRequest` é subconjunto do `ProductDto` —
 * ela já traz todo campo gravável, e reler o detalhe por id antes de desativar
 * pediria ao servidor o que acabou de chegar.
 */
export function corpoDeDesativacao(linha: ProductDto): ProductWriteRequest {
  return produtoParaContrato({
    nossoCodigo: linha.code,
    nossaDescricao: linha.description,
    ativo: false,
    // A LINHA da listagem traz os seis, mesmo sem coluna para eles — é por isso
    // que o comentário acima insiste que o corpo saia de uma porta só. Um
    // `Excluir` que os mandasse nulos apagaria código e unidade do cadastro
    // inteiro para desativá-lo.
    codigoEspecial: linha.specialCode ?? '',
    codigoReduzido: linha.shortCode ?? '',
    unidadeEntradaUnidade: linha.unitIn ?? null,
    unidadeEntradaQuantidade: linha.unitInQty ?? '',
    unidadeSaidaUnidade: linha.unitOut ?? null,
    unidadeSaidaQuantidade: linha.unitOutQty ?? '',
    tipoProdutoId: linha.productTypeId ?? null,
    marcaId: linha.brandId ?? null,
    fabricaId: linha.factoryId ?? null,
  })
}

/**
 * Linha da grade → corpo da escrita da VARIANTE.
 *
 * Cinco campos, e o que falta importa: **`stockQty` não existe no
 * `VariantWriteRequest`**. O estoque atual virou saldo derivado do kardex
 * (`stock_movements`, append-only — ADR-009 do backend), então não se escreve
 * nele: escreve-se movimento, por outro endpoint. `Est.Mínimo` continua sendo do
 * cadastro e viaja daqui.
 *
 * `indice` e `tipoValor` da §6.3 seguem sem lugar no contrato — a grade os mostra
 * e eles não vão a lugar nenhum. É o mesmo tipo de buraco das outras abas, e a
 * tela avisa em vez de fingir que gravou.
 */
export function varianteParaContrato(v: ProdutoVariante): VariantWriteRequest {
  const minStock = parseQuantidade(v.estoqueMinimo)
  if (minStock === undefined) {
    // Barrado antes pelo schema do formulário; aqui é rede de segurança —
    // mandar `null` por texto inválido apagaria o mínimo sem ninguém pedir.
    throw new Error(`Est.Mínimo inválido na variante ${v.acabamento || '(sem acabamento)'}.`)
  }
  return {
    finish: v.acabamento,
    size: v.tamanho,
    active: v.ativo,
    priceCents: v.valorTabelaCentavos,
    minStock,
  }
}

/** Duas linhas iguais no que o contrato grava — o que não viaja não conta. */
function varianteMudou(antes: ProdutoVariante, agora: ProdutoVariante): boolean {
  const a = varianteParaContrato(antes)
  const b = varianteParaContrato(agora)
  return (
    a.finish !== b.finish ||
    a.size !== b.size ||
    a.active !== b.active ||
    a.priceCents !== b.priceCents ||
    a.minStock !== b.minStock
  )
}

/**
 * Grava a grade de Valores: linha sem `id` vira `POST`, linha alterada vira `PUT`.
 *
 * **Linha inalterada não vira requisição.** A grade tem N linhas e o `Gravar` é
 * um clique: mandar todas seria N escritas por gravação, cada uma com sua chance
 * de 409 e cada uma carimbando alteração em registro que ninguém tocou.
 *
 * **Sequencial, não em paralelo:** o erro precisa apontar QUAL linha falhou, e
 * disparar as escritas juntas embaralharia a ordem das mensagens.
 *
 * **Não há transação entre endpoints** — o contrato não oferece uma. Se a
 * terceira variante falhar, o produto e as duas anteriores já estão gravados; a
 * mensagem diz isso e manda reabrir o produto antes de tentar de novo, porque a
 * grade em tela ainda mostra como novas as linhas que já foram criadas.
 */
export async function gravarVariantes(
  produtoId: string,
  variantes: readonly ProdutoVariante[],
  originais: readonly ProdutoVariante[],
): Promise<void> {
  const antes = new Map(originais.filter((v) => v.id).map((v) => [v.id, v]))

  for (const variante of variantes) {
    const anterior = variante.id ? antes.get(variante.id) : undefined
    if (anterior && !varianteMudou(anterior, variante)) continue

    const body = varianteParaContrato(variante)
    const resposta: RespostaDaApi = variante.id
      ? await updateVariant(produtoId, variante.id, body)
      : await createVariant(produtoId, body)

    if (!respostaOk(resposta) || !resposta.data) {
      const onde = `${variante.acabamento || '(sem acabamento)'} / ${variante.tamanho || '(sem tamanho)'}`
      throw new ErroDaApi(
        `Falha ao gravar a variante ${onde}. O produto já foi gravado — reabra o produto antes de tentar de novo.`,
        resposta.status,
        detalheDoProblema(resposta.data),
      )
    }
  }
}

/** O que o `Gravar` manda: o registro editado e o que veio do servidor. */
export interface GravacaoDeProduto {
  values: Produto
  /** Registro como o servidor o devolveu; ausente no Incluir. */
  original?: Produto | null
}

/**
 * A única saída de escrita do PRODUTO: `id` vazio = Incluir (POST → 201), senão
 * Alterar (PUT → 200). Recebe o corpo PRONTO porque nem todo caminho parte do
 * formulário — a desativação parte da linha da listagem.
 *
 * Toda falha vira `ErroDaApi` com o `detail` do problem+json — na escrita o
 * modo de falhar é ERRO ALTO (400 validação, 403 escopo recusado pelo RLS, 409
 * conflito/sem empresa ativa), nunca silêncio. A tela mostra o `detail`, que é
 * a frase que o backend escolheu para o caso.
 */
export async function escreverProduto(id: string, body: ProductWriteRequest): Promise<ProductDto> {
  const resposta: RespostaDaApi = id ? await updateProduct(id, body) : await createProduct(body)

  if (!respostaOk(resposta) || !resposta.data) {
    throw new ErroDaApi(
      'Falha ao gravar o produto.',
      resposta.status,
      detalheDoProblema(resposta.data),
    )
  }
  return resposta.data as ProductDto
}

/**
 * `Gravar` do formulário: o produto pela porta única e, depois, a grade de
 * Valores no endpoint das variantes.
 *
 * O produto vem PRIMEIRO porque a variante pendura no id dele — no Incluir, esse
 * id só existe depois do 201.
 */
export async function gravarProduto({ values, original }: GravacaoDeProduto): Promise<ProductDto> {
  const gravado = await escreverProduto(values.id, produtoParaContrato(values))
  await gravarVariantes(gravado.id, values.variantes, original?.variantes ?? [])
  return gravado
}

/**
 * Mutation do Gravar de produtos. Em sucesso, invalida a listagem
 * (`['produtos']`) e o detalhe (`['produto', id]`) — o registro que voltou do
 * servidor é a verdade nova, e o cache anterior mostraria o cadastro velho por
 * até 30s (staleTime).
 */
export function useGravarProduto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gravarProduto,
    onSuccess: (gravado) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['produtos'] }),
        queryClient.invalidateQueries({ queryKey: ['produto', gravado.id] }),
      ]),
  })
}

/**
 * `Excluir` da listagem de produtos: desativa e recarrega.
 *
 * Mora na fronteira, e não na rota, pelo mesmo motivo do
 * `useDesativarParceiro` — é a fronteira que sabe montar o corpo do `PUT`, e
 * escrita espalhada por rota já custou caro no `Alterar`.
 *
 * Invalida a listagem E o detalhe: a linha continua na tela (é desativação, não
 * sumiço) e volta com `Ativo: Não`, que é a prova visível de que a escrita valeu;
 * o detalhe em cache ainda diria `Ativo` marcado por até 30s (`staleTime`), e
 * quem clicasse em `Alterar` logo depois veria o cadastro que acabou de desativar
 * aparecer como ativo.
 */
export function useDesativarProduto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linha: ProductDto) => escreverProduto(linha.id, corpoDeDesativacao(linha)),
    onSuccess: (_, linha) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['produtos'] }),
        queryClient.invalidateQueries({ queryKey: ['produto', linha.id] }),
      ]),
  })
}
