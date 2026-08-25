import { diaLocalISO } from '@/lib/datas'

/**
 * A SEMENTE do bloco físico da venda — os pedidos que já estão no galpão.
 *
 * **Existe porque `/api/orders` não tem handler no mock.** É a mesma divergência
 * que `PEDIDOS_DE_VENDA_CONHECIDOS` de `compras.ts` declara: o pedido de venda é
 * HTTP puro (`rotas-do-backend.ts` o manda ao backend) e no modo mock ninguém o
 * serve. A fila de separação, o romaneio e a situação do pedido PRECISAM de
 * pedido com itens para existirem, então eles vêm daqui — congelados, como o
 * contrato manda que viajem (`customerName` é eco, `description` é snapshot da
 * emissão).
 *
 * Some no dia em que o pedido de venda ganhar handler no mock: aí estes itens
 * saem do store dele, e o que sobra aqui são os FATOS (liberar/separar/entregar),
 * que são de outro agregado.
 */
export interface ItemDoPedidoEmSeparacao {
  lineNumber: number
  description: string
  environmentCode: string | null
  environmentName: string | null
  quantity: number
  unit: string | null
  /**
   * Data prometida DO ITEM. `null` herda a do ambiente — e a herança é de
   * leitura, nunca coluna (`OrderItemFulfillmentDto.scheduledDateInherited`).
   */
  scheduledDeliveryAt: string | null
}

export interface PedidoEmSeparacao {
  id: string
  number: string
  customerName: string
  /** `active` · `concluded` · `cancelled` — cancelado não recebe entrega. */
  status: 'active' | 'concluded' | 'cancelled'
  /** Data prometida por AMBIENTE. É dela que o item herda quando não tem a sua. */
  datasPorAmbiente: Record<string, string>
  itens: ItemDoPedidoEmSeparacao[]
}

/** Hoje deslocado em dias — a fila só diz alguma coisa em relação a hoje. */
function dia(deslocamento: number): string {
  const d = new Date()
  d.setDate(d.getDate() + deslocamento)
  return diaLocalISO(d)
}

/**
 * Três pedidos, e cada um existe para exibir um estado diferente do quadro:
 *
 * - `ped-2001` ATRASA (data de ontem) e tem cozinha em dois ambientes — é o que
 *   sobe ao topo da fila, porque a ordem padrão é a data prometida.
 * - `ped-2002` tem item de SERVIÇO (sem peça) e um item já separado pela metade,
 *   para o "6 de 10" do `partial` aparecer sem inventar número.
 * - `ped-2003` ainda não tem NADA liberado: é o pedido que a fila não mostra e
 *   que só aparece quando alguém libera. Sem ele, a tela nasceria sem o caso em
 *   que a fila está certa ao ficar vazia.
 */
export const PEDIDOS_EM_SEPARACAO: readonly PedidoEmSeparacao[] = [
  {
    id: 'ped-2001',
    number: '21646',
    customerName: 'CONSTRUTORA HORIZONTE SA',
    status: 'active',
    datasPorAmbiente: { COZ: dia(-1), DOR: dia(4) },
    itens: [
      {
        lineNumber: 1,
        description: 'Porta de correr 2 folhas — MDF Branco TX',
        environmentCode: 'COZ',
        environmentName: 'Cozinha',
        quantity: 4,
        unit: 'UN',
        scheduledDeliveryAt: null,
      },
      {
        lineNumber: 2,
        description: 'Puxador alumínio 150mm',
        environmentCode: 'COZ',
        environmentName: 'Cozinha',
        quantity: 12,
        unit: 'UN',
        scheduledDeliveryAt: null,
      },
      {
        lineNumber: 3,
        description: 'Painel ripado 2,10m — Freijó',
        environmentCode: 'DOR',
        environmentName: 'Dormitório',
        quantity: 2,
        unit: 'UN',
        // Data PRÓPRIA, diferente da do ambiente: é o que faz
        // `scheduledDateInherited` valer `false` em pelo menos uma linha.
        scheduledDeliveryAt: dia(2),
      },
    ],
  },
  {
    id: 'ped-2002',
    number: '21653',
    customerName: 'MARIA APARECIDA GONCALVES',
    status: 'active',
    datasPorAmbiente: { COZ: dia(3) },
    itens: [
      {
        lineNumber: 1,
        description: 'Cuba inox 40x34 embutir',
        environmentCode: 'COZ',
        environmentName: 'Cozinha',
        quantity: 10,
        unit: 'UN',
        scheduledDeliveryAt: null,
      },
      {
        lineNumber: 2,
        description: 'Instalação e montagem em obra',
        environmentCode: null,
        environmentName: null,
        quantity: 1,
        unit: 'SERV',
        scheduledDeliveryAt: null,
      },
    ],
  },
  {
    id: 'ped-2003',
    number: '21660',
    customerName: 'EDIFICIO AURORA — ADMINISTRACAO',
    status: 'active',
    datasPorAmbiente: {},
    itens: [
      {
        lineNumber: 1,
        description: 'Bancada em quartzo 2,40m',
        environmentCode: null,
        environmentName: null,
        quantity: 1,
        unit: 'UN',
        scheduledDeliveryAt: null,
      },
    ],
  },
]

/**
 * Os fatos que a semente já traz — a loja não começa com o galpão parado.
 *
 * Cada um é um ato do log append-only (`order_fulfillments`), na mesma forma que
 * `POST .../release` e `.../pick` gravam. Nascer como FATO, e não como
 * quantidade guardada na linha, é o que garante que o mock some da mesma
 * maneira que o servidor: o progresso é derivação, sempre.
 */
export interface FatoSemeado {
  orderId: string
  lineNumber: number
  kind: 'release' | 'pick'
  quantity: number
}

export const FATOS_SEMEADOS: readonly FatoSemeado[] = [
  // O pedido atrasado está liberado inteiro e não saiu da prateleira: é a fila
  // de separação de verdade.
  { orderId: 'ped-2001', lineNumber: 1, kind: 'release', quantity: 4 },
  { orderId: 'ped-2001', lineNumber: 2, kind: 'release', quantity: 12 },
  { orderId: 'ped-2001', lineNumber: 3, kind: 'release', quantity: 2 },
  // O parcial: 10 liberados, 6 separados. Sobram 4 na fila e o `partial` da
  // linha fica `true` com `physicalState: released`.
  { orderId: 'ped-2002', lineNumber: 1, kind: 'release', quantity: 10 },
  { orderId: 'ped-2002', lineNumber: 1, kind: 'pick', quantity: 6 },
  { orderId: 'ped-2002', lineNumber: 2, kind: 'release', quantity: 1 },
]
