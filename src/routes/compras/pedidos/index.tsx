import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR } from '@/lib/formatters'
import type { PedidoCompra } from '@/mocks/pedidos-compra'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Hash, ShoppingCart, Truck } from 'lucide-react'

export const Route = createFileRoute('/compras/pedidos/')({
  component: PedidosCompraPage,
})

/** Colunas LITERAIS da transcrição §7.3. */
const columns: ColumnDef<PedidoCompra>[] = [
  { accessorKey: 'codigo', header: 'Código', meta: { codigo: true } },
  {
    accessorKey: 'pedVenda',
    meta: { codigo: true },
    header: 'Pedido de Venda',
    cell: ({ getValue }) => getValue<string>() || '—',
  },
  {
    accessorKey: 'serie',
    header: 'Série',
    meta: { codigo: true },
    cell: ({ getValue }) => getValue<string>() || '—',
  },
  {
    accessorKey: 'data',
    header: 'Data',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    id: 'fornecedores',
    header: 'Fornecedores',
    // N fornecedores por pedido, concatenados por " - " (§7.3, observação).
    accessorFn: (row) => row.fornecedores.join(' - '),
  },
]

/**
 * Campos filtráveis da §7.3.
 *
 * **`fornecedores` é MULTIVALORADO** — um pedido tem N fornecedores, e a coluna
 * os concatena. O filtro casa quando ALGUM deles casa, e negar quer dizer
 * "nenhum": "não contém Stella" exclui o pedido que tem Stella e mais alguém.
 * A alternativa seria comparar contra a lista concatenada, que é o que o
 * `String(array)` faria por acidente — com vírgula, que nem é o separador que a
 * tela mostra.
 *
 * `Pedido de Venda` vazio significa compra para ESTOQUE (§7.3, observação), e é
 * por isso que "está vazio" nele é uma consulta de verdade: "o que comprei sem
 * venda casada".
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'codigo', rotulo: 'Código', variante: 'text', icon: Hash, placeholder: 'Ex.: 4210' },
  {
    id: 'pedVenda',
    rotulo: 'Pedido de Venda',
    variante: 'text',
    icon: ShoppingCart,
    placeholder: 'Vazio = compra para estoque',
  },
  { id: 'data', rotulo: 'Data', variante: 'date', icon: CalendarDays },
  {
    id: 'fornecedores',
    rotulo: 'Fornecedores',
    variante: 'text',
    icon: Truck,
    placeholder: 'Parte do nome…',
  },
]

function PedidosCompraPage() {
  const navigate = useNavigate()

  function abrir(pedidoId: string, modo?: 'consulta') {
    void navigate({
      to: '/compras/pedidos/$pedidoId',
      params: { pedidoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<PedidoCompra>({
    entidade: 'pedido de compra',
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(String(p.id)),
    onConsultar: (p) => abrir(String(p.id), 'consulta'),
  })

  return (
    <TelaDeListagem
      titulo="Pedido de Compra"
      columns={columns}
      queryKey={['pedidos-compra']}
      fetcher={data.pedidosCompra.list}
      actions={actions}
      filtros={camposFiltraveis}
    />
  )
}
