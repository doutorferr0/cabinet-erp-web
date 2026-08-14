import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR } from '@/lib/formatters'
import type { OrdemCompra } from '@/mocks/ordens-compra'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarClock, CalendarDays, Hash, Truck } from 'lucide-react'

export const Route = createFileRoute('/compras/ordens/')({
  component: OrdensCompraPage,
})

/** Colunas LITERAIS da transcrição §7.1. */
const columns: ColumnDef<OrdemCompra>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'fornecedor', header: 'Fornecedor' },
  {
    accessorKey: 'dataOrdem',
    header: 'Data Ordem',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    accessorKey: 'dataEnvio',
    header: 'Data Envio',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
]

/**
 * Campos filtráveis da §7.1. Três datas, e é o que a tela de ordem pede: "o que
 * saiu esta semana", "o que estava previsto e não chegou".
 *
 * `dataPrevista` filtra sem ser coluna — a listagem mostra Ordem e Envio, mas a
 * pergunta pela PREVISÃO é a que o comprador faz. Mesma assimetria do `document`
 * nos cadastros de parceiro, e ela só corre para este lado.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'codigo', rotulo: 'Código', variante: 'text', icon: Hash, placeholder: 'Ex.: 5102' },
  {
    id: 'fornecedor',
    rotulo: 'Fornecedor',
    variante: 'text',
    icon: Truck,
    placeholder: 'Parte do nome…',
  },
  { id: 'dataOrdem', rotulo: 'Data Ordem', variante: 'date', icon: CalendarDays },
  { id: 'dataEnvio', rotulo: 'Data Envio', variante: 'date', icon: CalendarDays },
  { id: 'dataPrevista', rotulo: 'Data Prevista', variante: 'date', icon: CalendarClock },
]

function OrdensCompraPage() {
  const navigate = useNavigate()

  function abrir(ordemId: string, modo?: 'consulta') {
    void navigate({
      to: '/compras/ordens/$ordemId',
      params: { ordemId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<OrdemCompra>({
    entidade: 'ordem de compra',
    onIncluir: () => abrir('novo'),
    onAbrir: (o) => abrir(String(o.id)),
    onConsultar: (o) => abrir(String(o.id), 'consulta'),
  })

  return (
    <TelaDeListagem
      titulo="Ordem de Compra"
      columns={columns}
      queryKey={['ordens-compra']}
      fetcher={data.ordensCompra.list}
      actions={actions}
      filtros={camposFiltraveis}
    />
  )
}
