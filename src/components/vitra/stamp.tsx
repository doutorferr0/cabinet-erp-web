import { cn } from '@/lib/utils'

/**
 * Carimbo de situação (DESIGN.md §Stamp): retângulo de 24px, borda 2px, canto
 * reto, conteúdo em Meta (mono 700, 0.75rem, caixa alta, tracking 0.07em).
 *
 * **Os tons não têm o mesmo peso, e isso é a informação.** `open` e `done` são
 * PREENCHIDOS (amarelo com Tinta em cima; Tinta com cream em cima) porque são
 * os estados que se procuram correndo o olho numa lista; `void` e `neutral`
 * ficam em tinta sobre papel. Quatro carimbos com o mesmo peso não destacam
 * nenhum. Amarelo entra como FUNDO — nunca como cor de texto (§Don'ts).
 *
 * Os quatro tons são semânticos e chegam por propriedade: o mapeamento tom →
 * situação é `[a resolver]` — a transcrição prova que o conceito existe
 * (`Consultar Situação do Pedido de Venda`) mas não transcreve os valores.
 * Nenhuma tela fixa nome de situação até a enumeração real vir da transcrição
 * ou do contrato do backend.
 */
export type StampTom = 'neutral' | 'open' | 'done' | 'void'

const TONS: Record<StampTom, string> = {
  neutral: 'border-stamp-neutral text-stamp-neutral bg-transparent',
  // Borda TINTA, não amarela: no mockup o `open` é caixa preta PREENCHIDA de
  // amarelo. Amarelo sobre amarelo apagaria a caixa — e a Regra da Caixa Preta
  // vale para o carimbo como para todo o resto.
  open: 'border-border bg-stamp-open text-foreground',
  done: 'border-stamp-done bg-stamp-done text-primary-foreground',
  void: 'border-stamp-void text-stamp-void bg-transparent',
}

export interface StampProps {
  tom: StampTom
  /** Rótulo em caixa alta (Meta). A situação real ainda é `[a resolver]`. */
  label: string
  className?: string
}

export function Stamp({ tom, label, className }: StampProps) {
  return (
    <span
      data-slot="stamp"
      data-tom={tom}
      className={cn(
        'inline-flex h-6 items-center border-2 px-2 font-bold font-mono text-[0.75rem] uppercase tracking-[0.07em]',
        TONS[tom],
        className,
      )}
    >
      {label}
    </span>
  )
}
