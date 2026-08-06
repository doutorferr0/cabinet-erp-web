import { cn } from '@/lib/utils'
import type * as React from 'react'
import { TextArea as TextareaPrimitive, composeRenderProps } from 'react-aria-components'

/** Área de texto brut: mesma caixa preta 2px e foco amarelo do Input. */
function Textarea({ className, ...props }: React.ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      data-slot="textarea"
      className={composeRenderProps(className, (className) =>
        cn(
          'flex field-sizing-content min-h-16 w-full rounded-control border-2 border-input bg-card px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:focus-ring disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-destructive',
          className,
        ),
      )}
      {...props}
    />
  )
}

export { Textarea }
