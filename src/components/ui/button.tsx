import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'
import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from 'react-aria-components'

/**
 * Botão brut (DESIGN.md §Buttons): borda 2px, canto reto, foco = anel 3px
 * Amarelo Âncora. O primário carrega a sombra dura e o press físico
 * (translate + sombra) — A microinteração do sistema (§Motion).
 */
const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-2 text-[13px] font-semibold transition-[transform,box-shadow,background-color,color] duration-100 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        // A sombra do primário é rebaixada (não Tinta): sombra Tinta sumiria
        // contra o próprio fundo Tinta do botão — valor do mockup aprovado.
        default:
          'border-border bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(38_14%_74%)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_hsl(38_14%_74%)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        outline: 'border-border bg-card hover:bg-muted',
        secondary: 'border-border bg-card hover:bg-muted',
        ghost: 'border-transparent hover:bg-muted',
        destructive:
          'border-destructive bg-card text-destructive hover:bg-destructive hover:text-white',
        // Link cru (Utrecht): mono caps sublinhado 2px, hover fundo amarelo.
        link: 'border-transparent font-mono text-xs uppercase tracking-[0.07em] underline decoration-2 underline-offset-[3px] hover:bg-anchor',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-[31px] px-3 text-xs',
        lg: 'h-10 px-5',
        icon: 'size-9',
        'icon-sm': 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonExtraProps = {
  className?: string | undefined
  /** Compat DOM→RAC: a RAC filtra `onClick`; o wrapper traduz para `onPress`. */
  onClick?: (() => void) | undefined
  /** Compat DOM→RAC: `disabled` vira `isDisabled`. */
  disabled?: boolean | undefined
  /** A RAC filtra `title`; o wrapper aplica no elemento (motivo de botão morto). */
  title?: string | undefined
} & VariantProps<typeof buttonVariants>

function Button({
  className,
  variant = 'default',
  size = 'default',
  onClick,
  onPress,
  disabled,
  isDisabled,
  title,
  ...props
}: Omit<ButtonPrimitiveProps, 'className'> &
  React.RefAttributes<HTMLButtonElement> &
  ButtonExtraProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  // `title` não atravessa o filterDOMProps da RAC; aplicado direto no elemento.
  React.useEffect(() => {
    if (!ref.current) return
    if (title) ref.current.setAttribute('title', title)
    else ref.current.removeAttribute('title')
  }, [title])

  const dis = isDisabled ?? disabled
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...(dis !== undefined && { isDisabled: dis })}
      onPress={(e) => {
        onPress?.(e)
        onClick?.()
      }}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

function LinkButton({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: Omit<LinkPrimitiveProps, 'className'> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, LinkButton, buttonVariants }
