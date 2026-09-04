import type { PurchaseRequestDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import type { OpcaoDeAgrupamento } from '@/components/cabinet/data-table'
import type { StampTom } from '@/components/cabinet/stamp'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'

import { useReadOnlyPorPapel } from '@/data/papeis'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR } from '@/lib/formatters'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, CircleDot, Hash, List } from 'lucide-react'

export const Route = createFileRoute('/compras/pedidos/')({
  component: PedidosCompraPage,
})

/**
 * As colunas são as do CONTRATO, e a mudança de nome não é cosmética.
 *
 * `codigo`/`pedVenda`/`serie`/`fornecedores` eram os nomes do relatório do
 * legado, e nenhum deles existe em `PurchaseRequestDto`. O `accessorKey` É o
 * `sortBy` que viaja: coluna com nome inventado responde 400 ao primeiro clique
 * no cabeçalho, e a whitelist do servidor tem `number`, `issuedAt`, `status` e
 * `itemCount` — nada mais.
 *
 * **A coluna de FORNECEDORES saiu**, e é o que o contrato manda: o fornecedor
 * mora na LINHA, o pedido tem N, e `orderNumber` está fora da whitelist de
 * ordenação de propósito ("ele é ECOADO do pedido de venda, e ordenar por
 * coluna de outra tabela num recurso paginado é o que transforma listagem em
 * junção obrigatória"). Quem procura pelo fornecedor filtra por `supplierId`.
 */
const columns: ColumnDef<PurchaseRequestDto>[] = [
  { accessorKey: 'number', header: 'Número', meta: { tipo: 'id' } },
  {
    accessorKey: 'issuedAt',
    header: 'Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
    meta: { tipo: 'data' },
  },
  {
    id: 'status',
    header: 'Situação',
    accessorFn: (row) => ({
      tom: TOM_DA_SITUACAO[row.status],
      label: CARIMBO_DA_SITUACAO[row.status] ?? '—',
    }),
    meta: { tipo: 'status' },
  },
  { accessorKey: 'itemCount', header: 'Itens', meta: { numeric: true } },
  {
    id: 'orderNumber',
    header: 'Pedido de Venda',
    // Vazio significa compra para ESTOQUE (§7.3, observação) — a frase é o dado.
    accessorFn: (row) => row.orderNumber ?? '— estoque',
    enableSorting: false,
    meta: { tipo: 'id' },
  },
  {
    id: 'customerName',
    header: 'Cliente',
    accessorFn: (row) => row.customerName ?? '—',
    enableSorting: false,
    meta: { tipo: 'entidade' },
  },
]

/** O peso de cada situação — as quatro que o contrato publica. */
const TOM_DA_SITUACAO: Record<PurchaseRequestDto['status'], StampTom> = {
  open: 'open',
  partially_ordered: 'open',
  ordered: 'done',
  cancelled: 'void',
}

/**
 * A palavra dentro do carimbo — uma só. `Parcialmente em ordem` são três, e o
 * carimbo quebrava em três linhas na grade.
 */
const CARIMBO_DA_SITUACAO: Record<PurchaseRequestDto['status'], string> = {
  open: 'Aberto',
  partially_ordered: 'Parcial',
  ordered: 'Em ordem',
  cancelled: 'Cancelado',
}

const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'number', rotulo: 'Número', variante: 'text', icon: Hash, placeholder: 'Ex.: PC-0007' },
  { id: 'issuedAt', rotulo: 'Emissão', variante: 'date', icon: CalendarDays },
  { id: 'status', rotulo: 'Situação', variante: 'text', icon: CircleDot, placeholder: 'open…' },
  { id: 'itemCount', rotulo: 'Itens', variante: 'text', icon: List, placeholder: 'Ex.: 3' },
]

/**
 * O pedido CANCELADO continua na lista — o número foi emitido e some da
 * conferência se sumir da tela —, mas rebaixado: quem saiu do jogo não compete
 * por atenção com o que ainda espera ordem. Nenhum outro estado é decorado:
 * `open` é o caso comum desta tela e pintá-lo apagaria a marca.
 */
function decoracaoDoPedido(p: PurchaseRequestDto) {
  return p.status === 'cancelled' ? ('muted' as const) : undefined
}

/**
 * `Situação` tinge a faixa (é estado) e `Pedido de Venda` não (é número de
 * outro documento). O agrupamento por pedido de venda responde à pergunta que
 * a tela existe para responder — o que já pedi para ESTA venda —, e o
 * `— estoque` das linhas sem vínculo vira um grupo legítimo em vez de um vazio.
 */
const AGRUPAMENTOS: readonly OpcaoDeAgrupamento<PurchaseRequestDto>[] = [
  {
    id: 'status',
    rotulo: 'Situação',
    valorDaLinha: (p) => CARIMBO_DA_SITUACAO[p.status] ?? '—',
    tomDoValor: (valor) =>
      valor === CARIMBO_DA_SITUACAO.ordered
        ? 'done'
        : valor === CARIMBO_DA_SITUACAO.cancelled
          ? 'void'
          : 'open',
  },
  {
    id: 'orderNumber',
    rotulo: 'Pedido de Venda',
    valorDaLinha: (p) => p.orderNumber ?? '— estoque',
  },
]

function PedidosCompraPage() {
  const navigate = useNavigate()
  const { readOnly } = useReadOnlyPorPapel('purchases')

  function abrir(pedidoId: string, modo?: 'consulta') {
    void navigate({
      to: '/compras/pedidos/$pedidoId',
      params: { pedidoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<PurchaseRequestDto>({
    entidade: 'pedido de compra',
    readOnly,
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(p.id),
    onConsultar: (p) => abrir(p.id, 'consulta'),
  })

  return (
    <TelaDeListagem
      titulo="Pedido de Compra"
      columns={columns}
      queryKey={['pedidos-compra']}
      fetcher={data.pedidosCompra.list}
      decoracao={decoracaoDoPedido}
      agrupamentos={AGRUPAMENTOS}
      actions={actions}
      filtros={camposFiltraveis}
      origem={data.pedidosCompra.origem}
    />
  )
}
