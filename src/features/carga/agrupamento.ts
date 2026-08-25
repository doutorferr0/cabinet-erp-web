import type { PickingQueueItemDto } from '@/api/gerado'

/**
 * A CARGA — as linhas da fila de separação que saem no mesmo pedido.
 *
 * O agrupamento mora aqui, e não dentro do componente, por dois motivos que a
 * tela não resolve: ele tem regra (a data da carga é a MAIS ANTIGA das linhas,
 * não a primeira que aparecer) e é o que o teste precisa exercitar sem montar
 * React. Uma carga com data de ontem e outra sem data nenhuma não podem ficar
 * lado a lado por acaso da ordem em que o servidor devolveu.
 */
export interface Carga {
  orderId: string
  orderNumber: string
  customerName: string
  /** A data prometida MAIS ANTIGA da carga. `null` = nenhuma linha tem data. */
  scheduledDeliveryAt: string | null
  /** Soma do que está liberado e ainda não saiu da prateleira. */
  pendingPick: number
  linhas: PickingQueueItemDto[]
}

/**
 * Agrupa a fila por pedido, preservando a ordem que o SERVIDOR devolveu.
 *
 * A ordem de chegada é a do contrato — data prometida `NULLS LAST`, número do
 * pedido como desempate —, e reordenar aqui apagaria a regra do servidor com
 * uma preferência da tela. O que a função faz é juntar; quem ordena é quem
 * consultou.
 *
 * A data da carga é o MÍNIMO das linhas: a viagem atrasa junto com a peça mais
 * atrasada dela, e mostrar a data do primeiro item faria uma carga com item de
 * ontem parecer combinada para semana que vem.
 */
export function agruparEmCargas(linhas: readonly PickingQueueItemDto[]): Carga[] {
  const porPedido = new Map<string, Carga>()

  for (const linha of linhas) {
    const carga = porPedido.get(linha.orderId)
    if (!carga) {
      porPedido.set(linha.orderId, {
        orderId: linha.orderId,
        orderNumber: linha.orderNumber,
        customerName: linha.customerName,
        scheduledDeliveryAt: linha.scheduledDeliveryAt ?? null,
        pendingPick: linha.pendingPick,
        linhas: [linha],
      })
      continue
    }
    carga.linhas.push(linha)
    carga.pendingPick = Math.round((carga.pendingPick + linha.pendingPick) * 1000) / 1000
    const data = linha.scheduledDeliveryAt ?? null
    if (data && (carga.scheduledDeliveryAt === null || data < carga.scheduledDeliveryAt)) {
      carga.scheduledDeliveryAt = data
    }
  }

  return [...porPedido.values()]
}

/** `true` quando a carga já passou da data combinada — o que sobe ao topo. */
export function estaAtrasada(carga: Carga, hoje: string): boolean {
  return carga.scheduledDeliveryAt !== null && carga.scheduledDeliveryAt < hoje
}
