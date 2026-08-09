import { cn } from '@/lib/utils'

export type CorDoPainel = 'boletim' | 'foco' | 'cadastros'

const CORES: Record<CorDoPainel, { modulo?: string; classe: string }> = {
  boletim: { modulo: 'boletim', classe: 'border-double-modulo' },
  foco: { classe: 'border-2 border-warn outline outline-1 outline-warn outline-offset-[3px]' },
  cadastros: {
    classe:
      'border-2 outline outline-1 outline-offset-[3px] border-[hsl(206,100%,50%)] outline-[hsl(206,100%,50%)]',
  },
}

/**
 * PainelBoletim — moldura dupla colorida com legend vazado na borda
 * (REFACE Boletim, decisão user 2026-08-07).
 *
 * A cor da moldura varia por região: laranja do Boletim no movimento,
 * amarelo de foco nas pendências, azul nos cadastros. Interior com papel
 * quadriculado (bg-paper-grid). Mesmo padrão de legend do FormBlock.
 *
 * Depois do Boletim, este componente propaga para Dashboard e Planner.
 */
export function PainelBoletim({
  cor,
  legend,
  className,
  children,
}: {
  cor: CorDoPainel
  legend?: string
  className?: string
  children: React.ReactNode
}) {
  const cfg = CORES[cor]

  return (
    <fieldset
      {...(cfg.modulo ? { 'data-modulo': cfg.modulo } : {})}
      className={cn('rounded-lg bg-paper-grid p-3', cfg.classe, className)}
    >
      {legend ? (
        <legend className="px-1 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {legend}
        </legend>
      ) : null}
      {children}
    </fieldset>
  )
}
