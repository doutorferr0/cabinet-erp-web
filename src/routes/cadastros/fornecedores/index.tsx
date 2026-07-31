import type { PartnerDto } from '@/api/gerado'
import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/fornecedores/')({
  component: FornecedoresPage,
})

/**
 * Colunas do que o `PartnerDto` traz, com os rótulos da §10.
 *
 * `Empresa Compradora` saiu: não existe no DTO, e coluna vazia em toda linha
 * lê-se como cadastro incompleto quando o incompleto é o contrato.
 *
 * `Ativo` é o `active` do VÍNCULO com a empresa ativa (não o `registrationActive`
 * do cadastro do grupo): a pergunta da tela é "esta empresa trabalha com este
 * fornecedor?". O `accessorKey` é o nome do campo no contrato porque ele viaja
 * como `sortBy` — a whitelist do servidor é em inglês.
 */
const columns: ColumnDef<PartnerDto>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'tradeName',
    header: 'Nome Fantasia',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  { accessorKey: 'legalName', header: 'Razão Social' },
  {
    accessorKey: 'active',
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

  const actions = cadastroActions<PartnerDto>({
    entidade: 'fornecedor',
    onIncluir: () => abrir('novo'),
    // Sem `onAbrir`: a listagem é do servidor e o contrato não tem detalhe
    // por id. Abrir com o mock casaria uuid do servidor com id inventado.
    motivoSemAbrir:
      'O servidor ainda não publica o detalhe de um parceiro (GET /api/partners/{id}).',
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
