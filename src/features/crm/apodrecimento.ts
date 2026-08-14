import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'

/**
 * APODRECIMENTO — o negócio parado tempo demais na mesma etapa.
 *
 * `crm_stages.rot_days` é o limite que a EMPRESA definiu para cada etapa, e
 * `stageChangedAt` é quando o cartão entrou nela. O sinal é a razão entre os
 * dois. Nada aqui é inventado pela tela: os dois campos vêm do contrato desde a
 * #75, e o que faltava era mostrá-los.
 *
 * ## Três estados, e o primeiro é o SILÊNCIO
 *
 * `fresco` não desenha nada. Um selo em todo cartão viraria ruído de fundo e o
 * operador pararia de vê-lo justamente onde ele importa — o sinal só vale
 * enquanto for exceção.
 *
 * `perto` começa a **dois terços** do prazo. É onde ainda dá para agir: com
 * `rotDays: 3`, avisa no dia 2; com 15, no dia 10. Avisar na véspera seria
 * avisar tarde, e avisar na metade transformaria o alerta em decoração. O
 * arredondamento é PARA BAIXO — ver `apodrecimentoDoCartao` para o porquê, que
 * é onde a primeira versão errou.
 *
 * ## Etapa que FECHA não apodrece
 *
 * `isWon`/`isLost` não recebem sinal mesmo que tenham `rotDays` gravado.
 * Apodrecimento mede negócio EMPACADO, e um negócio fechado não está empacado —
 * está fechado. Marcar de vermelho a coluna de ganhos diria que fechar a venda
 * foi o problema.
 *
 * ## Dias por DIA, não por instante
 *
 * A conta usa a data (`yyyy-mm-dd`), não o carimbo com hora. "Está parado há 7
 * dias" é uma frase sobre o calendário: um cartão que entrou às 23h de segunda
 * não pode contar meio dia a menos que o que entrou às 8h.
 */

export type EstadoDeApodrecimento = 'fresco' | 'perto' | 'apodrecido'

export interface Apodrecimento {
  estado: EstadoDeApodrecimento
  /** Dias corridos desde a entrada na etapa. */
  dias: number
  /** `rotDays` da etapa — o limite que a empresa definiu. */
  limite: number
}

/** Os 10 primeiros caracteres do ISO são a data; o resto é hora, e não conta. */
function dia(iso: string): string {
  return iso.slice(0, 10)
}

const MS_POR_DIA = 86_400_000

/** Dias corridos entre dois DIAS (não instantes). Negativo vira zero. */
export function diasParado(desde: string, agora: Date): number {
  const entrada = Date.parse(`${dia(desde)}T00:00:00Z`)
  const hoje = Date.parse(`${agora.toISOString().slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(entrada) || Number.isNaN(hoje)) return 0
  return Math.max(0, Math.round((hoje - entrada) / MS_POR_DIA))
}

/**
 * O apodrecimento de um cartão, ou `null` quando a etapa não apodrece.
 *
 * `null` — e não um estado `fresco` genérico — porque as duas ausências são
 * diferentes: "esta etapa não tem prazo" é decisão da empresa, e "este cartão
 * ainda está no prazo" é o estado de hoje. Quem chama precisa poder distinguir.
 */
export function apodrecimentoDoCartao(
  oportunidade: CrmOpportunityDto,
  etapa: CrmStageDto | undefined,
  agora: Date = new Date(),
): Apodrecimento | null {
  if (!etapa) return null
  // Etapa que fecha o negócio não apodrece, mesmo com `rotDays` gravado.
  if (etapa.isWon || etapa.isLost) return null
  const limite = etapa.rotDays ?? 0
  if (limite <= 0) return null

  const dias = diasParado(oportunidade.stageChangedAt, agora)
  /**
   * Dois terços, arredondados PARA BAIXO, com piso em 1.
   *
   * O arredondamento decide se o degrau do meio existe em prazo curto, e a
   * primeira versão errou: com `Math.ceil` e `rotDays: 2`, o aviso caía no dia
   * 2 — o MESMO dia do apodrecimento, que é testado primeiro. O estado `perto`
   * simplesmente nunca acontecia, e nada na tela denunciava.
   *
   * Para baixo: `rotDays: 2` avisa no dia 1, `3` no dia 2, `15` no dia 10. O
   * piso de 1 existe porque `floor` de prazo 1 daria zero, e aí um cartão que
   * acabou de entrar já nasceria "perto de apodrecer".
   *
   * `rotDays: 1` continua sem meio-termo, e não há como ter: entre "entrou
   * hoje" e "estourou" não existe dia nenhum.
   */
  const aviso = Math.max(1, Math.floor((limite * 2) / 3))

  if (dias >= limite) return { estado: 'apodrecido', dias, limite }
  if (dias >= aviso) return { estado: 'perto', dias, limite }
  return { estado: 'fresco', dias, limite }
}

/** A frase que o leitor de tela ouve — o selo sozinho seria um número mudo. */
export function descricaoDoApodrecimento({ estado, dias, limite }: Apodrecimento): string {
  const parado = `Parado há ${dias} ${dias === 1 ? 'dia' : 'dias'}; o limite desta etapa é ${limite}.`
  if (estado === 'apodrecido') return `Apodrecido. ${parado}`
  if (estado === 'perto') return `Perto de apodrecer. ${parado}`
  return parado
}
