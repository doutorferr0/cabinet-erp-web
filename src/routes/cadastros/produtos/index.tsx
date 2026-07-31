import type { ProductDto } from '@/api/gerado'
import { cadastroActions } from '@/components/vitra/cadastro-actions'
import { VitraDataTable } from '@/components/vitra/data-table'
import { data } from '@/data'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/cadastros/produtos/')({
  component: ProdutosPage,
})

/**
 * Colunas do que o `ProductDto` traz, com os rótulos LITERAIS da §6.
 *
 * A §6 registra mais quatro colunas — `Marca`, `Fábrica`, `Tipo de Produto` e
 * `Valor de Tabela`. Elas NÃO estão no DTO da listagem, e coluna que fica vazia em
 * toda linha é pior que coluna ausente: parece cadastro incompleto, não contrato
 * incompleto. Voltam quando o DTO crescer (`docs/integracao.md`).
 *
 * O `accessorKey` é o nome do campo NO CONTRATO porque ele viaja como `sortBy`, e
 * a whitelist do servidor é `code`/`description`/`active`.
 */
const columns: ColumnDef<ProductDto>[] = [
  { accessorKey: 'code', header: 'Nosso Código' },
  { accessorKey: 'description', header: 'Nossa Descrição' },
  {
    accessorKey: 'active',
    header: 'Ativo',
    cell: ({ getValue }) => (getValue<boolean>() ? 'Sim' : 'Não'),
  },
]

function ProdutosPage() {
  const navigate = useNavigate()

  function abrir(produtoId: string, modo?: 'consulta') {
    void navigate({
      to: '/cadastros/produtos/$produtoId',
      params: { produtoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<ProductDto>({
    entidade: 'produto',
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(p.id),
    onConsultar: (p) => abrir(p.id, 'consulta'),
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
