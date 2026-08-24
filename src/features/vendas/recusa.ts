import { ErroDaApi } from '@/data/api-provider'

/**
 * A FRASE da recusa, escolhida pelo `type` do problem+json.
 *
 * O `type` é o discriminador do vocabulário fechado; `status` sozinho não
 * separa dois 409 que pedem coisas OPOSTAS ao operador. O par que tornou isto
 * necessário está no ciclo do pedido — `demonstracao-em-aberto` diz "faça isto
 * antes" e `transicao-invalida` diz "desista" —, e a conversão do orçamento
 * repete a forma: "já virou pedido" e "orçamento cancelado" são os dois 409 do
 * mesmo caminho, com saídas diferentes.
 *
 * Mora em módulo próprio porque o segundo chamador chegou. Traduzir recusa em
 * duas cópias é como as duas divergem: uma ganha a URN nova, a outra continua
 * caindo no texto genérico, e o sintoma é uma tela ensinando o operador a
 * repetir o gesto que nunca vai funcionar.
 *
 * Erro que NÃO é problem+json cai no `detail` e, na falta dele, na frase
 * genérica de quem chamou — nunca na exceção crua, que fala de HTTP a quem
 * estava tentando fechar uma venda.
 */
export function mensagemDaRecusa(
  erro: unknown,
  generica: string,
  frases: Record<string, string>,
): string | null {
  if (!erro) return null
  if (!(erro instanceof ErroDaApi)) return generica
  const tipo = (erro.corpo as { type?: unknown } | null | undefined)?.type
  if (typeof tipo === 'string' && frases[tipo]) return frases[tipo]
  return erro.detail ?? generica
}

/**
 * A URN da recusa, para quem precisa RAMIFICAR e não só escrever a frase.
 *
 * A conversão precisa: em `pedido-ja-convertido` a caixa muda de forma — deixa
 * de oferecer o botão que acabou de falhar e passa a apontar para a listagem
 * de pedidos. Ler o `type` de novo no componente duplicaria a única linha que
 * conhece o formato do corpo.
 */
export function urnDaRecusa(erro: unknown): string | null {
  if (!(erro instanceof ErroDaApi)) return null
  const tipo = (erro.corpo as { type?: unknown } | null | undefined)?.type
  return typeof tipo === 'string' ? tipo : null
}
