import { cn } from '@/lib/utils'
import {
  RadioGroup as RadioGroupPrimitive,
  type RadioGroupProps,
  Radio as RadioPrimitive,
  type RadioProps,
  composeRenderProps,
} from 'react-aria-components'

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={composeRenderProps(className, (className) => cn('grid w-full gap-2', className))}
      {...props}
    />
  )
}

/**
 * Opção exclusiva (○/●). O rótulo é `children` — a RAC associa sozinha.
 * Círculo é a única exceção ao canto reto: ● é vocabulário, não decoração.
 */
function RadioGroupItem({ className, children, ...props }: RadioProps) {
  return (
    <RadioPrimitive
      data-slot="radio-group-item"
      className={composeRenderProps(className, (className) =>
        cn(
          'group/radio flex items-center gap-2 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
          className,
        ),
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span
            data-slot="radio-group-indicator"
            className="relative flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-input bg-card transition-colors group-data-focus-visible/radio:focus-ring group-data-selected/radio:border-primary"
          >
            {isSelected && <span className="size-2 rounded-full bg-primary" />}
          </span>
          {children}
        </>
      ))}
    </RadioPrimitive>
  )
}

export { RadioGroup, RadioGroupItem }
