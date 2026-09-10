import type { ProductRelatedDto, ProductSupplierDto } from '@/api/gerado'
import { idDeApoio } from '@/mocks/lookups'
/**
 * Produto — campos LITERAIS da transcrição do SoftLux (§6, 5 abas).
 *
 * A TELA de produtos NÃO usa mais este arquivo como fonte: desde que o backend
 * publicou `GET /api/products` e `GET /api/products/{id}`, quem serve a listagem
 * e o formulário é `src/data/produtos-api.ts`. O que sobrou aqui:
 *
 * - o **tipo** `Produto` (superconjunto do contrato v1 — a §6 tem 5 abas, o DTO
 *   tem 4 campos + variantes; ver `docs/integracao.md`);
 * - `produtoVazio`, que é o registro em branco do formulário e continua local
 *   depois da integração (o backend não fornece "em branco");
 * - as **tabelas de apoio estáticas** (acabamentos, unidades, origens…), lidas
 *   por `src/data/tabelas.ts`;
 * - o array `produtos`, hoje consumido só pelo **boletim** (`src/data/boletim.ts`),
 *   que segue mock por não haver endpoint de resumo.
 */

/** Grade `Fornecedor` da aba Dados Principais — §6.1. */
export interface ProdutoFornecedor {
  padrao: boolean
  fornecedor: string
  codProdFornecedor: string
  descricaoFornecedor: string
}

/** Grade de valores por variante (Acabamento × Tamanho) — §6.3. */
export interface ProdutoVariante {
  /**
   * Id da variante no servidor (uuid), ou `null` na linha que o operador acabou
   * de incluir na grade. É ele que decide o verbo: `null` vira `POST` (variante
   * nova), preenchido vira `PUT` naquele id. A leitura descartava este campo
   * enquanto não havia escrita de variante — mantê-lo fora agora faria alterar
   * uma linha existente criar outra.
   */
  id: string | null
  ativo: boolean
  acabamento: string
  tamanho: string
  valorTabelaCentavos: number | null
  indice: string
  estoqueMinimo: string
  tipoValor: string | null
}

/** Endereçamento físico do estoque — §6.3. */
export interface ProdutoLocalizacao {
  acabamento: string
  estoque: string
  predio: string
  rua: string
  numero: string
  apto: string
}

/** Grupos de produtos relacionados — §6.4. */
export interface ProdutoGrupoRelacionado {
  nomeGrupo: string
  padrao: boolean
  ativo: boolean
}

/** Itens do grupo relacionado (quantidade preenchida = kit) — §6.4. */
export interface ProdutoItemGrupo {
  codFornecedor: string
  descricaoFornecedor: string
  acabamento: string
  quantidade: string
  padrao: boolean
}

/**
 * Linha de `relatedProducts` do contrato (§6.4) — produto×produto.
 *
 * NÃO é `ProdutoItemGrupo`, e a diferença é de MODELO, não de nome: o legado
 * agrupa por `nomeGrupo` e descreve o item pelo par código/descrição do
 * FORNECEDOR mais um acabamento; o contrato liga um produto a OUTRO produto e
 * deixa `quantity` discriminar kit (preenchida) de sugestão (nula).
 *
 * As duas convivem na aba porque a reconciliação — o que acontece com o
 * "grupo" — é decisão em aberto (api#117, §4 da medição de 24/08). Traduzir uma
 * na outra aqui escolheria essa decisão em silêncio, num arquivo de tipos.
 */
export interface ProdutoRelacionado {
  /** Id da LINHA da grade, como o servidor a devolve. */
  id: string
  /** O OUTRO produto. É ele que a escrita mandará, quando houver escrita. */
  produtoId: string
  codigo: string
  descricao: string
  /** Decimal em string. Vazio = SUGESTÃO; preenchido = KIT. */
  quantidade: string
  ordem: number
}

/** Regra fiscal por NCM × Operação × CFOP × Consumidor Final × UF — §6.5. */
export interface ProdutoImpostoNfe {
  codigo: string
  descricao: string
  operacao: string
  cfop: string
  consumidorFinal: boolean
  uf: string
  ativo: boolean
}

interface Dimensoes {
  altura: string
  largura: string
  comprimento: string
  raio: string
}

