import { NumeroHeroi } from '@/components/cabinet/numero-heroi'
import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface TotalBoxProps {
  /** Rótulo do fecho — `Total` em todo documento; a prop existe para o raro que não é. */
  label?: string
  valorCentavos: number
  className?: string
}

/**
 * FECHO DO DOCUMENTO (espec v5 `TotalBox`, issue #236): bloco lima, borda
 * forte, sombra dura, valor em display condensado a 48px.
 *
 * Bloco PRÓPRIO, e não a última fileira da grade, por uma razão de medida e
 * não de gosto: a fileira alinha o valor sob a coluna de valor, e um número de
 * 48px ao lado de itens de 13px não compartilha casa decimal com ninguém — o
 * alinhamento quebra por TAMANHO, antes de qualquer questão de fonte. Fora da
 * malha, o total não deve alinhamento a ninguém e pode ter a medida que o
 * papel dele pede.
 *
 * A tinta é a mesma da zona de dinheiro que ele substitui (`text-money` sobre
 * `--fill-money`, 3,56:1 no claro e 5,76:1 no escuro — texto grande, AA), para
 * que o fecho não estreie um par de cor que ninguém mediu. Negativo continua
 * em vermelho: a convenção do ledger vale no fecho como vale na malha.
 */
export function TotalBox({ label = 'Total', valorCentavos, className }: TotalBoxProps) {
  return (
    <div
      data-slot="total-box"
      className={cn(
        'flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1',
        'rounded-card border-[3px] border-rule-strong bg-fill-money px-4 py-3 shadow-el3',
        className,
      )}
    >
      {/* Rótulo em Meta, como em toda linha de total — 5,49:1 sobre o lima. */}
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}:
      </span>
      <output aria-label={label}>
        <NumeroHeroi
          escala="total"
          className={valorCentavos < 0 ? 'text-destructive' : 'text-money'}
        >
          {formatMoneyBRL(valorCentavos)}
        </NumeroHeroi>
      </output>
    </div>
  )
}
