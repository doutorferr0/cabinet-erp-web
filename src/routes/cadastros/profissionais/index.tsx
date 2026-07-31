import type { PartnerDto } from '@/api/gerado'
import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/profissionais/')({
  component: ProfissionaisPage,
})

/**
 * `Profissão` e `Registro Profissional` saíram: não existem no `PartnerDto`. A §3
 * registra as duas — voltam quando o contrato as expuser.
 *
 * `Ativo` é o `active` do vínculo com a empresa ativa; `accessorKey` é o nome do
 * campo no contrato porque viaja como `sortBy`.
 */
const columns: ColumnDef<PartnerDto>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'tradeName',
    header: 'Nome de Apresentação',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  { accessorKey: 'legalName', header: 'Nome' },
  {
    accessorKey: 'active',
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

  const actions = cadastroActions<PartnerDto>({
    entidade: 'profissional externo',
    onIncluir: () => abrir('novo'),
    // Sem `onAbrir`: a listagem é do servidor e o contrato não tem detalhe
    // por id. Abrir com o mock casaria uuid do servidor com id inventado.
    motivoSemAbrir:
      'O servidor ainda não publica o detalhe de um parceiro (GET /api/partners/{id}).',
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
