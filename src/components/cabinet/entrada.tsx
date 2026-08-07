import { motion } from 'motion/react'

/**
 * ENTRADA DE TELA (DESIGN.md §Motion, fase 1.6).
 *
 * A única animação de LAYOUT do sistema: a região sobe 16px e aparece, uma vez
 * por navegação. Serve para dizer "a tela trocou" — num ERP em que o operador
 * fica oito horas, movimento que não informa é atrito, e é por isso que a lista
 * de onde ele NÃO entra é tão importante quanto a receita:
 *
 *   linha de tabela · célula de grade · campo · anel de foco · hover e press.
 *
 * Hover e press continuam em CSS (`lift-control`): eles respondem ao mouse, e
 * mouse não espera mola. Peça que aparece (popover, menu, diálogo, dica) tem
 * receita própria, também em CSS (`pop-spring`), porque quem monta e desmonta
 * essas peças é a `react-aria-components`.
 *
 * **Anima na MONTAGEM, e só.** Quem garante uma vez por navegação é a `key` do
 * consumidor: o shell dá `key={pathname}` à folha, então trocar de tela remonta
 * e anima, enquanto paginar, ordenar ou digitar — que mudam search params ou
 * estado, não o caminho — não remontam e não animam. Animação que se repete a
 * cada re-render é a que faz o operador esperar a tela parar de se mexer.
 *
 * `reducedMotion="user"` está na raiz (`providers.tsx`): com "reduzir
 * movimento" ligado no sistema, a mola vira duração zero e nada aqui muda.
 */

/** Mola da entrada: `{stiffness:120, damping:30}` — chega sem passar do alvo. */
const MOLA = { type: 'spring', stiffness: 120, damping: 30 } as const

/** Passo do escalonamento entre regiões irmãs. */
const PASSO = 0.08

/**
 * Máximo de regiões escalonadas. Além da sexta o atraso passa de meio segundo e
 * o operador vê a tela montar em partes em vez de aparecer — teto, não sugestão.
 */
export const ORDEM_MAXIMA = 5

export function atrasoDaOrdem(ordem: number): number {
  return Math.min(Math.max(ordem, 0), ORDEM_MAXIMA) * PASSO
}

export interface EntradaProps {
  /** Posição no escalonamento: 0 entra primeiro, 1 entra 80ms depois. */
  ordem?: number
  className?: string
  /** Marcador da peça envolvida — a folha continua sendo `page-frame`. */
  'data-slot'?: string
  children: React.ReactNode
}

export function Entrada({ ordem = 0, className, 'data-slot': slot, children }: EntradaProps) {
  return (
    <motion.div
      className={className}
      {...(slot !== undefined && { 'data-slot': slot })}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...MOLA, delay: atrasoDaOrdem(ordem) }}
    >
      {children}
    </motion.div>
  )
}
