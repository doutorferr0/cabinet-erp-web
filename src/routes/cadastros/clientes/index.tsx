import { type DataTableAction, VitraDataTable } from '@/components/vitra/data-table'
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

  const actions: DataTableAction<Cliente>[] = [
    {
      id: 'filtro',
      label: 'Filtro',
      onClick: () => document.querySelector<HTMLInputElement>('input[aria-label="Busca"]')?.focus(),
    },
    {
      id: 'incluir',
      label: 'Incluir',
      onClick: () =>
        void navigate({ to: '/cadastros/clientes/$clienteId', params: { clienteId: 'novo' } }),
    },
    {
      id: 'alterar',
      label: 'Alterar',
      needsSelection: true,
      onClick: (c) =>
        c &&
        void navigate({
          to: '/cadastros/clientes/$clienteId',
          params: { clienteId: String(c.id) },
        }),
    },
    {
      id: 'consultar',
      label: 'Consul.',
      needsSelection: true,
      onClick: (c) =>
        c &&
        void navigate({
          to: '/cadastros/clientes/$clienteId',
          params: { clienteId: String(c.id) },
        }),
    },
    {
      id: 'excluir',
      label: 'Excluir',
      needsSelection: true,
      variant: 'destructive',
      onClick: (c) => console.info('[mock] Excluir (desativação lógica)', c),
    },
    { id: 'imprimir', label: 'Imprimir', onClick: () => console.info('[mock] Imprimir listagem') },
  ]

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
