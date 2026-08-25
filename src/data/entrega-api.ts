import type {
  AddDeliveryItemRequest,
  CloseDeliveryRequest,
  CreateDeliveryRequest,
  DeliveryDetailDto,
  DeliveryDto,
  FulfillmentFactDto,
  OrderFulfillmentDto,
  PagedResultOfDeliveryDto,
  PagedResultOfPickingQueueItemDto,
} from '@/api/gerado'
import {
  addDeliveryItem,
  cancelDelivery,
  closeDelivery,
  createDelivery,
  getOrderFulfillment,
  listDeliveries,
  listPickingQueue,
  pickOrderItem,
  releaseOrderItem,
} from '@/api/gerado'
import { PAGE_SIZE_MAX, type RespostaDaApi, dadosOuErro } from '@/data/api-provider'
import { avisar } from '@/lib/avisos'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

export const URL_FILA_DE_SEPARACAO = '/api/picking-queue'
export const URL_ROMANEIOS = '/api/deliveries'

/** As três raízes de cache. Ver o cabeçalho: mutação invalida todas. */
export const CHAVES_DA_ENTREGA = {
  fila: ['fila-de-separacao'] as const,
  romaneios: ['romaneios'] as const,
  situacao: ['situacao-do-pedido'] as const,
  situacaoDe: (orderId: string) => ['situacao-do-pedido', orderId] as const,
  romaneiosDe: (orderId: string) => ['romaneios', orderId] as const,
}

/**
 * Whitelist de `sortBy` da fila — a MESMA da descrição do contrato.
 *
 * `description` fica de fora: ordenar a fila do galpão por nome de peça
 * embaralha as linhas do mesmo pedido, que é o agrupamento que quem separa usa
 * para não fazer duas viagens.
 */
export const ORDENAVEIS_DA_FILA: readonly string[] = [
  'scheduledDeliveryAt',
  'orderNumber',
  'customerName',
  'pendingPick',
]

/** A do romaneio. `customerName`/`carrierName` são eco de outra tabela. */
export const ORDENAVEIS_DO_ROMANEIO: readonly string[] = [
  'number',
  'scheduledFor',
  'deliveredAt',
  'status',
]

/**
 * A FILA inteira, e não uma página.
 *
 * O quadro AGRUPA por pedido, e agrupar sobre uma página monta grupo falso: o
 * pedido com 12 linhas apareceria com 10 se a página cortasse no meio, e o
 * operador leria "faltam 10" onde faltam 12. Por isso o teto do contrato, e por
 * isso o rodapé DIZ quando o teto cortou — é a mesma regra do padrão 9 (visão
 * que não é tabela pede o conjunto inteiro).
 */
export function useFilaDeSeparacao(orderId?: string) {
  return useQuery({
    queryKey: orderId ? [...CHAVES_DA_ENTREGA.fila, orderId] : CHAVES_DA_ENTREGA.fila,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listPickingQueue({
        pageSize: PAGE_SIZE_MAX,
        ...(orderId ? { orderId } : {}),
      })
      return dadosOuErro<PagedResultOfPickingQueueItemDto>(
        resposta,
        'Falha ao carregar a fila de separação.',
      )
    },
  })
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

/** As três raízes de uma vez — ver o cabeçalho. */
function useInvalidarEntrega() {
  const cliente = useQueryClient()
  return () => {
    void cliente.invalidateQueries({ queryKey: CHAVES_DA_ENTREGA.fila, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_DA_ENTREGA.romaneios, exact: false })
    void cliente.invalidateQueries({ queryKey: CHAVES_DA_ENTREGA.situacao, exact: false })
  }
}

export interface AtoNaLinha {
  orderId: string
  lineNumber: number
  quantity: number
  locationId?: string | null
  notes?: string | null
}

/**
 * LIBERAR — autoriza a peça a sair e RESERVA o saldo no depósito.
 *
 * É a única da escada que exige a permissão `venda:liberar-entrega`, e o front
 * **não a esconde**: `SessaoAtual` publica id, empresa e nome — não publica as
 * permissões do vínculo. Esconder o botão exigiria adivinhar, e adivinhar para
 * baixo tira a ação de quem a tem. O 403 `papel-insuficiente` chega em voz
 * alta, com o que fazer a respeito.
 *
 * Liberar NÃO baixa estoque: a peça continua no galpão, só deixa de estar
 * disponível para a próxima venda.
 */
export function useLiberarItem() {
  const invalidar = useInvalidarEntrega()
  return useMutation({
    mutationFn: async ({ orderId, lineNumber, quantity, locationId, notes }: AtoNaLinha) => {
      const resposta: RespostaDaApi = await releaseOrderItem(orderId, lineNumber, {
        quantity,
        locationId: locationId ?? null,
        notes: notes ?? null,
      })
      return dadosOuErro<FulfillmentFactDto>(resposta, 'Falha ao liberar o item.')
    },
    onSuccess: (fato) => {
      invalidar()
      avisar(
        `Item ${fato.item.lineNumber} liberado: ${fato.quantity}.`,
        fato.item.pendingRelease > 0
          ? `Ainda falta liberar ${fato.item.pendingRelease}.`
          : 'A linha está liberada por inteiro e entrou na fila de separação.',
      )
    },
  })
}

