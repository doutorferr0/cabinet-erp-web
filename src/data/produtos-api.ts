import type {
  ProductDetailDto,
  ProductDimensions,
  ProductDto,
  ProductRelatedDto,
  ProductRelatedWriteRequest,
  ProductSpecs,
  ProductSupplierDto,
  ProductSupplierWriteRequest,
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
import { avisar } from '@/lib/avisos'
import { formatQuantidade, parseQuantidade } from '@/lib/formatters'
import type { PagedResult, TableQueryState } from '@/lib/table-query'
import {
  type Produto,
  type ProdutoFornecedor,
  type ProdutoRelacionado,
  type ProdutoVariante,
  produtoVazio,
} from '@/mocks/produtos'
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
 * ## Produto é da ORGANIZAÇÃO; preço e estoque são da EMPRESA
 *
 * Os dois níveis estão no próprio contrato, e é o que explica a repartição
 * acima: `ProductWriteRequest` não tem um único campo de empresa, enquanto
 * `VariantWriteRequest` leva `priceCents` e `minStock`, que são por empresa. O
 * catálogo é do grupo — as empresas veem os MESMOS produtos e divergem no que de
 * fato varia. Por isso `GET /api/products` **não é recortado por empresa**, e o
 * recorte reaparece em `ProductVariantDto`.
 *
 * Nenhum corpo leva `id` ou `tenantId` (decisão do backend: o id vem da rota e a
 * empresa vem da sessão — campo que o cliente não escolhe não existe no corpo).
 * **O 403 da escrita não é mais "escopo errado":** produto não tem escopo de
 * empresa para errar. Ele é `mustChangePassword` ou papel sem permissão, e o
 * `detail` do problem+json é o que diz qual — a tela mostra o que veio.
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
 * Whitelist de `field` do filtro estruturado — hoje a MESMA do `sortBy`, e o
 * contrato diz isso na descrição do parâmetro `filters`.
 *
 * Aliás dele, não cópia: se um dia divergirem (filtrar por `brandName` sem
 * ordenar por ele), a divergência é uma edição deliberada aqui, não um esquecimento
 * de manter duas listas iguais em sincronia.
 */
export const FILTRAVEIS: readonly string[] = ORDENAVEIS

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
/**
 * `ProductSupplierDto` → a linha da grade `Fornecedor` (§6.1) que a aba já
 * desenha. Os quatro campos casam UM A UM, e é por isso que a leitura não
 * precisou de grade nova: `padrao`/`fornecedor`/`codProdFornecedor`/
 * `descricaoFornecedor` são `isDefault`/`supplierName`/`supplierCode`/
 * `supplierDescription`.
 *
 * O que se PERDE na tradução é o `supplierId`, e a perda é consciente: a coluna
 * do legado é TEXTO LIVRE digitado, e o id só volta a importar quando a tela
 * trocar o campo por um LookupCombo de parceiro — a reconciliação que a api#117
 * §4 reserva para a FASE C. Enquanto a escrita da grade não existe em
 * `ProductWriteRequest`, guardar o id aqui seria carregar um dado que nada lê.
 */
export function fornecedorDoContrato(dto: ProductSupplierDto): ProdutoFornecedor {
  return {
    padrao: dto.isDefault,
    fornecedor: dto.supplierName,
    codProdFornecedor: dto.supplierCode ?? '',
    descricaoFornecedor: dto.supplierDescription ?? '',
  }
}

/**
 * `ProductRelatedDto` → `ProdutoRelacionado`, campo a campo e sem achatar em
 * `itensGrupo`: as duas formas do §6.4 são modelos DIFERENTES, e a decisão de
 * qual sobrevive está em aberto (api#117).
 *
 * `quantity` vira string vazia quando é `null` — o discriminador continua
 * legível (vazio = sugestão, preenchido = kit) e o controle do formulário
 * recebe um valor, nunca `undefined`, que é o que faz um input alternar entre
 * controlado e não controlado no meio da digitação.
 */
export function relacionadoDoContrato(dto: ProductRelatedDto): ProdutoRelacionado {
  return {
    id: dto.id,
    produtoId: dto.relatedProductId,
    codigo: dto.relatedProductCode,
    descricao: dto.relatedProductDescription,
    quantidade: dto.quantity ?? '',
    ordem: dto.sortOrder,
  }
}

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
    ...fichaDoContrato(dto.specs),
    variantes: dto.variants.map(varianteDoContrato),
    // As duas grades do §6.1/§6.4 são OPCIONAIS no contrato, e ausente não é
    // vazio: ausente quer dizer que o servidor não serve a grade (backend mais
    // velho que este contrato), `[]` quer dizer que o produto não tem linha
    // nenhuma. As duas caem em lista vazia na TELA — ela desenha a grade em
    // branco dos dois jeitos —, e a distinção fica onde ela decide algo, que é
    // na escrita, quando houver escrita.
    fornecedores: (dto.suppliers ?? []).map(fornecedorDoContrato),
    produtosRelacionados: (dto.relatedProducts ?? []).map(relacionadoDoContrato),
    // As duas grades do contrato, carregadas-não-editadas — ver o tipo `Produto`.
    // `??` e não `?? []`: ausente e vazio são coisas diferentes na volta, e
    // trocar um pelo outro aqui faria o corpo mandar `[]` (apaga) onde devia
    // omitir (não mexe).
    ...(dto.suppliers ? { fornecedoresDoServidor: dto.suppliers } : {}),
    ...(dto.relatedProducts ? { relacionadosDoServidor: dto.relatedProducts } : {}),
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
  ...createApiListProvider<ProductDto>({ url: URL_PRODUTOS, filtraveis: FILTRAVEIS }),

  async get(id) {
    const dto = itemOuNulo<ProductDetailDto>(await getProduct(id), `o produto ${id}`)
    return dto ? produtoDoContrato(dto) : null
  },

  empty: () => produtoVazio(),
}

