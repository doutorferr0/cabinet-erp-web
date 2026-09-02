import type { PurchaseOrderDto } from '@/api/gerado'
import { cadastroActions } from '@/components/cabinet/cadastro-actions'
import type { OpcaoDeAgrupamento } from '@/components/cabinet/data-table'
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
    /**
     * A promessa ORIGINAL fica à vista, riscada, ao lado da que vale.
     *
     * O `(era 11/09)` corrido de antes dizia a mesma coisa e obrigava a ler a
     * frase inteira para saber qual das duas datas conta. Riscar a velha e
     * marcar a linha com `reagendada` deixa a leitura na varredura: a data em
     * pé é a que vale, a riscada é a que caiu, e o rótulo diz por quê.
     */
    cell: ({ row }) => {
      const original = row.original.expectedAt
      const reagendada = row.original.rescheduledAt
      if (!reagendada) return formatDateBR(original) || '—'
      return (
        <span className="inline-flex items-baseline gap-1.5">
          <span>{formatDateBR(reagendada)}</span>
          <s className="t-dado-meta">{formatDateBR(original)}</s>
          <span className="t-rotulo text-[var(--warn)]">reagendada</span>
        </span>
      )
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

/**
 * A previsão que VALE: a reagendada quando houve reagendamento, senão a
 * original. É a mesma escolha que a coluna Previsão já faz — se a decoração
 * lesse `expectedAt` cru, a ordem reagendada para daqui a um mês continuaria
 * pintada de atraso por causa de uma promessa que ninguém mantém mais.
 */
function previsaoQueVale(o: PurchaseOrderDto) {
  return o.rescheduledAt ?? o.expectedAt
}

/**
 * ATRASO é derivado, não é situação.
 *
 * O contrato publica três situações para a ordem — `draft`, `sent`,
 * `cancelled` — e nenhuma delas é "atrasada". Quem responde "esta passou do
 * prazo" é a data contra hoje, e só para a ordem ENVIADA: rascunho não
 * prometeu nada e cancelada saiu do jogo.
 *
 * A comparação é por DIA (o `T00:00` do fuso local), não por instante — a
 * ordem prevista para hoje não vira atrasada às 00h01.
 */
export function ordemAtrasada(o: PurchaseOrderDto, hoje = new Date()) {
  if (o.status !== 'sent') return false
  const previsao = previsaoQueVale(o)
  if (!previsao) return false
  const limite = new Date(`${previsao.slice(0, 10)}T00:00:00`)
  const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return limite.getTime() < dia.getTime()
}

/**
 * O que a linha ANUNCIA sozinha (D10).
 *
 * `warn` é a ordem cuja previsão VÁLIDA já passou e que ainda espera mercadoria
 * — a pergunta que fazia o operador varrer a coluna Previsão de cima a baixo.
 * `muted` é a cancelada: continua na lista porque o número foi emitido, mas
 * saiu do jogo e não deve competir por atenção com o que ainda vai chegar.
 *
 * O rascunho NÃO é decorado: ele está atrasado em relação a nada, e pintá-lo
 * gastaria a única marca da tela num documento que ninguém prometeu a ninguém.
 */
function decoracaoDaOrdem(o: PurchaseOrderDto) {
  if (o.status === 'cancelled') return 'muted' as const
  if (ordemAtrasada(o)) return 'warn' as const
  return undefined
}

/**
 * Os campos do chip `Agrupar`.
 *
 * Situação declara `tomDoValor` porque é ESTADO — é o que autoriza a faixa do
 * grupo a ganhar cor. Fornecedor não declara: nome próprio não é estado, e
 * tingi-lo pintaria a listagem de decoração sem significado (§Hierarquia).
 *
 * `sent` responde ao tom `open` e não a um "confirmado": o contrato publica
 * três situações (`draft`, `sent`, `cancelled`) e mais nenhuma. Ver a nota da
 * PR sobre as views que o mockup pede e o contrato não sustenta.
 */
const AGRUPAMENTOS: readonly OpcaoDeAgrupamento<PurchaseOrderDto>[] = [
  {
    id: 'status',
    rotulo: 'Situação',
    valorDaLinha: (o) => SITUACAO_DA_ORDEM[o.status] ?? '—',
    tomDoValor: (valor) =>
      valor === SITUACAO_DA_ORDEM.sent
        ? 'open'
        : valor === SITUACAO_DA_ORDEM.cancelled
          ? 'void'
          : 'neutral',
  },
  {
    id: 'supplierName',
    rotulo: 'Fornecedor',
    valorDaLinha: (o) => o.supplierName ?? '—',
  },
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
      decoracao={decoracaoDaOrdem}
      agrupamentos={AGRUPAMENTOS}
      subtotalDoGrupo={(o) => o.totalCents ?? 0}
    />
  )
}
