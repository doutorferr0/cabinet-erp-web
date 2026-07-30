import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { formatMoneyBRL } from '@/lib/formatters'
import type { Produto } from '@/mocks/produtos'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/produtos/')({
  component: ProdutosPage,
})

// Colunas LITERAIS da transcrição §6 (Cadastro de Produtos).
const columns: ColumnDef<Produto>[] = [
  { accessorKey: 'nossoCodigo', header: 'Nosso Código' },
  { accessorKey: 'nossaDescricao', header: 'Nossa Descrição' },
  { accessorKey: 'marca', header: 'Marca' },
  { accessorKey: 'fabrica', header: 'Fábrica' },
  { accessorKey: 'tipoProduto', header: 'Tipo de Produto' },
  {
    accessorKey: 'valorTabelaCentavos',
    header: 'Valor de Tabela',
    cell: ({ getValue }) => formatMoneyBRL(getValue<number>()),
  },
  {
    accessorKey: 'ativo',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
  },
]

function ProdutosPage() {
  const navigate = useNavigate()

  function abrir(produtoId: string) {
    void navigate({ to: '/cadastros/produtos/$produtoId', params: { produtoId } })
  }

  const actions = cadastroActions<Produto>({
    entidade: 'produto',
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(String(p.id)),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cadastro de produtos - Banco Principal</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['produtos']}
        fetcher={data.produtos.list}
        actions={actions}
      />
    </div>
  )
}