/**
 * Ficha técnica do contrato → os campos da aba `Outros Dados` (§6.2).
 *
 * Duas formas para a mesma coisa, e a tradução mora aqui: o contrato agrupa a
 * vertical num objeto (`specs`) porque ela É a vertical — iluminação tem lúmen e
 * temperatura de cor, outro ramo teria outra lista. O FORMULÁRIO, por sua vez, é
 * plano: cada campo é um controle com nome próprio, e achatar aqui é o que evita
 * `values.specs?.watts` espalhado por dez `TextField`.
 *
 * Ausência vira string vazia, nunca `undefined`: campo controlado do RHF precisa
 * de valor, e `undefined` faz o input alternar entre controlado e não controlado
 * no meio da digitação.
 */
function fichaDoContrato(specs: ProductSpecs | null | undefined) {
  return {
    qtdLampadasPorReator: specs?.lampsPerBallast ?? '',
    consumoWatts: specs?.watts ?? '',
    tensaoVolts: specs?.volts ?? '',
    tensaoBiVolts: specs?.biVolts ?? '',
    temperaturaCor: specs?.colorTemperature ?? '',
    angulo: specs?.beamAngle ?? '',
    lumen: specs?.lumen ?? '',
    vaoLivre: specs?.clearSpan ?? '',
    corteNicho: specs?.nicheCut ?? '',
    pesoLiquido: specs?.netWeight ?? '',
    pesoBruto: specs?.grossWeight ?? '',
    tempoInstalacaoMin: specs?.installationMinutes ?? '',
    garantiaMeses: specs?.warrantyMonths ?? '',
    dimensoesProduto: dimensoesDoContrato(specs?.productDimensions),
    dimensoesEmbalagem: dimensoesDoContrato(specs?.packageDimensions),
  }
}