export interface Produto {
  /**
   * Chave técnica (uuid do `products.id` do backend), nunca exibida. O código que
   * o operador lê e digita é `nossoCodigo` — `UNIQUE (tenant_id, code)` no schema.
   */
  id: string
  // --- Aba 1: Dados Principais (§6.1) ---
  nossoCodigo: string
  codigoEspecial: string
  codigoReduzido: string
  nossaDescricao: string
  fornecedores: ProdutoFornecedor[]
  /**
   * As duas grades DO SERVIDOR, carregadas-não-editadas.
   *
   * Elas não são `fornecedores`/`gruposRelacionados`, e a diferença é o ponto: as
   * de cima são as da transcrição, com o fornecedor digitado como TEXTO e os
   * relacionados agrupados por nome de grupo; estas são as do contrato, onde o
   * fornecedor é um `PartnerDto.id` e o relacionado é um par produto×produto com
   * quantidade. Reconciliar as duas formas é a FASE C do G11 (issue `api#117`), e
   * envolve decisão de tela — um LookupCombo de parceiro no lugar do texto livre.
   *
   * Até lá elas existem por um motivo estreito e suficiente: o `PUT` substitui o
   * registro INTEIRO, e `ProductWriteRequest` agora publica as duas grades. Sem
   * carregá-las e devolvê-las, gravar o NOME de um produto pela tela apagaria a
   * grade de fornecedores criada por API — o mesmo defeito que os ids de
   * Tipo/Marca/Fábrica quase causaram, e que a `cobertura-de-escrita` guarda.
   *
   * `undefined` quer dizer "não veio na leitura" — a LISTAGEM não traz as grades,
   * só o detalhe — e faz o corpo OMITIR o campo, que o contrato lê como "não
   * mexi". Omitir é diferente de mandar `[]`, que APAGA.
   */
  fornecedoresDoServidor?: ProductSupplierDto[]
  relacionadosDoServidor?: ProductRelatedDto[]
  dtVigencia: string | null
  tipoProduto: string
  tipoPeca: string | null
  tipoLinha: string | null
  unidadeEntradaUnidade: string | null
  unidadeEntradaQuantidade: string
  unidadeSaidaUnidade: string | null
  unidadeSaidaQuantidade: string
  classificacao: string | null
  empresaCompradora: string | null
  designerModelo: string | null
  fabrica: string
  marca: string
  /**
   * Os IDs de `Tipo de Produto`, `Fábrica` e `Marca` — dado do servidor que a
   * TELA NÃO EDITA e devolve como veio.
   *
   * O formulário escolhe pelo NOME (é o que o `useLookupOptions` expõe), mas o
   * contrato escreve por ID: sem guardar o id, gravar qualquer outro campo
   * mandaria os três nulos e o `PUT` — que substitui o registro inteiro —
   * apagaria a classificação do produto. Mesma técnica do `tradeName` que a tela
   * de Clientes devolve intacto.
   *
   * Nasce `null` no registro em branco e no mock: quem os preenche é o servidor.
   */
  tipoProdutoId: string | null
  fabricaId: string | null
  marcaId: string | null
  descricaoComplementar: string
  foraDeLinha: boolean
  consultarValor: boolean
  /** `Ativo` — desativação lógica, transcrição §9. */
  ativo: boolean
  sobreMedida: boolean
  // --- Aba 2: Outros Dados (§6.2) ---
  qtdLampadasPorReator: string
  consumoWatts: string
  tensaoVolts: string
  tensaoBiVolts: string
  temperaturaCor: string
  angulo: string
  vaoLivre: string
  tempoInstalacaoMin: string
  corteNicho: string
  pesoLiquido: string
  pesoBruto: string
  lumen: string
  garantiaMeses: string
  dimensoesProduto: Dimensoes
  dimensoesEmbalagem: Dimensoes
  descricaoLivre: string
  publicarNoSite: boolean
  // --- Aba 3: Valores\Localização do Estoque (§6.3) ---
  /** Valor da variante padrão — exibido na listagem. Centavos, nunca float. */
  valorTabelaCentavos: number
  variantes: ProdutoVariante[]
  localizacoes: ProdutoLocalizacao[]
  // --- Aba 4: Produtos Relacionados (§6.4) ---
  gruposRelacionados: ProdutoGrupoRelacionado[]
  codigoProduto: string | null
  itensGrupo: ProdutoItemGrupo[]
  /** `relatedProducts` do contrato — ver `ProdutoRelacionado`. */
  produtosRelacionados: ProdutoRelacionado[]
  // --- Aba 5: Tributação (§6.5) ---
  origemProduto: string | null
  ncm: string
  cest: string
  impostoPadrao: string | null
  impostosNfe: ProdutoImpostoNfe[]
}

const MARCAS = [
  'STELLA',
  'ILUMINAR',
  'INTERLIGHT',
  'EVOLED',
  'DRAMALUX',
  'MISTER LED',
  'FILLAMENTO',
  'USINA DESIGN',
  'DSGNSELO',
  'NEWSTANDARD',
  'STUDIOLUCE',
  'ALLOY ILUMINAÇÃO',
] as const

const FABRICAS = [
  'STELLA',
  'ILUMINAR',
  'INTERLIGHT',
  'ATIVA COMERCIAL',
  'DRAMALUX',
  'VIA HF ILUMINAÇÃO',
] as const

