import { cn } from '@/lib/utils'
import type * as React from 'react'
import { Input as InputPrimitive, composeRenderProps } from 'react-aria-components'

/**
 * Campo brut: caixa preta 2px sobre Documento, foco = anel 3px Amarelo Âncora.
 *
 * Desabilitado pela utility `desabilitado` (index.css §Desabilitado): o valor
 * digitado continua em tinta cheia e quem apaga é a superfície. Substituiu
 * `disabled:bg-muted/50 disabled:opacity-50`, que clareava o VALOR — o dado que
 * o operador precisa ler justamente quando não pode editá-lo.
 */
function Input({ className, type, ...props }: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={composeRenderProps(className, (className) =>
        cn(
          'desabilitado h-9 w-full min-w-0 rounded-control border-2 border-input bg-card px-2.5 py-1 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:focus-ring aria-invalid:border-destructive',
          className,
        ),
      )}
      {...props}
    />
  )
}

export { Input }
