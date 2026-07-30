import type { PagedResult, TableQueryState } from '@/lib/table-query'
import { mockDelay, normalize, pagedMock } from '@/mocks/query'

/**
 * Mock de pedidos de compra — campos LITERAIS da transcrição §7.3/§7.4.
 * TODO(contract): tipo real virá do codegen do OpenAPI na integração.
 */

/** Item da grade `Produtos` — §7.4. Note a coluna `Destino`, ausente na ordem. */
export interface PedidoCompraItem {
  codigoFornecedor: string
  descricaoFornecedor: string
  acabamento: string
  quantidade: string
  destino: string
  tamanho: string
  unidade: string
  valorUnitarioCentavos: number | null
}

export interface PedidoCompra {
  id: number
  codigo: string
  /** `Pedido de Venda` — vazio = compra para estoque (§7.3, observação). */
  pedVenda: string
  serie: string
  data: string | null
  /** Um pedido tem N fornecedores, concatenados por ` - ` na listagem (§7.3). */
  fornecedores: string[]
  codigoProduto: string | null
  itens: PedidoCompraItem[]
  observacao: string
}

/** Linhas literais da listagem §7.3. */
const LINHAS = [
  {
    codigo: '7763',
    pedVenda: '',
    serie: '',
    data: '2025-08-05',
    forn: ['EVOLED (ATIVA COMERCIAL)'],
  },
  {
    codigo: '7762',
    pedVenda: '21646',
    serie: '1',
    data: '2025-08-05',
    forn: ['VIA HF ILUMINAÇÃO'],
  },
  { codigo: '7761', pedVenda: '21649', serie: '1', data: '2025-08-05', forn: ['DRAMALUX'] },
  { codigo: '7760', pedVenda: '21607', serie: '1', data: '2025-08-05', forn: ['STELLA'] },
  {
    codigo: '7759',
    pedVenda: '',
    serie: '',
    data: '2025-08-05',
    forn: ['EVOLED (ATIVA COMERCIAL)', 'FILLAMENTO'],
  },
  { codigo: '7758', pedVenda: '21643', serie: '1', data: '2025-08-04', forn: ['INTERLIGHT'] },
  {
    codigo: '7757',
    pedVenda: '21548',
    serie: '1',
    data: '2025-08-04',
    forn: ['INTERLIGHT', 'MISTER LED'],
  },
  { codigo: '7756', pedVenda: '21628', serie: '1', data: '2025-08-02', forn: ['NEWSTANDARD'] },
  { codigo: '7755', pedVenda: '21619', serie: '1', data: '2025-08-01', forn: ['DSGNSELO'] },
  {
    codigo: '7754',
    pedVenda: '21634',
    serie: '1',
    data: '2025-08-01',
    forn: ['STUDIOLUCE ILUMINACAO IMPORTACAO E EXPORTACAO'],
  },
  {
    codigo: '7753',
    pedVenda: '21614',
    serie: '1',
    data: '2025-07-31',
    forn: ['DRAMALUX', 'EVOLED (ATIVA COMERCIAL)', 'ILUMINAR', 'MISTER LED'],
  },
  {
    codigo: '7752',
    pedVenda: '21594',
    serie: '1',
    data: '2025-07-31',
    forn: ['ALLOY ILUMINAÇÃO', 'INTERLIGHT'],
  },
  {
    codigo: '7751',
    pedVenda: '21581',
    serie: '1',
    data: '2025-07-30',
    forn: ['DSGNSELO', 'MISTER LED'],
  },
] as const

/** `Destino` do item: estoque × obra/cliente (§7.4, observação). */
export const DESTINOS = ['ESTOQUE', 'OBRA/CLIENTE'] as const

/** Fornecedores que aparecem nos documentos (§7.1 e §7.3), sem repetição. */
export const FORNECEDORES_DOC = [...new Set(LINHAS.flatMap((l) => l.forn as readonly string[]))]
  .concat('ILUMINAR', 'FILLAMENTO', 'USINA DESIGN', 'TELAS TENSIONADAS')
  .filter((f, i, arr) => arr.indexOf(f) === i)
  .sort((a, b) => a.localeCompare(b, 'pt-BR'))

export const pedidosCompra: PedidoCompra[] = LINHAS.map((l, i) => ({
  id: i + 1,
  codigo: l.codigo,
  pedVenda: l.pedVenda,
  serie: l.serie,
  data: l.data,
  fornecedores: [...l.forn],
  codigoProduto: 'Fornecedor',
  itens:
    i % 4 === 0
      ? []
      : [
          {
            codigoFornecedor: `F${String(4000 + i * 7)}`,
            descricaoFornecedor: 'PENDENTE REDONDO ALUMÍNIO',
            acabamento: 'PRETO',
            quantidade: String(1 + (i % 3)),
            destino: l.pedVenda === '' ? 'ESTOQUE' : 'OBRA/CLIENTE',
            tamanho: 'ÚNICO',
            unidade: 'UN',
            valorUnitarioCentavos: 12_500 + i * 990,
          },
        ],
  observacao: '',
}))

export function pedidoCompraVazio(id: number): PedidoCompra {
  return {
    id,
    codigo: '',
    pedVenda: '',
    serie: '',
    data: null,
    fornecedores: [],
    codigoProduto: null,
    itens: [],
    observacao: '',
  }
}

export function fetchPedidosCompra(
  state: TableQueryState,
  delayMs = 300,
): Promise<PagedResult<PedidoCompra>> {
  return pagedMock(
    pedidosCompra,
    state,
    (p, q) =>
      p.codigo.includes(q) ||
      p.pedVenda.includes(q) ||
      normalize(p.fornecedores.join(' - ')).includes(q),
    delayMs,
  )
}

export function fetchPedidoCompra(id: number, delayMs = 200): Promise<PedidoCompra | null> {
  return mockDelay(pedidosCompra.find((p) => p.id === id) ?? null, delayMs)
}
