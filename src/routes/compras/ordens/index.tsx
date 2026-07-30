import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { formatDateBR } from '@/lib/formatters'
import type { OrdemCompra } from '@/mocks/ordens-compra'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/compras/ordens/')({
  component: OrdensCompraPage,
})

/** Colunas LITERAIS da transcrição §7.1. */
const columns: ColumnDef<OrdemCompra>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'fornecedor', header: 'Fornecedor' },
  {
    accessorKey: 'dataOrdem',
    header: 'Data Ordem',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    accessorKey: 'dataEnvio',
    header: 'Data Envio',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
]

function OrdensCompraPage() {
  const navigate = useNavigate()

  function abrir(ordemId: string, modo?: 'consulta') {
    void navigate({
      to: '/compras/ordens/$ordemId',
      params: { ordemId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<OrdemCompra>({
    entidade: 'ordem de compra',
    onIncluir: () => abrir('novo'),
    onAbrir: (o) => abrir(String(o.id)),
    onConsultar: (o) => abrir(String(o.id), 'consulta'),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Ordem de Compra</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['ordens-compra']}
        fetcher={data.ordensCompra.list}
        actions={actions}
      />
    </div>
  )
}
