import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { mockDelay, normalize, pagedMock } from '@/mocks/query'

/**
 * Mock de produtos — campos LITERAIS da transcrição do SoftLux (§6, 5 abas).
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
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
  id: number
  // --- Aba 1: Dados Principais (§6.1) ---
  nossoCodigo: string
  codigoEspecial: string
  codigoReduzido: string
  nossaDescricao: string
  fornecedores: ProdutoFornecedor[]
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

/** Lista determinística (sem faker/seed aleatória) — estável para testes e prints. */
export const produtos: Produto[] = Array.from({ length: 45 }, (_, i) => {
  const desc = DESCRICOES[i % DESCRICOES.length] as string
  const acab = ACABAMENTOS[i % ACABAMENTOS.length] as string
  const fabrica = FABRICAS[i % FABRICAS.length] as string
  const valor = 8_990 + ((i * 1_337) % 42_000)
  return {
    id: i + 1,
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
    tipoPeca: ['REDONDA', 'QUADRADA', 'LINEAR', 'DIRECIONÁVEL'][i % 4] ?? null,
    tipoLinha: ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'DECORATIVA'][i % 4] ?? null,
    unidadeEntradaUnidade: 'UN',
    unidadeEntradaQuantidade: '1',
    unidadeSaidaUnidade: 'UN',
    unidadeSaidaQuantidade: '1',
    classificacao: ['PADRÃO', 'PREMIUM', 'ECONÔMICO'][i % 3] ?? null,
    empresaCompradora: EMPRESAS_COMPRADORAS[i % 2] ?? null,
    designerModelo: ['LINHA PRÓPRIA', 'STUDIO', 'ASSINADO'][i % 3] ?? null,
    fabrica,
    marca: MARCAS[i % MARCAS.length] as string,
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
    origemProduto: ORIGENS_PRODUTO[0] ?? null,
    ncm: '94051200',
    cest: '',
    impostoPadrao: null,
    impostosNfe: [],
  }
})

export function produtoVazio(id: number): Produto {
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
    origemProduto: null,
    ncm: '',
    cest: '',
    impostoPadrao: null,
    impostosNfe: [],
  }
}

export function fetchProdutos(
  state: TableQueryState,
  delayMs = 300,
): Promise<PagedResult<Produto>> {
  return pagedMock(
    produtos,
    state,
    (p, q) => normalize(p.nossoCodigo).includes(q) || normalize(p.nossaDescricao).includes(q),
    delayMs,
  )
}

export function fetchProduto(id: number, delayMs = 200): Promise<Produto | null> {
  return mockDelay(produtos.find((p) => p.id === id) ?? null, delayMs)
}
