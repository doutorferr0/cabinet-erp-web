/**
 * Tipos do quadro de funil — STAGED, não integrado (ver ../README.md).
 *
 * Estes tipos são LOCAIS de propósito. Quando o funil virar tela, o DTO da
 * oportunidade sai do codegen (`src/api/gerado/`) a partir de um caminho novo no
 * contrato, e este arquivo morre: escrever à mão tipo que o contrato define é
 * proibido pelo CLAUDE.md. O que fica é a forma do que o QUADRO precisa, que é
 * menos do que o DTO inteiro — e é por isso que ela está aqui separada.
 */

/** Uma etapa do funil. `valor` é a chave que o servidor guarda; `rotulo`, o que o operador lê. */
export interface EtapaDoFunil {
  valor: string
  rotulo: string
}

/**
 * A oportunidade como o CARTÃO precisa dela — não como o servidor a devolve.
 *
 * `valorCents` em centavos inteiros (convenção do repo: dinheiro nunca é float
 * em estado). `ordem` é a posição dentro da etapa; quem a atribui é o servidor.
 */
export interface OportunidadeDoFunil {
  id: string
  titulo: string
  /** Nome do parceiro, já resolvido. O cartão não carrega lista de apoio para exibir três letras. */
  parceiroNome: string | null
  valorCents: number | null
  etapa: string
  ordem: number
}

export type PorEtapa = Record<string, OportunidadeDoFunil[]>

/**
 * O destino de um movimento, do jeito que a INTENÇÃO se escreve.
 *
 * `precedeId` = id do cartão na frente do qual a oportunidade fica; `null` = fim
 * da coluna. É referência a vizinho, não índice numérico, e a diferença importa:
 * índice é posição em uma lista que pode estar filtrada, vizinho é um fato sobre
 * dois registros que o servidor consegue verificar. Ver `integracao.md`
 * §"A reindexação não atravessa".
 */
export interface DestinoDoMovimento {
  etapa: string
  precedeId: string | null
}
