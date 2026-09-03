import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { LateralDoPedidoDeVenda } from '@/features/vendas/ficha-lateral'
import { ParticipacaoDoPedido } from '@/features/vendas/participacao-do-pedido'
import { PedidoDeVendaForm } from '@/features/vendas/pedido-venda-form'
import { SituacaoDoPedido } from '@/features/vendas/situacao-do-pedido'
import { formatDateBR } from '@/lib/formatters'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Truck } from 'lucide-react'

export const Route = createFileRoute('/vendas/pedidos/$pedidoId')({
  component: PedidoDeVendaEditPage,
  validateSearch: validateModoSearch,
})

function PedidoDeVendaEditPage() {
  const { pedidoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = pedidoId === 'novo'
  const navigate = useNavigate()

  return (
    <TelaDeDocumento
      provider={data.pedidosVenda}
      queryKeyBase="pedido-venda"
      idParam={pedidoId}
      titulo="Pedido de Venda"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(p) => p.numero}
      naoEncontrado="Pedido de venda não encontrado."
      erroAoCarregar="Não foi possível carregar o pedido de venda."
      cabecalho={(pedido) => ({
        badge:
          pedido.situacao === 'cancelled'
            ? { tom: 'void', label: 'Cancelado' }
            : pedido.situacao === 'concluded'
              ? { tom: 'done', label: 'Concluído' }
              : { tom: 'open', label: 'Em aberto' },
        meta: [
          pedido.cliente,
          pedido.obra || pedido.descricaoObra,
          formatDateBR(pedido.dataEmissao),
        ]
          .filter(Boolean)
          .join(' · '),
        /**
         * `Confirmar carga` LEVA ao galpão em vez de fechar o romaneio daqui, e
         * é a mesma decisão que `SituacaoDoPedido` já tomou neste documento:
         * fechar romaneio pede escolher qual romaneio e quem recebeu, o que é
         * uma segunda tela dentro da primeira. A primária abre o quadro de
         * cargas com ESTE pedido escolhido — o gesto acontece onde o contexto
         * dele existe, sem o operador precisar reencontrar a linha lá.
         */
        ...(pedido.id && pedido.situacao === 'active' && !readOnly
          ? {
              proximaAcao: {
                id: 'confirmar-carga',
                label: 'Confirmar carga',
                icon: Truck,
                onClick: () =>
                  void navigate({ to: '/vendas/cargas', search: { pedido: pedido.id } }),
              },
            }
          : {}),
      })}
      // Cliente, cargas e financeiro: o que se consulta enquanto se mexe nos
      // itens, e que não se edita nesta tela.
      lateral={(pedido) => <LateralDoPedidoDeVenda pedido={pedido} />}
    >
      {(pedido) => (
        <>
          <PedidoDeVendaForm pedido={pedido} readOnly={readOnly} />
          {/* A participação monta FORA do `<form>` do documento: ela tem
              gravação própria no contrato e não entra no `PUT` do pedido — o
              mesmo arranjo que o orçamento usa para o painel de atividades.
              Em `Incluir` não há id a que pendurar participação. */}
          {isNovo ? null : <ParticipacaoDoPedido pedidoId={pedidoId} />}
          {/* A situação da entrega monta pelo mesmo motivo e com a mesma
              regra: é leitura de `GET /api/orders/{id}/fulfillment`, tem
              caminho próprio e não entra no `PUT` do pedido. Em `Incluir` não
              há id, e não há peça separada de documento que ainda não existe. */}
          {isNovo ? null : <SituacaoDoPedido pedidoId={pedidoId} />}
        </>
      )}
    </TelaDeDocumento>
  )
}
