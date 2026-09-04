import { TelaDeDocumento } from '@/components/cabinet/tela-de-documento'
import { data } from '@/data'
import { SITUACAO_DO_PEDIDO, fornecedoresComLinhaAberta } from '@/data/compras-api'
import { LateralDoPedidoDeCompra } from '@/features/pedido-compra/ficha-lateral'
import { PedidoCompraForm } from '@/features/pedido-compra/pedido-compra-form'
import { formatDateBR } from '@/lib/formatters'
import { isConsulta, validateModoSearch } from '@/lib/modo-consulta'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'

export const Route = createFileRoute('/compras/pedidos/$pedidoId')({
  component: PedidoCompraEditPage,
  validateSearch: validateModoSearch,
})

function PedidoCompraEditPage() {
  const { pedidoId } = Route.useParams()
  const readOnly = isConsulta(Route.useSearch())
  const isNovo = pedidoId === 'novo'
  const navigate = useNavigate()

  return (
    <TelaDeDocumento
      provider={data.pedidosCompra}
      queryKeyBase="pedido-compra"
      idParam={pedidoId}
      titulo="Pedido de Compra"
      modo={readOnly ? 'Consulta' : isNovo ? 'Incluir' : undefined}
      numero={(p) => p.numero}
      naoEncontrado="Pedido de compra não encontrado."
      erroAoCarregar="Não foi possível carregar o pedido de compra."
      cabecalho={(pedido) => {
        // A próxima ação é UMA. Com dois ou mais fornecedores em aberto o
        // pedido não tem uma próxima ordem — tem várias, e quem as oferece é a
        // ponte do rodapé do formulário, um botão por fornecedor.
        const fornecedores = fornecedoresComLinhaAberta(pedido)
        const unico = fornecedores.length === 1 ? fornecedores[0] : undefined

        return {
          badge: {
            tom:
              pedido.situacao === 'cancelled'
                ? 'void'
                : pedido.situacao === 'ordered'
                  ? 'done'
                  : 'open',
            label: SITUACAO_DO_PEDIDO[pedido.situacao],
          },
          meta: [pedido.cliente || 'compra para estoque', formatDateBR(pedido.dataEmissao)]
            .filter(Boolean)
            .join(' · '),
          ...(unico && pedido.id && pedido.situacao !== 'cancelled' && !readOnly
            ? {
                proximaAcao: {
                  id: 'gerar-ordem',
                  label: `Gerar ordem de compra · ${unico.nome}`,
                  icon: ShoppingCart,
                  onClick: () =>
                    void navigate({
                      to: '/compras/ordens/$ordemId',
                      params: { ordemId: 'novo' },
                      search: { dePedido: pedido.id, fornecedor: unico.id },
                    }),
                },
              }
            : {}),
        }
      }}
      // A origem na venda e o andamento saíram do meio do formulário: eram
      // campos de leitura indistinguíveis dos que se preenchem.
      lateral={(pedido) => <LateralDoPedidoDeCompra pedido={pedido} />}
    >
      {(pedido) => <PedidoCompraForm pedido={pedido} readOnly={readOnly} />}
    </TelaDeDocumento>
  )
}