function dimensoesDoContrato(d: ProductDimensions | null | undefined) {
  return {
    altura: d?.height ?? '',
    largura: d?.width ?? '',
    comprimento: d?.length ?? '',
    raio: d?.radius ?? '',
  }
}

/**
 * Os campos do formulário → `specs` do contrato.
 *
 * **Ficha inteira em branco viaja como `null`**, não como um objeto de quinze
 * strings vazias — a mesma regra da conta bancária do parceiro. Objeto vazio
 * gravado é ficha técnica que existe e não diz nada, e o servidor não teria como
 * distinguir "sem medida" de "medida apagada".
 */
function fichaParaContrato(values: CamposGravaveis): ProductSpecs | null {
  const specs: ProductSpecs = {
    lampsPerBallast: values.qtdLampadasPorReator,
    watts: values.consumoWatts,
    volts: values.tensaoVolts,
    biVolts: values.tensaoBiVolts,
    colorTemperature: values.temperaturaCor,
    beamAngle: values.angulo,
    lumen: values.lumen,
    clearSpan: values.vaoLivre,
    nicheCut: values.corteNicho,
    netWeight: values.pesoLiquido,
    grossWeight: values.pesoBruto,
    installationMinutes: values.tempoInstalacaoMin,
    warrantyMonths: values.garantiaMeses,
    productDimensions: dimensoesParaContrato(values.dimensoesProduto),
    packageDimensions: dimensoesParaContrato(values.dimensoesEmbalagem),
  }

  const preenchida =
    [
      specs.lampsPerBallast,
      specs.watts,
      specs.volts,
      specs.biVolts,
      specs.colorTemperature,
      specs.beamAngle,
      specs.lumen,
      specs.clearSpan,
      specs.nicheCut,
      specs.netWeight,
      specs.grossWeight,
      specs.installationMinutes,
      specs.warrantyMonths,
    ].some((v) => (v ?? '').trim() !== '') ||
    specs.productDimensions !== null ||
    specs.packageDimensions !== null

  return preenchida ? specs : null
}

function dimensoesParaContrato(d: {
  altura: string
  largura: string
  comprimento: string
  raio: string
}): ProductDimensions | null {
  if ([d.altura, d.largura, d.comprimento, d.raio].every((v) => v.trim() === '')) return null
  return { height: d.altura, width: d.largura, length: d.comprimento, radius: d.raio }
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
  /**
   * As duas grades do contrato, como vieram do DETALHE — ver o tipo `Produto`.
   *
   * Opcionais porque a desativação pela listagem não as tem: a linha do
   * `ProductDto` não traz grade nenhuma, e é justamente aí que a omissão salva.
   * Marcá-las obrigatórias forçaria `corpoDeDesativacao` a inventar `[]`, que é
   * a instrução de APAGAR.
   */
  fornecedoresDoServidor?: ProductSupplierDto[]
  relacionadosDoServidor?: ProductRelatedDto[]
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
  /** Ficha técnica da §6.2, plana como o formulário — ver `fichaParaContrato`. */
  qtdLampadasPorReator: string
  consumoWatts: string
  tensaoVolts: string
  tensaoBiVolts: string
  temperaturaCor: string
  angulo: string
  lumen: string
  vaoLivre: string
  corteNicho: string
  pesoLiquido: string
  pesoBruto: string
  tempoInstalacaoMin: string
  garantiaMeses: string
  dimensoesProduto: { altura: string; largura: string; comprimento: string; raio: string }
  dimensoesEmbalagem: { altura: string; largura: string; comprimento: string; raio: string }
}

