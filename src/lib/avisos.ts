/**
 * AVISO DE CONCLUSÃO — "gravou", "desativou", "vinculou" (Polaris-6, #201).
 *
 * ## Por que existe
 *
 * O `Gravar` de um cadastro faz duas coisas ao mesmo tempo: manda a escrita e
 * VOLTA para a listagem. Do lugar do operador, a tela simplesmente troca — e
 * uma listagem idêntica à que ele viu antes não é resposta nenhuma. A falha já
 * tinha voz (`ErroDoServidor`, #138); o sucesso não tinha, e a dúvida ficava
 * com quem clicou.
 *
 * ## Por que em `lib/` e não num contexto React
 *
 * Quem sabe que a escrita terminou é a MUTATION, não a tela: `usar-parceiro`
 * grava e navega no mesmo `onSuccess`, e a tela que faria o aviso já foi
 * desmontada. Um contexto obrigaria cada mutation a receber um `avisar` por
 * prop ou hook até a fronteira de dados — que é a inversão de camada que este
 * repo evita em todo lugar.
 *
 * Estado de módulo, e não `useState` em algum lugar alto, porque o aviso
 * SOBREVIVE à navegação de propósito: ele nasce na tela que sai e é lido na
 * tela que entra.
 *
 * ## O que ele NÃO é
 *
 * Não é canal de erro. Falha de escrita continua no `ErroDoServidor`, dentro da
 * tela, ao lado do formulário que precisa de correção — um aviso que some
 * sozinho em cinco segundos seria o pior lugar possível para pôr o que o
 * operador precisa ler e agir. Aqui só entra o que já terminou bem.
 */

/**
 * O TOM do aviso — o que ele pinta na faixa e se ele sai sozinho.
 *
 * `ok` é o padrão porque é o que a fila carrega hoje (gravou, desativou,
 * vinculou). Os outros três existem para a faixa da 2.0 (D5) ter fonte de
 * verdade: pintar uma confirmação em âmbar porque a faixa é âmbar seria cor
 * decorativa sobre dado, que é o que a rodada está tirando do sistema.
 */
export type TomDoAviso = 'ok' | 'info' | 'warn' | 'bad'

export interface Aviso {
  id: string
  texto: string
  /** Detalhe opcional — o nome do registro, o número do documento. */
  detalhe?: string
  /** Ausente = `ok`. Ver `TomDoAviso`. */
  tom?: TomDoAviso
}

type Assinante = (avisos: readonly Aviso[]) => void

let avisos: readonly Aviso[] = []
const assinantes = new Set<Assinante>()
let sequencia = 0

function publicar() {
  for (const assinante of assinantes) assinante(avisos)
}

/**
 * Anuncia que algo terminou bem. Devolve o `id`, que serve para dispensar antes
 * do tempo (a região de avisos usa isso).
 */
export function avisar(texto: string, detalhe?: string, tom?: TomDoAviso): string {
  sequencia += 1
  const id = `aviso-${sequencia}`
  avisos = [...avisos, { id, texto, ...(detalhe ? { detalhe } : {}), ...(tom ? { tom } : {}) }]
  publicar()
  return id
}

export function dispensarAviso(id: string) {
  const restantes = avisos.filter((aviso) => aviso.id !== id)
  // Sai sem publicar quando nada mudou: dispensa repetida (o clique e o relógio
  // chegando juntos) renderizaria a região de novo para dizer o mesmo.
  if (restantes.length === avisos.length) return
  avisos = restantes
  publicar()
}

export function avisosAtuais(): readonly Aviso[] {
  return avisos
}

export function assinarAvisos(assinante: Assinante): () => void {
  assinantes.add(assinante)
  return () => {
    assinantes.delete(assinante)
  }
}

/** Só para o teste: zera a fila entre casos. */
export function limparAvisos() {
  avisos = []
  publicar()
}
