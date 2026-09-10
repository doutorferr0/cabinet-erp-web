import { useQuery } from '@tanstack/react-query'
import type { DeliveryDto, OrderFulfillmentDto, PagedResultOfDeliveryDto } from '@/api/gerado'
import { getOrderFulfillment, listDeliveries } from '@/api/gerado'
import { dadosOuErro, PAGE_SIZE_MAX, type RespostaDaApi } from '@/data/api-provider'

/**
 * FRONTEIRA DO BLOCO FÍSICO DA VENDA — a escada liberar → separar → entregar.
 *
 * As dez operações do G4 (`web#342`) num lugar só. Elas não viram entrada do
 * registry (`src/data/index.ts`) e a razão é a regra da casa: entrada de
 * registry é para tela de CADASTRO com DataTable — `list`/`get`/`empty` sobre um
 * agregado que se edita. Aqui não há nada disso: a fila de separação é uma
 * consulta derivada que ninguém edita, e o romaneio só muda por caminho próprio
 * (`/items`, `/close`, `/cancel`), nunca por `PUT`. É a mesma decisão que
 * manteve as oportunidades do CRM fora do registry.
 *
 * ## As três quantidades convivem, e o estado é DERIVAÇÃO
 *
 * A linha de 10 peças com 10 liberadas, 6 separadas e 2 entregues é o caso
 * NORMAL de uma cozinha que sai em três viagens. Por isso nada aqui guarda
 * "situação do item": quem responde é o servidor, a cada leitura, e a tela
 * pinta o que veio.
 *
 * ## Toda mutação invalida as TRÊS raízes
 *
 * Separar um item muda a fila (some da lista), muda a situação do pedido (a
 * barra anda) e pode mudar o romaneio (o `pendingDelivery` cresce). Invalidar
 * só a consulta que a tela estava mostrando deixaria as outras duas na tela
 * dizendo o contrário — e as três aparecem JUNTAS no quadro de cargas, lado a
 * lado, então a divergência seria visível na mesma tela.
 */

/** As duas leituras que as telas de pedido consomem. */
const CHAVES_DA_ENTREGA = {
  romaneios: ['romaneios'] as const,
  situacao: ['situacao-do-pedido'] as const,
  situacaoDe: (orderId: string) => ['situacao-do-pedido', orderId] as const,
  romaneiosDe: (orderId: string) => ['romaneios', orderId] as const,
}

/** Os romaneios — todos, ou os de um pedido só. */
export function useRomaneios(orderId?: string) {
  return useQuery({
    queryKey: orderId ? CHAVES_DA_ENTREGA.romaneiosDe(orderId) : CHAVES_DA_ENTREGA.romaneios,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listDeliveries({
        pageSize: PAGE_SIZE_MAX,
        ...(orderId ? { orderId } : {}),
      })
      return dadosOuErro<PagedResultOfDeliveryDto>(resposta, 'Falha ao carregar os romaneios.')
    },
  })
}

/**
 * A SITUAÇÃO do pedido, item a item — a tela que a loja abre quando o cliente
 * liga perguntando onde está a cozinha.
 *
 * `enabled` porque ela só é buscada quando alguém escolhe um pedido no quadro:
 * buscar a situação dos três pedidos da fila de uma vez seria três consultas
 * para mostrar uma.
 */
export function useSituacaoDoPedido(orderId: string | null) {
  return useQuery({
    queryKey: CHAVES_DA_ENTREGA.situacaoDe(orderId ?? ''),
    enabled: Boolean(orderId),
    queryFn: async () => {
      const resposta: RespostaDaApi = await getOrderFulfillment(orderId ?? '')
      return dadosOuErro<OrderFulfillmentDto>(resposta, 'Falha ao carregar a situação do pedido.')
    },
  })
}

/** Rótulo de cada degrau da escada física, na língua da tela. */
export const ROTULO_DO_ESTADO_FISICO: Record<string, string> = {
  pending: 'A liberar',
  released: 'Liberado',
  picked: 'Separado',
  delivered: 'Entregue',
}

/** Rótulo da situação do romaneio. */
export const ROTULO_DO_ROMANEIO: Record<DeliveryDto['status'], string> = {
  open: 'Aberto',
  closed: 'Fechado',
  cancelled: 'Cancelado',
}
