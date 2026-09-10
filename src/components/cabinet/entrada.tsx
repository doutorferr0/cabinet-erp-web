export interface EntradaProps {
  /**
   * Posição no antigo escalonamento. Continua na assinatura porque o
   * `page-frame` a passa em cada região e ele é zona de outra issue — a prop é
   * aceita e ignorada, o que é honesto: a peça não anima mais.
   */
  ordem?: number
  className?: string
  /** Marcador da peça envolvida — a folha continua sendo `page-frame`. */
  'data-slot'?: string
  children: React.ReactNode
}

/**
 * Entrada de região — hoje um embrulho SEM animação (D16, issue #484).
 *
 * ## Por que a animação saiu
 *
 * Ela era a única animação de LAYOUT do sistema: cada região subia 16px e
 * aparecia, escalonada por 80ms, uma vez por navegação. A rodada 2.0 a proíbe
 * por escrito — *"proibido: animação de entrada de tela"* (regra 7 da issue-mãe
 * #469) — e o motivo é o mesmo que já estava escrito aqui em defesa dela: num
 * ERP em que o operador fica oito horas, movimento que não informa é atrito.
 * "A tela trocou" ele já sabe: foi ele quem clicou. O que a mola custava era
 * meio segundo até a última região parar de se mexer, em toda navegação, para
 * dizer o que o cursor já tinha dito.
 *
 * Some com ela a dependência de `motion/react` neste caminho — o motion continua
 * no repo para peça que APARECE (popover, dialog), que é outra gramática.
 *
 * ## Por que o componente fica
 *
 * `page-frame.tsx` monta cinco regiões com `<Entrada ordem={n}>`, e é zona de
 * outra issue da rodada. Apagar o componente obrigaria a editar o shell no meio
 * de um trabalho paralelo para trocar cinco `<Entrada>` por cinco `<div>` —
 * conflito garantido, em troca de um nó a menos por região. O embrulho fica, sem
 * mola; quando o shell for reescrito, ele sai com um `git rm`.
 */
export function Entrada({ className, 'data-slot': slot, children }: EntradaProps) {
  return (
    <div className={className} {...(slot !== undefined && { 'data-slot': slot })}>
      {children}
    </div>
  )
}
