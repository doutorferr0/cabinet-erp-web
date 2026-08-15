import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'
import {
  Checkbox as CheckboxPrimitive,
  type CheckboxProps,
  composeRenderProps,
} from 'react-aria-components'

/**
 * Checkbox brut: caixa preta 2px, canto reto, marcado = Tinta sólida.
 *
 * Desabilitado (§Desabilitado): apaga o QUADRADO (`marca-desabilitada`), nunca
 * o rótulo. Era `data-[disabled]:opacity-50` na raiz, que clareava os dois.
 */
function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={composeRenderProps(className, (className) =>
        cn(
          'group/checkbox flex items-center gap-2 text-sm outline-none data-[disabled]:cursor-not-allowed',
          className,
        ),
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, isIndeterminate }) => (
        <>
          <span
            data-slot="checkbox-indicator"
            className="marca-desabilitada grid size-4 shrink-0 place-content-center rounded-item border-2 border-input bg-card text-primary-foreground transition-colors group-data-focus-visible/checkbox:focus-ring group-data-selected/checkbox:border-primary group-data-selected/checkbox:bg-primary [&>svg]:size-3"
          >
            {(isSelected || isIndeterminate) && <CheckIcon />}
          </span>
          {children}
        </>
      ))}
    </CheckboxPrimitive>
  )
}

export { Checkbox }
