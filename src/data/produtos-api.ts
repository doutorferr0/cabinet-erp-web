import type {
  ProductDetailDto,
  ProductDto,
  ProductVariantDto,
  ProductWriteRequest,
} from '@/api/gerado'
import { createProduct, getProduct, updateProduct } from '@/api/gerado'
import {
  ErroDaApi,
  createApiListProvider,
  detalheDoProblema,
  itemOuNulo,
} from '@/data/api-provider'
import type { ListProvider } from '@/data/provider'
import { formatQuantidade } from '@/lib/formatters'
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
 * ## A escrita é MENOR que a leitura
 *
 * `POST /api/products` e `PUT /api/products/{id}` chegaram com
 * `ProductWriteRequest` de 3 campos (`code`, `description`, `active`) — menos
 * que o detalhe, que também lê a grade de variantes. Gravar envia SÓ os 3; a
 * grade e as demais abas seguem sem escrita e a tela diz isso. O corpo NÃO leva
 * `id` nem `tenantId` (decisão do backend: a empresa vem da sessão, o id vem da
 * rota — campo que o cliente não escolhe não existe no corpo). Na escrita, o
 * escopo errado não falha em silêncio: o RLS recusa com 403 e o `detail` chega
 * à tela.
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
 * tem coluna na grade — a §6.3 mostra `Est.Mínimo`, não estoque atual.
 * O `id` da variante também se perde: sem endpoint de escrita, não há a quem devolvê-lo.
 */
export function varianteDoContrato(dto: ProductVariantDto): ProdutoVariante {
  return {
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
    const dto = itemOuNulo(await getProduct({ path: { id } }), `o produto ${id}`)
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
}

/**
 * Registro do formulário → corpo da escrita do contrato.
 *
 * SÓ os 3 campos do `ProductWriteRequest`. A grade de variantes aparece na
 * leitura mas NÃO viaja — o DTO de escrita não a tem, e mandá-la seria pedir ao
 * servidor que ignorasse campo (o backend escolheu o contrário: o que o cliente
 * não deveria escolher não existe no corpo). `id` e `tenantId` ficam fora pelo
 * mesmo motivo: o id vai na rota do PUT e a empresa vem da sessão.
 */
export function produtoParaContrato(values: CamposGravaveis): ProductWriteRequest {
  return {
    code: values.nossoCodigo,
    description: values.nossaDescricao,
    active: values.ativo,
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
  })
}

/**
 * A única saída de escrita de produto: `id` vazio = Incluir (POST → 201), senão
 * Alterar (PUT → 200). Recebe o corpo PRONTO porque nem todo caminho parte do
 * formulário — a desativação parte da linha da listagem.
 *
 * Toda falha vira `ErroDaApi` com o `detail` do problem+json — na escrita o
 * modo de falhar é ERRO ALTO (400 validação, 403 escopo recusado pelo RLS, 409
 * conflito/sem empresa ativa), nunca silêncio. A tela mostra o `detail`, que é
 * a frase que o backend escolheu para o caso.
 */
export async function escreverProduto(id: string, body: ProductWriteRequest): Promise<ProductDto> {
  const resposta = id ? await updateProduct({ path: { id }, body }) : await createProduct({ body })

  if (resposta.error || !resposta.data) {
    throw new ErroDaApi(
      'Falha ao gravar o produto.',
      resposta.response?.status ?? 0,
      detalheDoProblema(resposta.error),
    )
  }
  return resposta.data
}

/** `Gravar` do formulário: o registro inteiro vira corpo e vai pela porta única. */
export async function gravarProduto(values: Produto): Promise<ProductDto> {
  return escreverProduto(values.id, produtoParaContrato(values))
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
