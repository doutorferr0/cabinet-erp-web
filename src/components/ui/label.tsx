import { cn } from '@/lib/utils'
import { LabelContext, Label as LabelPrimitive, type LabelProps } from 'react-aria-components'

/** Rótulo de campo: label 600 (DESIGN.md §Typography), obrigatório em todo campo. */
function Label({ className, htmlFor, slot, ...props }: LabelProps) {
  const label = (
    <LabelPrimitive
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-semibold select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
      htmlFor={htmlFor}
      slot={slot}
    />
  )

  // Com htmlFor explícito, sai do contexto da RAC (associação manual).
  if (htmlFor && slot === undefined) {
    return <LabelContext.Provider value={null}>{label}</LabelContext.Provider>
  }

  return label
}

export { Label }
