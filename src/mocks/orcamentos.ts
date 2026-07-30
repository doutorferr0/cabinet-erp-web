import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { mockDelay, normalize, pagedMock } from '@/mocks/query'

/**
 * Mock de orçamentos — campos LITERAIS da transcrição §8.1/§8.2.
 * Tela central do sistema; só a aba `Principal` foi capturada.
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */

/** Item da grade de 13 colunas — §8.2. O item fala na língua do FORNECEDOR. */
export interface OrcamentoItem {
  item: string
  codigoFornecedor: string
  descricaoFornecedor: string
  acabamento: string
  tamanho: string
  quantidade: string
  unidade: string
  valorUnitarioCentavos: number | null
  /** Int com 4 casas implícitas (10000 = 1%) — §8.2 mostra `0,0010 %`. */
  descontoPercentual: number | null
  grupoProduto: string
  tipoPeca: string
  fornecedor: string
  /** `Ambiente F5`: itens agrupados por ambiente da obra (§8.2). */
  ambiente: string
}

export type ModoDesconto = 'PRODUTO' | 'GERAL'

export interface Orcamento {
  id: number
  /** `Número` — sequencial global, NÃO cronológico (§8.1, observação). */
  numero: string
  serie: string
  numeroPasta: string
  dataEmissao: string | null
  dataValidade: string | null
  dataFechamento: string | null
  cliente: string
  /** Na prática o legado guarda o profissional aqui (§8.1, observação). */
  descricaoObra: string
  consultor: string | null
  profissionalExterno: string | null
  modoDesconto: ModoDesconto
  /** Desconto geral em % (4 casas implícitas) — §8.2. */
  descontoPercentual: number
  itens: OrcamentoItem[]
}

/** Linhas literais da listagem §8.1. */
const LINHAS = [
  { numero: '21653', cliente: 'ANDRÉ BATALHA', obra: 'MARIANA', emissao: '2025-08-05' },
  { numero: '21654', cliente: 'ROMULO GERMANO', obra: 'MARIANA', emissao: '2025-08-05' },
  { numero: '21655', cliente: 'SHEILA E VICENTE', obra: 'ARIADINE', emissao: '2025-08-05' },
  { numero: '21645', cliente: 'TELMA TOMPSON', obra: 'ANA ELIZA', emissao: '2025-08-04' },
  { numero: '21652', cliente: 'ROBERT TAGLIAELA', obra: 'MALU', emissao: '2025-08-04' },
  { numero: '21644', cliente: '3Z REALTY', obra: 'MALU', emissao: '2025-08-04' },
  { numero: '21650', cliente: 'ADRIANA FERREIRA', obra: 'ANA ELIZA', emissao: '2025-08-04' },
  { numero: '21651', cliente: 'ALEXANDER SCHULZ', obra: '', emissao: '2025-08-04' },
  {
    numero: '21647',
    cliente: 'BSA ADMINISTRADORA DE BENS E PARTICIPACOES',
    obra: 'GIORDANA',
    emissao: '2025-08-04',
  },
  { numero: '21646', cliente: 'CONSUMIDOR', obra: 'OBRA INDEFINIDA', emissao: '2025-08-04' },
  { numero: '21648', cliente: 'HELIO MURSSA JUNIOR', obra: 'FLAVIO COSSA', emissao: '2025-08-04' },
  {
    numero: '21649',
    cliente: 'LUIMARA PAULA MALVEZZI ROCHA',
    obra: 'OBRA INDEFINIDA',
    emissao: '2025-08-04',
  },
  { numero: '21641', cliente: 'ERICA BRAGION', obra: 'FLAVIO COSSA', emissao: '2025-08-02' },
  { numero: '21643', cliente: 'ANTONIO ANGELO CASADEI', obra: 'MALU', emissao: '2025-08-02' },
  { numero: '21642', cliente: 'NAHLA', obra: 'RICARDO', emissao: '2025-08-02' },
  {
    numero: '21639',
    cliente: 'PATRICIA E MARCELO ROSSI',
    obra: 'SILVANIA',
    emissao: '2025-08-01',
  },
  {
    numero: '21638',
    cliente: 'PATRICIA E MARCELO ROSSI',
    obra: 'SILVANIA',
    emissao: '2025-08-01',
  },
] as const

/** Validade = emissão + 5 dias na captura (§8.1). */
function validade(emissao: string): string {
  const d = new Date(`${emissao}T00:00:00`)
  d.setDate(d.getDate() + 5)
  return d.toISOString().slice(0, 10)
}

/** Ambientes da obra — o `Ambiente F5` agrupa os itens (§8.2). */
export const AMBIENTES = ['SALA', 'QUARTO', 'COZINHA', 'BANHEIRO', 'ÁREA EXTERNA'] as const

export const orcamentos: Orcamento[] = LINHAS.map((l, i) => ({
  id: i + 1,
  numero: l.numero,
  serie: '1',
  numeroPasta: '',
  dataEmissao: l.emissao,
  dataValidade: validade(l.emissao),
  dataFechamento: null,
  cliente: l.cliente,
  descricaoObra: l.obra,
  consultor: null,
  profissionalExterno: l.obra === 'OBRA INDEFINIDA' || l.obra === '' ? null : l.obra,
  modoDesconto: 'PRODUTO',
  descontoPercentual: 0,
  itens:
    i % 3 === 0
      ? []
      : [
          {
            item: '1',
            codigoFornecedor: `F${String(4000 + i * 7)}`,
            descricaoFornecedor: 'PENDENTE REDONDO ALUMÍNIO',
            acabamento: 'PRETO',
            tamanho: 'ÚNICO',
            quantidade: '2',
            unidade: 'UN',
            valorUnitarioCentavos: 45_900 + i * 1_100,
            descontoPercentual: 0,
            grupoProduto: 'PENDENTES',
            tipoPeca: 'REDONDA',
            fornecedor: 'STELLA',
            ambiente: 'SALA',
          },
        ],
}))

export function orcamentoVazio(id: number): Orcamento {
  return {
    id,
    numero: '',
    serie: '1',
    numeroPasta: '',
    dataEmissao: null,
    dataValidade: null,
    dataFechamento: null,
    cliente: '',
    descricaoObra: '',
    consultor: null,
    profissionalExterno: null,
    modoDesconto: 'PRODUTO',
    descontoPercentual: 0,
    itens: [],
  }
}

export function fetchOrcamentos(
  state: TableQueryState,
  delayMs = 300,
): Promise<PagedResult<Orcamento>> {
  return pagedMock(
    orcamentos,
    state,
    (o, q) =>
      o.numero.includes(q) ||
      normalize(o.cliente).includes(q) ||
      normalize(o.descricaoObra).includes(q),
    delayMs,
  )
}

export function fetchOrcamento(id: number, delayMs = 200): Promise<Orcamento | null> {
  return mockDelay(orcamentos.find((o) => o.id === id) ?? null, delayMs)
}