/**
 * Campo de texto vazio volta como `null`, não como `''`.
 *
 * Medido no par local (2026-08-18): o produto do Postgres chega com
 * `specialCode`, `shortCode` e os dois `unitQty` em `null`, o formulário os
 * carrega como string vazia — porque input controlado precisa de string — e os
 * devolvia assim. Como o `PUT` é INTEGRAL, abrir a tela e clicar em `Gravar`
 * **sem editar nada** trocava "não informado" por "texto vazio" no servidor: uma
 * alteração que ninguém pediu, num registro que o operador só foi conferir.
 *
 * Vale nos dois sentidos, e é por isso que a regra é do CORPO e não da leitura:
 * quem APAGA um código especial que existia também quer `null` ali, não `''`.
 *
 * `code` e `description` ficam fora de propósito — são obrigatórios no
 * formulário, e um vazio ali é erro de validação, não ausência a preservar.
 */
function textoOuNulo(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  return texto === '' ? null : texto
}

/**
 * Registro do formulário → corpo da escrita do PRODUTO.
 *
 * SÓ os 3 campos do `ProductWriteRequest`. A grade de variantes NÃO entra aqui —
 * não porque não se grave (agora se grava), mas porque ela tem endpoint PRÓPRIO:
 * `POST/PUT /api/products/{productId}/variants[/{id}]`. Empacotá-la neste corpo
 * seria pedir ao servidor que ignorasse campo. `id` e `tenantId` ficam fora pelo
 * motivo de sempre — e no caso do `tenantId` há um motivo a mais: **produto é
 * cadastro da organização**, então não há empresa a informar. Quem carrega a
 * parte por empresa é o corpo da VARIANTE.
 */
export function produtoParaContrato(values: CamposGravaveis): ProductWriteRequest {
  return {
    code: values.nossoCodigo,
    description: values.nossaDescricao,
    active: values.ativo,
    specialCode: textoOuNulo(values.codigoEspecial),
    shortCode: textoOuNulo(values.codigoReduzido),
    unitIn: values.unidadeEntradaUnidade,
    unitInQty: textoOuNulo(values.unidadeEntradaQuantidade),
    unitOut: values.unidadeSaidaUnidade,
    unitOutQty: textoOuNulo(values.unidadeSaidaQuantidade),
    // Só o ID viaja, e ele vem da LEITURA, não do combo: o formulário escolhe
    // por nome e o contrato escreve por id. Mandar nulo porque a tela não tem o
    // id apagaria a classificação do produto no `PUT`.
    productTypeId: values.tipoProdutoId,
    brandId: values.marcaId,
    factoryId: values.fabricaId,
    // As duas grades voltam como VIERAM, e a chave só aparece quando há grade
    // carregada: `ProductWriteRequest` lê ausente como "não mexi" e `[]` como
    // "apague". Emitir `[]` por reflexo — que é o que um `?? []` faria — faria a
    // desativação pela listagem apagar a grade de fornecedores do produto.
    //
    // O shape muda no caminho: a leitura traz `id` e os nomes resolvidos, a
    // escrita não os aceita. Reemitir o DTO cru deixaria o servidor decidir o que
    // fazer com campo que ele não declara, e a resposta certa para isso é não
    // mandar.
    ...(values.fornecedoresDoServidor
      ? { suppliers: values.fornecedoresDoServidor.map(fornecedorParaContrato) }
      : {}),
    ...(values.relacionadosDoServidor
      ? { relatedProducts: values.relacionadosDoServidor.map(relacionadoParaContrato) }
      : {}),
    specs: fichaParaContrato(values),
  }
}

/** Uma linha da grade de fornecedores, da leitura para a escrita. */
function fornecedorParaContrato(linha: ProductSupplierDto): ProductSupplierWriteRequest {
  return {
    supplierId: linha.supplierId,
    supplierCode: linha.supplierCode ?? null,
    supplierDescription: linha.supplierDescription ?? null,
    isDefault: linha.isDefault,
    active: linha.active,
  }
}

