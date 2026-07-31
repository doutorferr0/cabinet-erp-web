import type { PartnerDto } from '@/api/gerado'
import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/clientes/')({
  component: ClientesPage,
})

/**
 * `Profissional` e `Categoria` saíram: não existem no `PartnerDto`. As duas são
 * do vínculo comercial que a §2 mostra e o contrato ainda não expõe — voltam
 * quando o DTO crescer.
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
  { accessorKey: 'legalName', header: 'Nome' },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
  },
]

function ClientesPage() {
  const navigate = useNavigate()

  function abrir(clienteId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/clientes/$clienteId',
      params: { clienteId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<PartnerDto>({
    entidade: 'cliente',
    onIncluir: () => abrir('novo'),
    // Sem `onAbrir`: a listagem é do servidor e o contrato não tem detalhe
    // por id. Abrir com o mock casaria uuid do servidor com id inventado.
    motivoSemAbrir:
      'O servidor ainda não publica o detalhe de um parceiro (GET /api/partners/{id}).',
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastro de Clientes</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['clientes']}
        fetcher={data.clientes.list}
        actions={actions}
      />
    </div>
  )
}
