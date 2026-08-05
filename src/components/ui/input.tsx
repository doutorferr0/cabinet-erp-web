import { cn } from '@/lib/utils'
import type * as React from 'react'
import { Input as InputPrimitive, composeRenderProps } from 'react-aria-components'

/** Campo brut: caixa preta 2px sobre Documento, foco = anel 3px Amarelo Âncora. */
function Input({ className, type, ...props }: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={composeRenderProps(className, (className) =>
        cn(
          'h-9 w-full min-w-0 border-2 border-input bg-card px-2.5 py-1 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-destructive',
          className,
        ),
      )}
      {...props}
    />
  )
}

export { Input }
