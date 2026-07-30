import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { formatDateBR } from '@/lib/formatters'
import type { PedidoCompra } from '@/mocks/pedidos-compra'
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
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Pedido de Compra</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['pedidos-compra']}
        fetcher={data.pedidosCompra.list}
        actions={actions}
      />
    </div>
  )
}
