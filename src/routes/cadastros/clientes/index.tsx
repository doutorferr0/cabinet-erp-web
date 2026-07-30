import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { type Cliente, fetchClientes } from '@/mocks/clientes'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/clientes/')({
  component: ClientesPage,
})

const columns: ColumnDef<Cliente>[] = [
  { accessorKey: 'id', header: 'Código' },
  { accessorKey: 'nome', header: 'Nome' },
  {
    accessorKey: 'profissional',
    header: 'Profissional',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'categoria',
    header: 'Categoria',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'ativo',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
  },
]

function ClientesPage() {
  const navigate = useNavigate()

  function abrir(clienteId: string) {
    void navigate({ to: '/cadastros/clientes/$clienteId', params: { clienteId } })
  }

  const actions = cadastroActions<Cliente>({
    entidade: 'cliente',
    onIncluir: () => abrir('novo'),
    onAbrir: (c) => abrir(String(c.id)),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastro de Clientes</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['clientes']}
        fetcher={(state) => fetchClientes(state)}
        actions={actions}
      />
    </div>
  )
}
