import { cn } from '@/lib/utils'
import * as React from 'react'
import {
  Focusable,
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
    </TooltipPrimitive>
  )
}

export { Tooltip, TooltipTrigger }