const TIPOS = [
  'PENDENTE',
  'PLAFON',
  'SPOT',
  'ARANDELA',
  'LUSTRE',
  'ABAJUR',
  'PERFIL LED',
  'LÂMPADA',
] as const

const DESCRICOES = [
  'PENDENTE REDONDO ALUMÍNIO',
  'PLAFON SOBREPOR QUADRADO',
  'SPOT EMBUTIR DICRÓICA',
  'ARANDELA FRISADA G9',
  'LUSTRE CRISTAL 8 BRAÇOS',
  'ABAJUR CÚPULA TECIDO',
  'PERFIL LED EMBUTIR 2M',
  'LÂMPADA FILAMENTO E27',
  'PENDENTE TRILHO ELETRIFICADO',
  'SPOT SOBREPOR PAR20',
] as const

export const ACABAMENTOS = ['PRETO', 'BRANCO', 'DOURADO', 'COBRE', 'CROMADO'] as const

/** `[combo]` de unidade — a transcrição §6.1 não capturou as opções. */
// TODO(contract): tabela de unidades virá do backend.
export const UNIDADES = ['UN', 'PC', 'CX', 'M', 'KG'] as const

/** `[combo]` Tipo de Valor da variante — §6.3 (coluna cortada na captura). */
// TODO(contract): opções reais virão do backend.
export const TIPOS_VALOR = ['TABELA', 'PROMOÇÃO', 'CUSTO'] as const

/** `Origem do Produtos` — tabela oficial de origem da mercadoria (ICMS). */
export const ORIGENS_PRODUTO = [
  '0 - NACIONAL',
  '1 - ESTRANGEIRA - IMPORTAÇÃO DIRETA',
  '2 - ESTRANGEIRA - ADQUIRIDA NO MERCADO INTERNO',
  '3 - NACIONAL - CONTEÚDO DE IMPORTAÇÃO SUPERIOR A 40%',
  '4 - NACIONAL - PROCESSOS PRODUTIVOS BÁSICOS',
  '5 - NACIONAL - CONTEÚDO DE IMPORTAÇÃO INFERIOR A 40%',
  '6 - ESTRANGEIRA - IMPORTAÇÃO DIRETA, SEM SIMILAR NACIONAL',
  '7 - ESTRANGEIRA - MERCADO INTERNO, SEM SIMILAR NACIONAL',
  '8 - NACIONAL - CONTEÚDO DE IMPORTAÇÃO SUPERIOR A 70%',
] as const

/** Mesmas empresas do CompanySwitcher — recorte por empresa, §9 padrão 7. */
export const EMPRESAS_COMPRADORAS = ['VERTZ ILUMINAÇÃO', 'VIA HF'] as const

function dimensoesVazias(): Dimensoes {
  return { altura: '', largura: '', comprimento: '', raio: '' }
}

