import { cn } from '@/lib/utils'

/**
 * FormBlock — a forma-assinatura do agrupamento em formulário (DESIGN.md
 * §Shapes): `<fieldset>` + `<legend>` sobre a borda superior, citação direta
 * do groupbox do SoftLux. Compartimento fechado: borda em Régua, canto 4px,
 * goteira interna de 12px. O `<legend>` usa Meta (mono, caixa alta pequena)
 * — é o rótulo de compartimento, não um subtítulo.
 */
export function FormBlock({
  legend,
  className,
  children,
}: {
  legend: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className={cn('rounded-lg border p-3', className)}>
      <legend className="px-1 font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}
