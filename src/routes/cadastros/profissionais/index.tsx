import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import type { Profissional } from '@/mocks/profissionais'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/profissionais/')({
  component: ProfissionaisPage,
})

const columns: ColumnDef<Profissional>[] = [
  { accessorKey: 'id', header: 'Código' },
  { accessorKey: 'nomeApresentacao', header: 'Nome de Apresentação' },
  {
    accessorKey: 'profissao',
    header: 'Profissão',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'registroProfissional',
    header: 'Registro Profissional',
    cell: ({ getValue }) => getValue<string>() || '—',
  },
  {
    accessorKey: 'ativo',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
  },
]

function ProfissionaisPage() {
  const navigate = useNavigate()

  function abrir(profissionalId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/profissionais/$profissionalId',
      params: { profissionalId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<Profissional>({
    entidade: 'profissional externo',
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(String(p.id)),
    onConsultar: (p) => abrir(String(p.id), 'consulta'),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastro de Profissional Externo</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['profissionais']}
        fetcher={data.profissionais.list}
        actions={actions}
      />
    </div>
  )
}