/** uuid determinístico — mock precisa ser estável entre execuções, e o id é uuid. */
function idMock(i: number): string {
  return `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
}

/** Lista determinística (sem faker/seed aleatória) — estável para testes e prints. */
export const produtos: Produto[] = Array.from({ length: 45 }, (_, i) => {
  const desc = DESCRICOES[i % DESCRICOES.length] as string
  const acab = ACABAMENTOS[i % ACABAMENTOS.length] as string
  const fabrica = FABRICAS[i % FABRICAS.length] as string
  const valor = 8_990 + ((i * 1_337) % 42_000)
  return {
    id: idMock(i + 1),
    nossoCodigo: String(1201 + i),
    codigoEspecial: `E${String(1201 + i)}`,
    codigoReduzido: String(100 + i),
    nossaDescricao: `${desc} ${acab}`,
    fornecedores: [
      {
        padrao: true,
        fornecedor: fabrica,
        codProdFornecedor: `F${String(4000 + i * 7)}`,
        descricaoFornecedor: desc,
      },
    ],
    dtVigencia: '2025-08-05',
    tipoProduto: TIPOS[i % TIPOS.length] as string,
    tipoPeca: idDeApoio('TIPO_PECA', ['REDONDA', 'QUADRADA', 'LINEAR', 'DIRECIONÁVEL'][i % 4]),
    tipoLinha: idDeApoio('TIPO_LINHA', ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL'][i % 3]),
    unidadeEntradaUnidade: 'UN',
    unidadeEntradaQuantidade: '1',
    unidadeSaidaUnidade: 'UN',
    unidadeSaidaQuantidade: '1',
    classificacao: idDeApoio('CLASSIFICACAO', ['PADRÃO', 'PREMIUM', 'ECONÔMICO'][i % 3]),
    empresaCompradora: EMPRESAS_COMPRADORAS[i % 2] ?? null,
    designerModelo: idDeApoio('DESIGNER', ['LINHA PRÓPRIA', 'STUDIO', 'ASSINADO'][i % 3]),
    fabrica,
    marca: MARCAS[i % MARCAS.length] as string,
    // Os ids agora VÊM da mesma lista que o servidor falso publica (#94): o
    // combo escolhe por id, e um produto semeado sem id abriria com a
    // classificação em branco. `idDeApoio` devolve `null` para nome fora do
    // vocabulário, então continua sem uuid inventado — o que a nota anterior
    // aqui protegia.
    tipoProdutoId: idDeApoio('TIPO_PRODUTO', TIPOS[i % TIPOS.length]),
    fabricaId: idDeApoio('FABRICA', fabrica),
    marcaId: idDeApoio('MARCA', MARCAS[i % MARCAS.length]),
    descricaoComplementar: '',
    foraDeLinha: false,
    consultarValor: true,
    ativo: i % 9 !== 8,
    sobreMedida: false,
    qtdLampadasPorReator: '1',
    consumoWatts: String(9 + (i % 5) * 3),
    tensaoVolts: '220',
    tensaoBiVolts: '127/220',
    temperaturaCor: ['2700K', '3000K', '4000K'][i % 3] ?? '',
    angulo: `${24 + (i % 4) * 12}°`,
    vaoLivre: '',
    tempoInstalacaoMin: String(15 + (i % 3) * 10),
    corteNicho: '',
    pesoLiquido: `${(1 + (i % 5) * 0.4).toFixed(3)}`,
    pesoBruto: `${(1.3 + (i % 5) * 0.4).toFixed(3)}`,
    lumen: String(400 + (i % 8) * 150),
    garantiaMeses: '12',
    dimensoesProduto: {
      altura: String(10 + (i % 6) * 5),
      largura: String(10 + (i % 4) * 4),
      comprimento: String(10 + (i % 3) * 6),
      raio: '',
    },
    dimensoesEmbalagem: dimensoesVazias(),
    descricaoLivre: '',
    publicarNoSite: true,
    valorTabelaCentavos: valor,
    variantes: [
      {
        // Dado de mock não tem id de servidor — quem lê do contrato preenche.
        id: null,
        ativo: true,
        acabamento: acab,
        tamanho: 'ÚNICO',
        valorTabelaCentavos: valor,
        indice: '1,00',
        estoqueMinimo: '2',
        tipoValor: 'TABELA',
      },
    ],
    localizacoes: [],
    gruposRelacionados: [],
    codigoProduto: null,
    itensGrupo: [],
    produtosRelacionados: [],
    origemProduto: ORIGENS_PRODUTO[0] ?? null,
    ncm: '94051200',
    cest: '',
    impostoPadrao: idDeApoio('IMPOSTO_PADRAO', i % 2 === 0 ? 'NACIONAL' : 'IMPORTADO'),
    impostosNfe: [],
  }
})

/**
 * Registro em branco do formulário. `id` vazio no "Incluir": quem atribui a chave
 * técnica é o servidor, e inventar um uuid no cliente daria a um registro que
 * ainda não existe uma identidade que ninguém honraria.
 */
export function produtoVazio(id = ''): Produto {
  return {
    id,
    nossoCodigo: '',
    codigoEspecial: '',
    codigoReduzido: '',
    nossaDescricao: '',
    fornecedores: [],
    dtVigencia: null,
    tipoProduto: '',
    tipoPeca: null,
    tipoLinha: null,
    unidadeEntradaUnidade: null,
    unidadeEntradaQuantidade: '',
    unidadeSaidaUnidade: null,
    unidadeSaidaQuantidade: '',
    classificacao: null,
    empresaCompradora: null,
    designerModelo: null,
    fabrica: '',
    marca: '',
    tipoProdutoId: null,
    fabricaId: null,
    marcaId: null,
    descricaoComplementar: '',
    foraDeLinha: false,
    consultarValor: true,
    ativo: true,
    sobreMedida: false,
    qtdLampadasPorReator: '',
    consumoWatts: '',
    tensaoVolts: '',
    tensaoBiVolts: '',
    temperaturaCor: '',
    angulo: '',
    vaoLivre: '',
    tempoInstalacaoMin: '',
    corteNicho: '',
    pesoLiquido: '',
    pesoBruto: '',
    lumen: '',
    garantiaMeses: '',
    dimensoesProduto: dimensoesVazias(),
    dimensoesEmbalagem: dimensoesVazias(),
    descricaoLivre: '',
    publicarNoSite: false,
    valorTabelaCentavos: 0,
    variantes: [],
    localizacoes: [],
    gruposRelacionados: [],
    codigoProduto: null,
    itensGrupo: [],
    produtosRelacionados: [],
    origemProduto: null,
    ncm: '',
    cest: '',
    impostoPadrao: null,
    impostosNfe: [],
  }
}
