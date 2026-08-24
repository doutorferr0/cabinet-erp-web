import type { CancelDocumentRequest } from '@/api/gerado'

/**
 * O MOTIVO DO CANCELAMENTO, na língua da tela — um lugar só para os dois
 * documentos que cancelam.
 *
 * Orçamento e pedido têm caminhos próprios (`POST /api/quotes/{id}/cancel` e
 * `POST /api/orders/{id}/cancel`) e o MESMO corpo (`CancelDocumentRequest`).
 * Duas cópias da mesma montagem seriam duas chances de divergir no detalhe que
 * decide tudo: mandar `{}` onde o certo é não mandar corpo nenhum.
 */
export interface MotivoDoCancelamento {
  /** Id da lista `MOTIVO_CANCELAMENTO`. Vazio = o operador não escolheu. */
  motivoId: string | null
  /** Observação livre, teto de 200 no contrato. */
  observacao: string
}

export const OBSERVACAO_MAX = 200

export function motivoVazio(): MotivoDoCancelamento {
  return { motivoId: null, observacao: '' }
}

/**
 * O corpo do `cancel` — ou **`undefined`**, que é diferente de `{}`.
 *
 * O contrato declara o corpo inteiro como opcional: cancelar sem dizer por quê
 * continua valendo, e é o que a maioria dos cancelamentos do legado é. Mandar
 * `{reasonId: null, note: null}` passa igual hoje, mas afirma "não teve motivo"
 * onde a verdade é que ninguém disse — e o dia em que o servidor separar as
 * duas coisas, quem mandou o objeto vazio já terá gravado a afirmação errada em
 * todo cancelamento antigo.
 *
 * A observação sem motivo VIAJA: o motivo diz a classe e a nota diz o caso, e
 * quem escreveu a nota disse algo que não cabia na lista. Descartá-la porque o
 * combo ficou vazio jogaria fora a única parte que ninguém mais registra.
 */
export function corpoDoCancelamento(
  motivo?: MotivoDoCancelamento,
): CancelDocumentRequest | undefined {
  if (!motivo) return undefined
  const observacao = motivo.observacao.trim()
  if (!motivo.motivoId && !observacao) return undefined
  return {
    reasonId: motivo.motivoId || null,
    note: observacao || null,
  }
}
