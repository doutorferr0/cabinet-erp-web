import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import type * as React from 'react'
import { Group, type GroupProps } from 'react-aria-components'

/**
 * Grupo campo+adorno: a caixa preta 2px fica no grupo, o campo interno é cru.
 *
 * Desabilitado (§Desabilitado): a caixa do grupo é que apaga. A receita entra
 * pelo gatilho `:has(:disabled)` — quem está desabilitado é o campo de DENTRO,
 * não o grupo. Era `has-disabled:opacity-50`, que clareava o grupo INTEIRO,
 * adorno e valor digitado junto.
 */
function InputGroup({ className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="input-group"
      className={cn(
        'group/input-group desabilitado relative flex h-9 w-full min-w-0 items-center rounded-control border-2 border-input bg-card transition-colors outline-none has-[[data-slot=input-group-control]:focus-visible]:focus-ring has-[[data-slot][aria-invalid=true]]:border-destructive has-[>textarea]:h-auto',
        className,
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  // Adorno com o grupo desabilitado ESCURECE (secundário → tinta cheia) em vez
  // de clarear: sobre a superfície apagada o secundário perderia contraste, e é
  // ele que costuma carregar a unidade ou o prefixo do campo.
  'flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:text-foreground [&>svg:not([class*="size-"])]:size-4',
  {
    variants: {
      align: {
        'inline-start': 'order-first pl-2',
        'inline-end': 'order-last pr-2',
        'block-start': 'order-first w-full justify-start px-2.5 pt-2',
        'block-end': 'order-last w-full justify-start px-2.5 pb-2',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
)

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus()
      }}
      {...props}
    />
  )
}

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'icon-sm',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'type'> & {
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'flex-1 border-0 bg-transparent ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        'flex-1 resize-none border-0 bg-transparent py-2 ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
        className,
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
