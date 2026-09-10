import { Andamento, type EventoDeAndamento } from '@/components/cabinet/andamento'
import { CartaoLateral } from '@/components/cabinet/cartao-lateral'
import { ROTULO_DO_ROMANEIO, useRomaneios } from '@/data/entrega-api'
import type { PedidoDeVenda } from '@/data/pedidos-venda-api'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'

/**
 * A LATERAL do pedido de venda (D19, #487) — cliente, cargas, financeiro.
 *
 * Os três assuntos que o operador consulta enquanto mexe no pedido e que não se
 * editam ali: para quem é (`lilac`), onde a mercadoria está (`sky`, o tint de
 * logística) e como se paga (`sand`).
 *
 * ## As cargas são LEITURA, e resumo — o painel continua embaixo
 *
 * `SituacaoDoPedido` já mostra item a item o que foi liberado, separado e
 * entregue, e continua onde estava: é uma tabela, e tabela não cabe numa coluna
 * de 320px sem virar tabela ilegível. O que a lateral acrescenta é a CONTA —
 * quantos romaneios, em que situação —, que é a pergunta de relance. Quem
 * precisa do detalhe rola até o painel; quem só quer saber se já saiu, não
 * precisa rolar.
 *
 * ## Por que o andamento do pedido de venda não é uma timeline de situação
 *
 * `OrderDto.status` é `active | concluded | cancelled` e o documento guarda
 * `dataEmissao` e `dataFechamento` — três posições, e nenhuma delas fala de
 * entrega. A entrega tem estado próprio (o romaneio), e é ele que a timeline
 * mostra quando existe: um pedido com romaneio fechado está mais adiante do que
 * o `status` sozinho diria.
 */
export function andamentoDoPedidoDeVenda(
  pedido: PedidoDeVenda,
  romaneios: readonly { status: string }[],
): EventoDeAndamento[] {
  const novo = !pedido.id
  const eventos: EventoDeAndamento[] = [
    {
      id: 'emitido',
      titulo: 'Pedido emitido',
      data: pedido.dataEmissao,
      estado: novo ? 'atual' : 'feito',
    },
  ]

  if (pedido.situacao === 'cancelled') {
    eventos.push({ id: 'cancelado', titulo: 'Venda cancelada', estado: 'atual' })
    return eventos
  }

  const abertos = romaneios.filter((r) => r.status === 'open').length
  const fechados = romaneios.filter((r) => r.status === 'closed').length
  const concluido = pedido.situacao === 'concluded'

  eventos.push({
    id: 'carga',
    titulo: abertos > 0 ? 'Carga em montagem' : 'Carga a montar',
    estado: fechados > 0 ? 'feito' : abertos > 0 ? 'atual' : 'futuro',
  })
  eventos.push({
    id: 'entregue',
    titulo: fechados > 0 ? 'Carga entregue' : 'Entrega',
    estado: concluido ? 'feito' : fechados > 0 ? 'atual' : 'futuro',
  })

  if (concluido) {
    eventos.push({
      id: 'concluido',
      titulo: 'Venda fechada',
      data: pedido.dataFechamento,
      estado: 'atual',
    })
  }

  return eventos
}

export function LateralDoPedidoDeVenda({ pedido }: { pedido: PedidoDeVenda }) {
  // Só do pedido que EXISTE: `/api/deliveries?orderId=` de um documento em
  // inclusão devolveria os romaneios de todo mundo.
  const { data: pagina } = useRomaneios(pedido.id || undefined)
  const romaneios = pedido.id ? (pagina?.rows ?? []) : []

  const totalParcelas = pedido.parcelas.reduce((soma, p) => soma + (p.amountCents ?? 0), 0)

  return (
    <aside aria-label="Apoio do pedido de venda" className="flex flex-col gap-4">
      <CartaoLateral
        titulo="Cliente"
        tint="lilac"
        pares={[
          { rotulo: 'Cliente', valor: pedido.cliente || '—' },
          { rotulo: 'Obra', valor: pedido.obra || pedido.descricaoObra || '—' },
          { rotulo: 'Consultor', valor: pedido.consultor || '—' },
          { rotulo: 'Indicado por', valor: pedido.profissionalExterno || '—' },
        ]}
      />

      <CartaoLateral
        titulo="Cargas"
        tint="sky"
        pares={
          romaneios.length === 0
            ? [{ rotulo: 'Romaneios', valor: 'nenhum aberto' }]
            : romaneios.map((romaneio) => ({
                rotulo: `Romaneio ${romaneio.number}`,
                valor: ROTULO_DO_ROMANEIO[romaneio.status],
              }))
        }
      >
        <Andamento eventos={andamentoDoPedidoDeVenda(pedido, romaneios)} />
      </CartaoLateral>

      <CartaoLateral
        titulo="Financeiro"
        tint="sand"
        pares={[
          { rotulo: 'Condição', valor: pedido.condicaoPagamento || '—' },
          {
            rotulo: 'Parcelas',
            valor: <span className="t-dado">{pedido.parcelas.length || '—'}</span>,
          },
          ...(totalParcelas > 0
            ? [
                {
                  rotulo: 'Total parcelado',
                  valor: <span className="t-dado">{formatMoneyBRL(totalParcelas)}</span>,
                },
              ]
            : []),
          ...(pedido.dataFechamento
            ? [
                {
                  rotulo: 'Fechado em',
                  valor: <span className="t-dado">{formatDateBR(pedido.dataFechamento)}</span>,
                },
              ]
            : []),
        ]}
      />
    </aside>
  )
}
