import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import type { Colaborador } from '@/mocks/colaboradores'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/colaboradores/')({
  component: ColaboradoresPage,
})

const columns: ColumnDef<Colaborador>[] = [
  { accessorKey: 'id', header: 'Código' },
  { accessorKey: 'nome', header: 'Nome' },
  {
    accessorKey: 'setor',
    header: 'Setor',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'cargo',
    header: 'Cargo',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'ativo',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
  },
]

function ColaboradoresPage() {
  const navigate = useNavigate()

  function abrir(colaboradorId: string) {
    void navigate({ to: '/cadastros/colaboradores/$colaboradorId', params: { colaboradorId } })
  }

  const actions = cadastroActions<Colaborador>({
    entidade: 'colaborador',
    onIncluir: () => abrir('novo'),
    onAbrir: (c) => abrir(String(c.id)),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastro de Colaboradores</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['colaboradores']}
        fetcher={data.colaboradores.list}
        actions={actions}
      />
    </div>
  )
}
