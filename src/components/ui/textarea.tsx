import { cn } from '@/lib/utils'
import type * as React from 'react'
import { TextArea as TextareaPrimitive, composeRenderProps } from 'react-aria-components'

/**
 * Área de texto: o mesmo sulco do `Input` (borda 1px n-300 + `--inset`), com
 * altura mínima de 70px e respiro vertical — o mockup a desenha como o campo de
 * observação do formulário, não como um input esticado.
 *
 * `readOnly` sobe ao plano (folha-2, sem inset) e o desabilitado segue a
 * §Desabilitado: apaga fundo e traço, nunca o texto.
 */
function Textarea({ className, ...props }: React.ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      data-slot="textarea"
      className={composeRenderProps(className, (className) =>
        cn(
          'desabilitado t-corpo flex field-sizing-content min-h-[70px] w-full rounded-[var(--r-ctrl)] border border-[color:var(--n-300)] bg-[color:var(--n-0)] px-2.5 py-2 shadow-[var(--inset)] outline-none transition-colors',
          'placeholder:text-[color:var(--n-400)] focus-visible:border-[color:var(--n-900)] focus-visible:focus-ring aria-invalid:border-[color:var(--bad)]',
          'read-only:bg-[color:var(--n-50)] read-only:shadow-none disabled:shadow-none',
          className,
        ),
      )}
      {...props}
    />
  )
}

export { Textarea }
