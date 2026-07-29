import { type DataTableAction, VitraDataTable } from '@/components/vitra/data-table'
import { type Fornecedor, fetchFornecedores } from '@/mocks/fornecedores'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/fornecedores/')({
  component: FornecedoresPage,
})

const columns: ColumnDef<Fornecedor>[] = [
  { accessorKey: 'id', header: 'Código' },
  { accessorKey: 'nomeFantasia', header: 'Nome Fantasia' },
  { accessorKey: 'razaoSocial', header: 'Razão Social' },
  {
    accessorKey: 'empresaCompradora',
    header: 'Empresa Compradora',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'ativo',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
  },
]

function FornecedoresPage() {
  const navigate = useNavigate()

  const actions: DataTableAction<Fornecedor>[] = [
    {
      id: 'filtro',
      label: 'Filtro',
      onClick: () => document.querySelector<HTMLInputElement>('input[aria-label="Busca"]')?.focus(),
    },
    {
      id: 'incluir',
      label: 'Incluir',
      onClick: () =>
        void navigate({
          to: '/cadastros/fornecedores/$fornecedorId',
          params: { fornecedorId: 'novo' },
        }),
    },
    {
      id: 'alterar',
      label: 'Alterar',
      needsSelection: true,
      onClick: (f) =>
        f &&
        void navigate({
          to: '/cadastros/fornecedores/$fornecedorId',
          params: { fornecedorId: String(f.id) },
        }),
    },
    {
      id: 'consultar',
      label: 'Consul.',
      needsSelection: true,
      onClick: (f) =>
        f &&
        void navigate({
          to: '/cadastros/fornecedores/$fornecedorId',
          params: { fornecedorId: String(f.id) },
        }),
    },
    {
      id: 'excluir',
      label: 'Excluir',
      needsSelection: true,
      variant: 'destructive',
      onClick: (f) => console.info('[mock] Excluir (desativação lógica)', f),
    },
    { id: 'imprimir', label: 'Imprimir', onClick: () => console.info('[mock] Imprimir listagem') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastro de Fornecedores</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['fornecedores']}
        fetcher={(state) => fetchFornecedores(state)}
        actions={actions}
      />
    </div>
  )
}