/** Uma linha da grade de relacionados, da leitura para a escrita. */
function relacionadoParaContrato(linha: ProductRelatedDto): ProductRelatedWriteRequest {
  return {
    relatedProductId: linha.relatedProductId,
    // `quantity` É o discriminador kit×sugestão: nula é sugestão. Trocar por `0`
    // ou `''` aqui viraria um kit de zero unidades, que o servidor recusa.
    quantity: linha.quantity ?? null,
    sortOrder: linha.sortOrder,
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
 * **A LINHA NÃO BASTA, e isso foi medido (2026-08-18).** `ProductWriteRequest` é
 * subconjunto do `ProductDto` no papel, mas `specs` é OPCIONAL no `ProductDto` e
 * o `cabinet-erp-api` não o manda na listagem — a ficha técnica só vem no
 * detalhe. Com `PUT` integral, desativar pela listagem apagava watts, lúmen,
 * garantia e as medidas do produto. Por isso quem chama esta função passa o
 * DETALHE relido (`useDesativarProduto`), não a linha: o parâmetro continua
 * tipado como `ProductDto` porque o detalhe o satisfaz, e é o detalhe que traz
 * `specs` preenchido.
 *
 * O mock escondia: a listagem mockada devolve o objeto inteiro, `specs` dentro.
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
    // A ficha técnica também volta da LINHA: desativar não pode apagar as
    // medidas do produto. `fichaDoContrato` achata, `fichaParaContrato` remonta.
    ...fichaDoContrato(linha.specs),
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
 * **É este corpo que carrega a metade POR EMPRESA do catálogo:** `priceCents` e
 * `minStock` são da empresa ativa, enquanto `finish`/`size` são a identidade da
 * variante no grupo. Uma requisição, dois níveis — o mesmo arranjo de
 * `PartnerWriteRequest`.
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
        resposta.data,
        resposta.url,
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
 * modo de falhar é ERRO ALTO (400 validação, 403 sem permissão, 409 conflito ou
 * sem empresa ativa), nunca silêncio. A tela mostra o `detail`, que é a frase
 * que o backend escolheu para o caso.
 */
export async function escreverProduto(id: string, body: ProductWriteRequest): Promise<ProductDto> {
  const resposta: RespostaDaApi = id ? await updateProduct(id, body) : await createProduct(body)

  if (!respostaOk(resposta) || !resposta.data) {
    throw new ErroDaApi(
      'Falha ao gravar o produto.',
      resposta.status,
      detalheDoProblema(resposta.data),
      resposta.data,
      resposta.url,
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
    onSuccess: (gravado) => {
      // Ver `lib/avisos.ts` (#201): o `Gravar` navega de volta para a listagem,
      // e sem isto a resposta ao clique era uma troca de tela e mais nada.
      avisar('Produto gravado.', gravado.description ?? undefined)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['produtos'] }),
        queryClient.invalidateQueries({ queryKey: ['produto', gravado.id] }),
      ])
    },
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
    /**
     * Relê o DETALHE antes de gravar. Não é cautela: a listagem do backend não
     * traz `specs` (medido), o `PUT` é integral, e montar o corpo com a linha
     * apagaria a ficha técnica para mudar uma situação.
     *
     * Detalhe que não vem é motivo para NÃO gravar. Cair de volta na linha
     * gravaria o registro incompleto — que é exatamente o defeito — e um
     * `Excluir` que falha em voz alta é melhor que um que desativa e apaga.
     */
    mutationFn: async (linha: ProductDto) => {
      const detalhe = itemOuNulo<ProductDetailDto>(
        await getProduct(linha.id),
        `o produto ${linha.id}`,
      )
      if (!detalhe) {
        throw new Error(
          `Não foi possível reler o produto ${linha.code} para desativá-lo. Nada foi gravado.`,
        )
      }
      return escreverProduto(linha.id, corpoDeDesativacao(detalhe))
    },
    onSuccess: (_, linha) => {
      avisar(
        `${linha.description ?? 'Produto'} foi desativado.`,
        'O cadastro continua no sistema, inativo.',
      )
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['produtos'] }),
        queryClient.invalidateQueries({ queryKey: ['produto', linha.id] }),
      ])
    },
  })
}
