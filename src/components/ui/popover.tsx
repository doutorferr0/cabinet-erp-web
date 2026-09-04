import { cn } from '@/lib/utils'
import type * as React from 'react'
import {
  DialogTrigger,
  type DialogTriggerProps,
  Heading,
  Popover as PopoverPrimitive,
  type PopoverProps as PopoverPrimitiveProps,
} from 'react-aria-components'

function PopoverTrigger({ children, ...props }: DialogTriggerProps) {
  return (
    <DialogTrigger data-slot="popover-trigger" {...props}>
      {children}
    </DialogTrigger>
  )
}

/**
 * TRAÇO DE FOLHA — a borda de uma peça que POUSA sobre a página.
 *
 * Vale para popover e menu suspenso (`dropdown-menu.tsx` importa daqui): a
 * régua §Hierarquia da 2.0 separa "objeto do plano" com `n-300` + `--hard-soft`,
 * e reserva a caixa preta 1.5px + sombra de tinta para o que é PÁGINA (KPI,
 * painel, tecla). Menu com moldura de painel gritava do mesmo tamanho que o
 * conteúdo por baixo dele.
 *
 * **Por que `style` e não `border-*`.** O `index.css` tem `* { border-color }`
 * FORA de camada, e regra sem camada vence toda a `@layer utilities` — a nota
 * do próprio arquivo mede isso: nenhuma utility de cor de borda deste repo
 * pinta. Inline é o único lugar de onde a cor sai preta.
 *
 * Sem fallback de propósito: `--n-300` e `--hard-soft` vêm de
 * `styles/tokens-2.0.css`, que a fundação da rodada já importa no `index.css`
 * nos DOIS temas. Um `var(--n-300, …)` aqui seria um segundo valor que ninguém
 * mais alcança — e que sobreviveria calado se o import saísse.
 */
export const TRACO_DE_FOLHA = { borderColor: 'var(--n-300)' } as const

/** Relevo de peça que pousa: `--hard-soft` (3px de n-300), sem tinta. */
export const RELEVO_DE_FOLHA = { boxShadow: 'var(--hard-soft)' } as const

/** Popover 2.0: folha, filete n-300, relevo `--hard-soft`, raio de card. */
function Popover({
  className,
  placement = 'bottom',
  offset = 4,
  crossOffset = 0,
  ...props
}: Omit<PopoverPrimitiveProps, 'className'> & {
  className?: string
}) {
  return (
    <PopoverPrimitive
      data-slot="popover-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        'z-50 flex w-72 origin-(--trigger-anchor-point) flex-col gap-3 rounded-card border bg-popover p-3 t-corpo text-popover-foreground pop-spring outline-hidden',
        className,
      )}
      style={{ ...TRACO_DE_FOLHA, ...RELEVO_DE_FOLHA }}
      {...props}
    />
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="popover-header" className={cn('flex flex-col gap-1', className)} {...props} />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<typeof Heading>) {
  // `t-bloco` e não `t-secao`: popover é peça pousada, não tela própria — a
  // régua dá no máximo dois Gambarinos por tela e o título da página já gastou
  // um. Título de popover é título de BLOCO (Inter 600), como o de um card.
  return <Heading data-slot="popover-title" className={cn('t-bloco', className)} {...props} />
}

function PopoverDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="popover-description" className={cn('t-meta', className)} {...props} />
}

export { Popover, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger }
