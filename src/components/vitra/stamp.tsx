import { cn } from '@/lib/utils'

/**
 * Carimbo de situação (DESIGN.md §Stamp): tinta sobre papel — fundo
 * transparente, borda de 1px e texto na mesma cor do tom, canto 2px,
 * conteúdo em Meta (mono 0.75rem, caixa alta, tracking 0.06em), altura 20px.
 *
 * Os quatro tons são semânticos (neutro/aberto/concluído/anulado) e chegam
 * por propriedade: o mapeamento tom → situação é `[a resolver]` — a
 * transcrição prova que o conceito existe (`Consultar Situação do Pedido de
 * Venda`) mas não transcreve os valores. Nenhuma tela fixa nome de situação
 * até a enumeração real vir da transcrição ou do contrato do backend.
 */
export type StampTom = 'neutral' | 'open' | 'done' | 'void'

const TONS: Record<StampTom, string> = {
  neutral: 'border-stamp-neutral text-stamp-neutral',
  open: 'border-stamp-open text-stamp-open',
  done: 'border-stamp-done text-stamp-done',
  void: 'border-stamp-void text-stamp-void',
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
        'inline-flex h-5 items-center rounded-sm border bg-transparent px-1.5 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]',
        TONS[tom],
        className,
      )}
    >
      {label}
    </span>
  )
}
