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
 * Botão da fase 1.5 (DESIGN.md §Button): traço 2px, raio de CONTROLE, foco pela
 * `focus-ring`, e o lift pela `lift-control` — repousa em `el-2`, levanta no
 * hover, afunda no press. A sombra literal que o primário carregava
 * (`shadow-[3px_3px_0_hsl(38_14%_74%)]`) saiu: era o valor da fundação preta,
 * escrito à mão, e a recalibração de tokens prevista não o alcançaria.
 *
 * `ghost` e `link` NÃO levantam, e não é esquecimento: lift é o movimento de
 * uma peça que tem caixa e sombra. Os dois são texto — um sobre hover de
 * fundo, o outro sublinhado. Levantar texto sem caixa não lê como elevação,
 * lê como tremor.
 */
const buttonVariants = cva(
  'group/button inline-flex shrink-0 rounded-control items-center justify-center gap-1.5 whitespace-nowrap border-2 text-sm font-semibold outline-none select-none focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        default:
          'lift-control border-border bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'lift-control border-border bg-card hover:bg-muted',
        secondary: 'lift-control border-border bg-card hover:bg-muted',
        ghost: 'border-transparent transition-colors hover:bg-muted',
        destructive:
          'lift-control border-destructive bg-card text-destructive hover:bg-destructive hover:text-white',
        // Link cru (Utrecht): mono caps sublinhado 2px. O fundo do hover ainda
        // é amarelo — reatribuir esse emprego é decisão de cor, e cor é a 1.6.
        link: 'border-transparent font-mono text-xs uppercase tracking-[0.07em] underline decoration-2 underline-offset-[3px] transition-colors hover:bg-anchor',
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
