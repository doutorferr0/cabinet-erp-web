import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { formatMoneyBRL } from '@/lib/formatters'
import { type Produto, fetchProdutos } from '@/mocks/produtos'
import { createFileRoute } from '@tanstack/react-router'
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

// Sem rota de detalhe ainda: o formulário de produto (§6, 5 abas) vem depois.
const actions = cadastroActions<Produto>({
  entidade: 'produto',
  onIncluir: () => console.info('[mock] Incluir produto'),
  onAbrir: (p) => console.info('[mock] Alterar produto', p),
  onConsultar: (p) => console.info('[mock] Consultar produto', p),
})

function ProdutosPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Produtos</h1>
      <VitraDataTable
        columns={columns}
        queryKey={['produtos']}
        fetcher={(state) => fetchProdutos(state)}
        actions={actions}
      />
    </div>
  )
}
