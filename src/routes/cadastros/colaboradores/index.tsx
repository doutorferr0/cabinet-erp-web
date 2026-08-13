import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { Nome } from '@/components/cabinet/nome'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import type { Colaborador } from '@/mocks/colaboradores'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/colaboradores/')({
  component: ColaboradoresPage,
})

const columns: ColumnDef<Colaborador>[] = [
  { accessorKey: 'id', header: 'Código' },
  {
    accessorKey: 'nome',
    header: 'Nome',
    cell: ({ getValue }) => <Nome>{getValue<string>()}</Nome>,
  },
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
    cell: ({ getValue }) => <CelulaAtivo ativo={getValue<boolean>()} />,
  },
]

function ColaboradoresPage() {
  const navigate = useNavigate()

  function abrir(colaboradorId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/colaboradores/$colaboradorId',
      params: { colaboradorId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<Colaborador>({
    entidade: 'colaborador',
    onIncluir: () => abrir('novo'),
    onAbrir: (c) => abrir(String(c.id)),
    onConsultar: (c) => abrir(String(c.id), 'consulta'),
  })

  return (
    <TelaDeListagem
      titulo="Cadastro de Colaboradores"
      columns={columns}
      queryKey={['colaboradores']}
      fetcher={data.colaboradores.list}
      actions={actions}
    />
  )
}
