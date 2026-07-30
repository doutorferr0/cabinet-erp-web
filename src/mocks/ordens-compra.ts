/**
 * Mock de ordens de compra — campos LITERAIS da transcrição §7.1/§7.2.
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */

/** Item da grade `Produtos` — §7.2. */
export interface OrdemCompraItem {
  codigoProduto: string
  descricaoProduto: string
  acabamento: string
  tamanho: string
  quantidade: string
  unidade: string
  valorUnitarioCentavos: number | null
  pedCompra: string
  data: string | null
}

/** Bloco `Transportadora` — §7.2 (rótulos, preenchidos pela busca). */
export interface Transportadora {
  nome: string
  municipio: string
  uf: string
}

export interface OrdemCompra {
  id: number
  /** `Código` — na captura a faixa é 51xx. */
  codigo: string
  dataOrdem: string | null
  dataEnvio: string | null
  dataPrevista: string | null
  reagendamento: string | null
  codigoProduto: string | null
  filtroSobreVendaNumero: string
  empresaCompradora: string | null
  fornecedor: string
  faturamentoMinimoCentavos: number
  itens: OrdemCompraItem[]
  descontoCentavos: number
  acrescimoCentavos: number
  transportadora: Transportadora
  observacao: string
}

/** Fornecedores literais da listagem §7.1. */
const FORNECEDORES = [
  'EVOLED (ATIVA COMERCIAL)',
  'ILUMINAR',
  'FILLAMENTO',
  'INTERLIGHT',
  'STELLA',
  'TELAS TENSIONADAS',
  'DSGNSELO',
  'USINA DESIGN',
  'MISTER LED',
] as const

/** Datas literais da captura §7.1 (ordem = data da linha). */
const LINHAS = [
  { codigo: '5149', fornecedor: 0, ordem: '2025-08-05', envio: null },
  { codigo: '5148', fornecedor: 1, ordem: '2025-08-05', envio: '2025-08-05' },
  { codigo: '5147', fornecedor: 2, ordem: '2025-08-05', envio: '2025-08-05' },
  { codigo: '5146', fornecedor: 3, ordem: '2025-08-04', envio: '2025-08-04' },
  { codigo: '5145', fornecedor: 4, ordem: '2025-08-02', envio: '2025-08-04' },
  { codigo: '5144', fornecedor: 5, ordem: '2025-08-01', envio: '2025-08-01' },
  { codigo: '5143', fornecedor: 6, ordem: '2025-08-01', envio: '2025-08-04' },
  { codigo: '5142', fornecedor: 7, ordem: '2025-07-31', envio: '2025-07-31' },
  { codigo: '5141', fornecedor: 8, ordem: '2025-07-31', envio: '2025-07-31' },
  { codigo: '5140', fornecedor: 8, ordem: '2025-07-30', envio: '2025-07-31' },
  { codigo: '5139', fornecedor: 6, ordem: '2025-07-29', envio: '2025-07-29' },
  { codigo: '5138', fornecedor: 4, ordem: '2025-07-29', envio: '2025-07-29' },
] as const

function transportadoraVazia(): Transportadora {
  return { nome: '', municipio: '', uf: '' }
}

export const ordensCompra: OrdemCompra[] = LINHAS.map((l, i) => ({
  id: i + 1,
  codigo: l.codigo,
  dataOrdem: l.ordem,
  dataEnvio: l.envio,
  dataPrevista: null,
  reagendamento: null,
  codigoProduto: 'Fornecedor',
  filtroSobreVendaNumero: '0',
  empresaCompradora: 'VERTZ ILUMINAÇÃO',
  fornecedor: FORNECEDORES[l.fornecedor] as string,
  faturamentoMinimoCentavos: 0,
  itens:
    i % 3 === 0
      ? []
      : [
          {
            codigoProduto: String(1201 + i),
            descricaoProduto: 'PENDENTE REDONDO ALUMÍNIO PRETO',
            acabamento: 'PRETO',
            tamanho: 'ÚNICO',
            quantidade: String(2 + (i % 4)),
            unidade: 'UN',
            valorUnitarioCentavos: 8_990 + i * 1_337,
            pedCompra: String(7751 + i),
            data: l.ordem,
          },
        ],
  descontoCentavos: 0,
  acrescimoCentavos: 0,
  transportadora: transportadoraVazia(),
  observacao: '',
}))

export function ordemCompraVazia(id: number): OrdemCompra {
  return {
    id,
    codigo: '',
    dataOrdem: null,
    dataEnvio: null,
    dataPrevista: null,
    reagendamento: null,
    codigoProduto: null,
    filtroSobreVendaNumero: '0',
    empresaCompradora: null,
    fornecedor: '',
    faturamentoMinimoCentavos: 0,
    itens: [],
    descontoCentavos: 0,
    acrescimoCentavos: 0,
    transportadora: transportadoraVazia(),
    observacao: '',
  }
}
