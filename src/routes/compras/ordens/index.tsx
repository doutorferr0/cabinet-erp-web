import type { PurchaseOrderDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { SITUACAO_DA_ORDEM } from '@/data/compras-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarClock, CalendarDays, CircleDot, Coins, Hash } from 'lucide-react'

export const Route = createFileRoute('/compras/ordens/')({
  component: OrdensCompraPage,
})

/**
 * Colunas na whitelist do contrato: `number`, `orderedAt`, `sentAt`,
 * `expectedAt`, `status`, `totalCents`.
 *
 * `supplierName` aparece e NÃO ordena — é eco de outra tabela, e o contrato o
 * deixa fora da whitelist. Cabeçalho clicável que responde 400 é pior que
 * cabeçalho que não clica.
 *
 * A data mostrada é a VÁLIDA: reagendada quando houve reagendamento, com a
 * promessa original ao lado. Mostrar só `expectedAt` esconderia justamente o
 * atraso que a coluna existe para revelar.
 */
const columns: ColumnDef<PurchaseOrderDto>[] = [
  { accessorKey: 'number', header: 'Número' },
  {
    id: 'supplierName',
    header: 'Fornecedor',
    accessorFn: (row) => row.supplierName,
    enableSorting: false,
  },
  {
    accessorKey: 'orderedAt',
    header: 'Data Ordem',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    accessorKey: 'sentAt',
    header: 'Envio',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()) || '—',
  },
  {
    accessorKey: 'expectedAt',
    header: 'Previsão',
    cell: ({ row }) => {
      const original = row.original.expectedAt
      const reagendada = row.original.rescheduledAt
      if (reagendada) return `${formatDateBR(reagendada)} (era ${formatDateBR(original)})`
      return formatDateBR(original) || '—'
    },
  },
  {
    accessorKey: 'status',
    header: 'Situação',
    cell: ({ getValue }) => SITUACAO_DA_ORDEM[getValue<PurchaseOrderDto['status']>()] ?? '—',
  },
  {
    accessorKey: 'totalCents',
    header: 'Total',
    cell: ({ getValue }) => formatMoneyBRL(getValue<number>() ?? 0),
  },
]

const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'number', rotulo: 'Número', variante: 'text', icon: Hash, placeholder: 'Ex.: OC-0012' },
  { id: 'orderedAt', rotulo: 'Data Ordem', variante: 'date', icon: CalendarDays },
  { id: 'sentAt', rotulo: 'Envio', variante: 'date', icon: CalendarDays },
  { id: 'expectedAt', rotulo: 'Previsão', variante: 'date', icon: CalendarClock },
  { id: 'status', rotulo: 'Situação', variante: 'text', icon: CircleDot, placeholder: 'draft…' },
  { id: 'totalCents', rotulo: 'Total', variante: 'text', icon: Coins, placeholder: 'Em centavos' },
]

function OrdensCompraPage() {
  const navigate = useNavigate()
  const { readOnly } = useReadOnlyPorPapel('purchases')

  function abrir(ordemId: string, modo?: 'consulta') {
    void navigate({
      to: '/compras/ordens/$ordemId',
      params: { ordemId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<PurchaseOrderDto>({
    entidade: 'ordem de compra',
    readOnly,
    onIncluir: () => abrir('novo'),
    onAbrir: (o) => abrir(o.id),
    onConsultar: (o) => abrir(o.id, 'consulta'),
  })

  return (
    <TelaDeListagem
      titulo="Ordem de Compra"
      columns={columns}
      queryKey={['ordens-compra']}
      fetcher={data.ordensCompra.list}
      actions={actions}
      filtros={camposFiltraveis}
      origem={data.ordensCompra.origem}
    />
  )
}
