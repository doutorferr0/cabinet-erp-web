import { cn } from '@/lib/utils'

export interface StippleProps {
  /** Tamanho da célula. Padrão: quadrado de 52px — uma célula da grade do Papel. */
  className?: string
}

/**
 * Célula de textura pontilhada (DESIGN.md §Stipple) — o acento gráfico dos
 * folhetos De School: pontos de 1px em célula de 7px, dentro de caixa preta.
 *
 * **Não carrega informação, e por isso é `aria-hidden`**: quem usa leitor de
 * tela não ganha nada com "imagem decorativa" no meio de uma tela vazia.
 *
 * Empregos permitidos: tela de login, estado vazio de módulo, tela inicial —
 * lugares onde a folha ficaria em branco. NUNCA atrás de dado: ponto sob
 * número é ruído em cima da informação, e a regra existe porque textura de
 * fundo é o primeiro lugar onde uma interface densa começa a vazar.
 */
export function Stipple({ className }: StippleProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="stipple"
      className={cn('bg-stipple size-[52px] shrink-0 border-2 border-border', className)}
    />
  )
}
