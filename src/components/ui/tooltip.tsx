import { cn } from '@/lib/utils'
import * as React from 'react'
import {
  Focusable,
  OverlayArrow,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from 'react-aria-components'

function TooltipTrigger({
  delay = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipTriggerPrimitive>) {
  const [trigger, tooltip] = React.Children.toArray(children)

  return (
    <TooltipTriggerPrimitive data-slot="tooltip-trigger" delay={delay} {...props}>
      <Focusable>{trigger as React.ComponentProps<typeof Focusable>['children']}</Focusable>
      {tooltip}
    </TooltipTriggerPrimitive>
  )
}

/** Tooltip brut: Tinta sólida, texto cream, canto reto, sem seta arredondada. */
function Tooltip({
  className,
  placement = 'top',
  offset = 6,
  crossOffset = 0,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TooltipPrimitive>, 'children' | 'className'> & {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <TooltipPrimitive
      data-slot="tooltip-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        'z-50 inline-flex w-fit max-w-xs origin-(--trigger-anchor-point) items-center gap-1.5 rounded-control bg-foreground px-2.5 py-1 font-mono text-xs font-semibold tracking-[0.05em] text-background pop-spring uppercase',
        className,
      )}
      {...props}
    >
      {children}
      {/* SETA, do staging `neobrutalism-aria`. Não é enfeite: a dica aparece
          deslocada do gatilho, e com vários controles vizinhos — os itens da
          sidebar colapsada estão a 8px um do outro — a caixa preta sozinha não
          diz de QUAL deles ela fala. A seta é um quadrado girado 45° que
          encosta na borda voltada para o alvo; o meio pixel de sobreposição
          (`+ 2px`) é o que impede a fresta clara entre seta e caixa. */}
      <OverlayArrow
        className="z-50 size-2.5 bg-foreground fill-foreground"
        style={({ placement, defaultStyle }) => ({
          ...defaultStyle,
          rotate: '0deg',
          translate: '0 0',
          transform:
            placement === 'bottom'
              ? 'translate(-50%, calc(50% + 2px)) rotate(45deg)'
              : placement === 'top'
                ? 'translate(-50%, calc(-50% - 2px)) rotate(45deg)'
                : placement === 'left'
                  ? 'translate(calc(-50% - 2px), -50%) rotate(45deg)'
                  : 'translate(calc(50% + 2px), -50%) rotate(45deg)',
        })}
      />
    </TooltipPrimitive>
  )
}

export { Tooltip, TooltipTrigger }
