import { type DataTableAction, VitraDataTable } from '@/components/vitra/data-table'
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

// Barra padrão das listagens (transcrição §9, padrão 4). Handlers reais
// chegam com as telas de cadastro (V4+).
const actions: DataTableAction<Produto>[] = [
  {
    id: 'filtro',
    label: 'Filtro',
    onClick: () => document.querySelector<HTMLInputElement>('input[aria-label="Busca"]')?.focus(),
  },
  { id: 'incluir', label: 'Incluir', onClick: () => console.info('[mock] Incluir produto') },
  {
    id: 'alterar',
    label: 'Alterar',
    needsSelection: true,
    onClick: (p) => console.info('[mock] Alterar', p),
  },
  {
    id: 'consultar',
    label: 'Consul.',
    needsSelection: true,
    onClick: (p) => console.info('[mock] Consultar', p),
  },
  {
    id: 'excluir',
    label: 'Excluir',
    needsSelection: true,
    variant: 'destructive',
    onClick: (p) => console.info('[mock] Excluir (desativação lógica)', p),
  },
  { id: 'imprimir', label: 'Imprimir', onClick: () => console.info('[mock] Imprimir listagem') },
]

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