/**
 * SEPARAR — a peça sai da prateleira e o estoque BAIXA, na mesma transação.
 *
 * A reserva morre junto com a baixa: separar e continuar reservado contaria a
 * mesma peça duas vezes para a próxima venda. Acima do liberado é 409
 * `separacao-sem-liberacao`, e o gate é CHECK no banco — quem pula a liberação
 * não separa, seja qual for o papel.
 */
export function useSepararItem() {
  const invalidar = useInvalidarEntrega()
  return useMutation({
    mutationFn: async ({ orderId, lineNumber, quantity, locationId, notes }: AtoNaLinha) => {
      const resposta: RespostaDaApi = await pickOrderItem(orderId, lineNumber, {
        quantity,
        locationId: locationId ?? null,
        notes: notes ?? null,
      })
      return dadosOuErro<FulfillmentFactDto>(resposta, 'Falha ao separar o item.')
    },
    onSuccess: (fato) => {
      invalidar()
      avisar(
        `Item ${fato.item.lineNumber} separado: ${fato.quantity}.`,
        fato.item.pendingPick > 0
          ? `Ainda há ${fato.item.pendingPick} liberado esperando separação.`
          : 'A linha saiu inteira da prateleira.',
      )
    },
  })
}

/** Abre o romaneio da viagem. Nasce `open` e VAZIO — os itens entram um a um. */
export function useAbrirRomaneio() {
  const invalidar = useInvalidarEntrega()
  return useMutation({
    mutationFn: async (corpo: CreateDeliveryRequest) => {
      const resposta: RespostaDaApi = await createDelivery(corpo)
      return dadosOuErro<DeliveryDetailDto>(resposta, 'Falha ao abrir o romaneio.')
    },
    onSuccess: (romaneio) => {
      invalidar()
      avisar(`Romaneio ${romaneio.number} aberto.`, 'Lance nele o que vai sair nesta viagem.')
    },
  })
}

/**
 * Lança um item ENTREGUE dentro do romaneio. NÃO mexe em estoque — a peça já
 * saiu do galpão na separação.
 */
export function useLancarNoRomaneio() {
  const invalidar = useInvalidarEntrega()
  return useMutation({
    mutationFn: async ({
      deliveryId,
      ...corpo
    }: AddDeliveryItemRequest & { deliveryId: string }) => {
      const resposta: RespostaDaApi = await addDeliveryItem(deliveryId, corpo)
      return dadosOuErro<FulfillmentFactDto>(resposta, 'Falha ao lançar o item no romaneio.')
    },
    onSuccess: (fato) => {
      invalidar()
      avisar(
        `Item ${fato.item.lineNumber} lançado no romaneio: ${fato.quantity}.`,
        `${fato.item.percentDelivered}% da linha já foi entregue.`,
      )
    },
  })
}

/**
 * FECHA o romaneio, exigindo quando saiu e quem recebeu.
 *
 * Seis meses depois, quando o cliente diz que não recebeu, é essa linha que
 * responde — por isso os dois campos são obrigatórios no contrato, e a exigência
 * é CHECK no banco, não regra de handler.
 */
export function useFecharRomaneio() {
  const invalidar = useInvalidarEntrega()
  return useMutation({
    mutationFn: async ({ deliveryId, ...corpo }: CloseDeliveryRequest & { deliveryId: string }) => {
      const resposta: RespostaDaApi = await closeDelivery(deliveryId, corpo)
      return dadosOuErro<DeliveryDetailDto>(resposta, 'Falha ao fechar o romaneio.')
    },
    onSuccess: (romaneio) => {
      invalidar()
      avisar(
        `Romaneio ${romaneio.number} fechado.`,
        romaneio.receivedBy ? `Recebido por ${romaneio.receivedBy}.` : undefined,
      )
    },
  })
}

/**
 * Cancela o romaneio. **NÃO desfaz os fatos já lançados nele** — o log de
 * entregas é append-only por GRANT, e corrigir o passado é estornar, não editar.
 * O ato de estorno é a fase seguinte e ainda não tem caminho no contrato: por
 * isso o aviso diz o que o cancelamento NÃO fez.
 */
export function useCancelarRomaneio() {
  const invalidar = useInvalidarEntrega()
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const resposta: RespostaDaApi = await cancelDelivery(deliveryId)
      return dadosOuErro<DeliveryDetailDto>(resposta, 'Falha ao cancelar o romaneio.')
    },
    onSuccess: (romaneio) => {
      invalidar()
      avisar(
        `Romaneio ${romaneio.number} cancelado.`,
        'O que já foi lançado nele continua entregue — corrigir é estornar, não editar.',
      )
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
