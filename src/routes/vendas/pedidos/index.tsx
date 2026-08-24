import type { OrderDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import { TelaDeListagem } from '@/components/cabinet/tela-de-listagem'
import { data } from '@/data'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { useCancelarPedidoDeVenda } from '@/data/pedidos-venda-api'
import { ROTULO_DA_SITUACAO } from '@/features/vendas/pedido-venda-form'
import type { CampoFiltravel } from '@/lib/filtro-de-consulta'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, CircleDot, HardHat, Hash, Tag, User } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/vendas/pedidos/')({
  component: PedidosDeVendaPage,
})

/**
 * A LISTAGEM DO PEDIDO DE VENDA — `GET /api/orders`.
 *
 * O menu apontava para cá com `futuro: true` ("Ainda não existe") desde que a
 * seção Comercial foi desenhada. O caminho está no contrato, o backend serve
 * seis das dez operações, e nenhum arquivo fora do codegen o consumia.
 *
 * As chaves são em INGLÊS porque viajam como `sortBy`, e a whitelist do
 * servidor é em inglês: traduzir a chave quebra a ordenação com 400 ao primeiro
 * clique no cabeçalho (padrão 1).
 */
const columns: ColumnDef<OrderDto>[] = [
  { accessorKey: 'number', header: 'Número' },
  // Fora da whitelist do contrato: a coluna aparece e não ordena, o que é
  // melhor que um cabeçalho clicável que responde 400.
  { accessorKey: 'series', header: 'Série', enableSorting: false },
  { accessorKey: 'customerName', header: 'Cliente' },
  {
    accessorKey: 'projectName',
    header: 'Descrição da Obra',
    cell: ({ getValue }) => getValue<string | null>() || '—',
  },
  {
    accessorKey: 'issuedAt',
    header: 'Data Emissão',
    cell: ({ getValue }) => formatDateBR(getValue<string | null>()),
  },
  {
    accessorKey: 'status',
    header: 'Situação',
    enableSorting: false,
    cell: ({ getValue }) => ROTULO_DA_SITUACAO[getValue<OrderDto['status']>()] ?? '—',
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    enableSorting: false,
    cell: ({ getValue }) => (getValue<string | null>() === 'demo' ? 'Demonstração' : 'Venda'),
  },
  {
    accessorKey: 'totalCents',
    header: 'Total',
    enableSorting: false,
    cell: ({ getValue }) => formatMoneyBRL(getValue<number>()),
  },
]

/**
 * Campos filtráveis — a whitelist do contrato, menos o que não estreita nada.
 *
 * `status` e `type` entram como SELEÇÃO e não como texto: os dois têm domínio
 * fechado, e campo livre faria o operador digitar "cancelado" para receber
 * lista vazia, porque o que viaja é `cancelled`.
 *
 * `workId` fica de fora: é uuid, e não há de onde o operador tirar um. Ele
 * existe na whitelist para quem chega pela obra, não para quem digita.
 *
 * `Série` e `Total` também ficam de fora — série é o mesmo valor em toda linha,
 * e o total trafega em centavos, unidade que o operador não digita.
 */
const camposFiltraveis: readonly CampoFiltravel[] = [
  { id: 'number', rotulo: 'Número', variante: 'text', icon: Hash, placeholder: 'Ex.: 21653' },
  {
    id: 'customerName',
    rotulo: 'Cliente',
    variante: 'text',
    icon: User,
    placeholder: 'Parte do nome…',
  },
  {
    id: 'projectName',
    rotulo: 'Descrição da Obra',
    variante: 'text',
    icon: HardHat,
    placeholder: 'Parte da descrição…',
  },
  { id: 'issuedAt', rotulo: 'Data Emissão', variante: 'date', icon: CalendarDays },
  {
    id: 'status',
    rotulo: 'Situação',
    variante: 'select',
    icon: CircleDot,
    opcoes: [
      { valor: 'active', rotulo: 'Em andamento' },
      { valor: 'concluded', rotulo: 'Concluído' },
      { valor: 'cancelled', rotulo: 'Cancelado' },
    ],
  },
  {
    id: 'type',
    rotulo: 'Tipo',
    variante: 'select',
    icon: Tag,
    opcoes: [
      { valor: 'sale', rotulo: 'Venda' },
      { valor: 'demo', rotulo: 'Demonstração' },
    ],
  },
]

function PedidosDeVendaPage() {
  const navigate = useNavigate()
  const [paraCancelar, setParaCancelar] = useState<OrderDto | null>(null)
  const cancelar = useCancelarPedidoDeVenda()
  const { readOnly } = useReadOnlyPorPapel('orders')

  function abrir(pedidoId: string, modo?: 'consulta') {
    void navigate({
      to: '/vendas/pedidos/$pedidoId',
      params: { pedidoId },
      search: modo ? { modo } : {},
    })
  }

  const actions = cadastroActions<OrderDto>({
    entidade: 'pedido de venda',
    readOnly,
    onIncluir: () => abrir('novo'),
    onAbrir: (p) => abrir(p.id),
    onConsultar: (p) => abrir(p.id, 'consulta'),
  })

  // Documento não se apaga, se cancela — e cancelar é caminho PRÓPRIO do
  // contrato (`POST /api/orders/{id}/cancel`), não um `PUT` com situação
  // trocada: quem decide a transição é o servidor.
  const actionsPedido = actions.map((a) =>
    a.id === 'excluir'
      ? {
          ...a,
          label: 'Cancelar',
          // Abre a confirmação; a escrita só sai de lá. Cancelamento é terminal
          // (o contrato responde 409 a repetir), e ação irreversível atrás de um
          // clique só é a que o operador dá sem querer.
          onClick: (p: OrderDto | null) => setParaCancelar(p),
        }
      : a,
  )

  return (
    <TelaDeListagem
      titulo="Pedido de Venda"
      columns={columns}
      queryKey={['pedidos-venda']}
      fetcher={data.pedidosVenda.list}
      actions={actionsPedido}
      filtros={camposFiltraveis}
      cancelamento={{
        documento: 'pedido de venda',
        registro: paraCancelar,
        numero: (p) => p.number,
        cancelado: (p) => p.status === 'cancelled',
        pendente: cancelar.isPending,
        erro: cancelar.error,
        onFechar: () => {
          setParaCancelar(null)
          cancelar.reset()
        },
        // O motivo é do vocabulário do servidor (`MOTIVO_CANCELAMENTO`), e é
        // OPCIONAL: o contrato aceita o cancelamento sem corpo nenhum, que é o
        // que a maioria dos 3.354 cancelamentos do legado é.
        comMotivo: true,
        onConfirmar: (motivo) => {
          if (!paraCancelar) return
          // Fecha no SUCESSO. Fechar antes esconderia a recusa do servidor
          // junto com o diálogo, e a listagem voltaria igual — indistinguível
          // de um cancelamento que deu certo.
          cancelar.mutate(
            { id: paraCancelar.id, motivo },
            { onSuccess: () => setParaCancelar(null) },
          )
        },
      }}
    />
  )
}
