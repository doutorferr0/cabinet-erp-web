import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import type { Fornecedor } from '@/mocks/fornecedores'
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

  function abrir(fornecedorId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/fornecedores/$fornecedorId',
      params: { fornecedorId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<Fornecedor>({
    entidade: 'fornecedor',
    onIncluir: () => abrir('novo'),
    onAbrir: (f) => abrir(String(f.id)),
    onConsultar: (f) => abrir(String(f.id), 'consulta'),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastro de Fornecedores</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['fornecedores']}
        fetcher={data.fornecedores.list}
        actions={actions}
      />
    </div>
  )
}
