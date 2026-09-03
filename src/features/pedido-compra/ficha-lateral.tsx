import { Andamento, type EventoDeAndamento } from '@/components/cabinet/andamento'
import { CartaoLateral } from '@/components/cabinet/cartao-lateral'
import { Button } from '@/components/ui/button'
import { type PedidoDeCompra, SITUACAO_DO_PEDIDO } from '@/data/compras-api'
import { formatDateBR } from '@/lib/formatters'
import { useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'

/**
 * A LATERAL do pedido de compra (D19, #487) — de onde a necessidade veio e em
 * que pé ela está.
 *
 * O pedido de compra é o documento mais fino da casa: número, data, situação e
 * as linhas. Quase tudo que orbitava ele na tela antiga era CAMPO de leitura no
 * meio do formulário — `Pedido de venda`, `Cliente` — sem nada que os
 * distinguisse dos campos que se preenchem. Na lateral eles voltam a ser o que
 * são: contexto de onde a compra nasceu.
 *
 * `lilac` para a origem (quem pediu) e `mint` para o andamento é o mesmo
 * vocabulário da ordem de compra (D18) — o operador que sabe ler uma sabe ler a
 * outra.
 */
export function andamentoDoPedidoDeCompra(pedido: PedidoDeCompra): EventoDeAndamento[] {
  const nova = !pedido.id
  const eventos: EventoDeAndamento[] = [
    {
      id: 'aberto',
      titulo: 'Pedido aberto',
      data: pedido.dataEmissao,
      estado: nova ? 'atual' : 'feito',
    },
  ]

  if (pedido.situacao === 'cancelled') {
    eventos.push({ id: 'cancelado', titulo: 'Pedido cancelado', estado: 'atual' })
    return eventos
  }

  // As três etapas do ciclo são as três situações do contrato, e é por isso que
  // não há timeline inventada aqui: `open` → `partially_ordered` → `ordered` é
  // o que o servidor guarda, e `PurchaseRequestDto` não tem data para nenhuma
  // delas além da emissão. Etapa sem data continua sendo posição — que é o que
  // a peça existe para mostrar.
  const emOrdem = pedido.situacao === 'partially_ordered' || pedido.situacao === 'ordered'
  const tudoEmOrdem = pedido.situacao === 'ordered'

  eventos.push({
    id: 'parcial',
    titulo: 'Linhas levadas para ordem de compra',
    estado: tudoEmOrdem ? 'feito' : emOrdem ? 'atual' : 'futuro',
  })
  eventos.push({
    id: 'atendido',
    titulo: 'Todas as linhas atendidas',
    estado: tudoEmOrdem ? 'atual' : 'futuro',
  })

  return eventos
}

export function LateralDoPedidoDeCompra({ pedido }: { pedido: PedidoDeCompra }) {
  const navigate = useNavigate()

  return (
    // Irmãos separados por `gap` (`--s-4`), nunca por linha: entre cartões de
    // assunto a fronteira já é o tint de cada um.
    <aside aria-label="Apoio do pedido de compra" className="flex flex-col gap-4">
      <CartaoLateral
        titulo="Origem"
        tint="lilac"
        pares={[
          { rotulo: 'Pedido de venda', valor: pedido.pedidoVendaNumero || '— compra para estoque' },
          { rotulo: 'Cliente', valor: pedido.cliente || '— estoque' },
          {
            rotulo: 'Emissão',
            valor: <span className="t-dado">{formatDateBR(pedido.dataEmissao) || '—'}</span>,
          },
        ]}
      >
        {/* A VOLTA para o pedido de venda: o documento sabe de onde nasceu, e
            mandar o operador procurar na listagem jogaria esse dado fora. */}
        {pedido.pedidoVendaId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              void navigate({
                to: '/vendas/pedidos/$pedidoId',
                params: { pedidoId: pedido.pedidoVendaId as string },
                search: {},
              })
            }
          >
            <FileText className="size-4" /> Abrir {pedido.pedidoVendaNumero}
          </Button>
        ) : null}
      </CartaoLateral>

      <CartaoLateral titulo={`Andamento · ${SITUACAO_DO_PEDIDO[pedido.situacao]}`} tint="mint">
        <Andamento eventos={andamentoDoPedidoDeCompra(pedido)} />
      </CartaoLateral>
    </aside>
  )
}
