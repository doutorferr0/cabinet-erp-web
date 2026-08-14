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
  // `cursor-pointer` porque `<button>` nasce com `cursor: default` — o mesmo
  // ponteiro do texto morto ao lado. É a afirmação mais barata de "isto
  // responde ao clique", e é o que o operador confere sem pensar antes de
  // mirar. (Trazido da referência do neobrutalism.dev; a pele continua nossa.)
  // A `desabilitado` (index.css) traz o `cursor: not-allowed` e NÃO usa
  // `pointer-events: none` — a troca conserta uma armadilha: com
  // `pointer-events: none` o elemento não recebe evento de mouse NENHUM, e o
  // browser deixa de mostrar o `title` nativo. A barra de ações da DataTable
  // promete exatamente isso — "Motivo, no `title` do botão. Obrigatório na
  // prática quando `disabled`: botão morto e mudo faz o operador achar que é
  // defeito". A promessa não teria como ser cumprida. Não clicar continua
  // garantido pelo atributo `disabled`, que a RAC escreve de verdade.
  //
  // O que a `desabilitado` substituiu: `disabled:opacity-50
  // disabled:text-text-disabled`. Esta linha é a origem do defeito que o user
  // apontou — `Alterar`, `Consul.` e `Excluir` desabilitados sumiam na folha
  // clara. Agora ícone e rótulo ficam na tinta do tema e quem apaga é o fundo.
  'group/button desabilitado inline-flex shrink-0 cursor-pointer rounded-control items-center justify-center gap-1.5 whitespace-nowrap border-2 text-sm font-semibold outline-none select-none focus-visible:focus-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        default:
          'lift-control border-border bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'lift-control border-border bg-card hover:bg-muted',
        secondary: 'lift-control border-border bg-card hover:bg-muted',
        ghost: 'border-transparent transition-colors hover:bg-muted',
        destructive:
          // `text-destructive-foreground`, NUNCA `text-white` literal: no tema
          // escuro o vermelho clareia (L 42 → 70) e o branco em cima cai para
          // 2,82:1 — reprova AA no estado mais perigoso da interface. O token
          // vira escuro junto com o tema e devolve 6,24:1. Medido, e remedido
          // em 2026-08-13 depois de a bancada escura deixar de ser creme
          // (eram 6,29:1 contra o `40 12% 9%` antigo).
          'lift-control border-destructive bg-card text-destructive hover:bg-destructive hover:text-destructive-foreground',
        // Link cru (Utrecht): mono caps sublinhado 2px. O hover era amarelo,
        // que é o anel de foco: link sob o mouse ficava com a cara de link
        // focado, e os dois estados deixavam de se distinguir. Neutro é o tom
        // de hover de item desde a 1.5.
        link: 'border-transparent font-mono text-xs uppercase tracking-[0.07em] underline decoration-2 underline-offset-[3px] transition-colors hover:bg-neutral',
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
