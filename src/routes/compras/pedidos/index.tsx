import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { formatDateBR } from '@/lib/formatters'
import { type PedidoCompra, fetchPedidosCompra } from '@/mocks/pedidos-compra'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/compras/pedidos/')({
  component: PedidosCompraPage,
})

/** Colunas LITERAIS da transcrição §7.3. */
const columns: ColumnDef<PedidoCompra>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  {
    accessorKey: 'pedVenda',
    header: 'Pedido de Venda',
    cell: ({ getValue }) => getValue<string>() || '—',
  },
  { accessorKey: 'serie', header: 'Série', cell: ({ getValue }) => getValue<string>() || '—' },
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

function PedidosCompraPage() {
  const navigate = useNavigate()

  function abrir(pedidoId: string) {
    void navigate({ to: '/compras/pedidos/$pedidoId', params: { pedidoId } })
  }

  const actions = cadastroActions<PedidoCompra>({
    entidade: 'pedido de compra',
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(String(p.id)),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Pedido de Compra</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['pedidos-compra']}
        fetcher={(state) => fetchPedidosCompra(state)}
        actions={actions}
      />
    </div>
  )
}
