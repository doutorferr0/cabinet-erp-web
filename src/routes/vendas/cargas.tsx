import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `Quadro de cargas` deixou de ser TELA e virou uma visão da listagem de
 * pedidos de venda (issue D12, Reface 2.0).
 *
 * Era um quadro sobre a fila de separação agrupada por pedido; passa a ser a
 * listagem de pedidos desenhada em kanban pela situação do documento. O ganho é
 * o mesmo das outras duas: um filtro só, uma consulta só, um desenho só de
 * quadro no ERP inteiro.
 *
 * **`?pedido=<uuid>` continua valendo, e leva mais longe do que levava.** Quem
 * chega do documento de venda pelo `Abrir no Quadro de Cargas` JÁ escolheu o
 * pedido; mandá-lo procurar o mesmo cartão numa coluna seria perder a escolha
 * no caminho. Com o id na mão, o destino é a ficha do próprio pedido.
 *
 * **O que se perde, e está registrado na PR:** o agrupamento por linha liberada
 * (`GET /api/picking-queue`) e o painel de romaneio ao lado. O quadro de cargas
 * respondia "o que carrego hoje" contando PEÇAS; o kanban de pedidos conta
 * documentos. Recuperar a contagem de peças é KPI da listagem (D11), não uma
 * tela paralela.
 */
const DESTINO = '/vendas/pedidos?modo=kanban&campo=status'

export const Route = createFileRoute('/vendas/cargas')({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.pedido === 'string' && search.pedido !== '' ? { pedido: search.pedido } : {},
  beforeLoad: ({ search }) => {
    if ('pedido' in search && search.pedido) {
      throw redirect({
        to: '/vendas/pedidos/$pedidoId',
        params: { pedidoId: search.pedido },
        replace: true,
      })
    }
    throw redirect({ href: DESTINO, replace: true })
  },
})
