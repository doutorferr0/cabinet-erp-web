import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import type * as React from 'react'
import { Group, type GroupProps } from 'react-aria-components'

/**
 * Grupo campo+adorno: o SULCO fica no grupo, o campo interno é cru.
 *
 * Reface 2.0 (#470): a caixa preta de 2px virou a mesma borda 1px de controle
 * do `Input`, com `--inset` — grupo e campo solto passam a fechar a mesma linha
 * de 34px, com a mesma profundidade. O foco vem da receita única do repo, pelo
 * `:has()` do controle de dentro.
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
        'group/input-group desabilitado relative flex h-[34px] w-full min-w-0 items-center rounded-[var(--r-ctrl)] border border-[color:var(--n-300)] bg-[color:var(--n-0)] shadow-[var(--inset)] transition-colors outline-none has-[[data-slot=input-group-control]:focus-visible]:border-[color:var(--n-900)] has-[[data-slot=input-group-control]:focus-visible]:focus-ring has-[[data-slot][aria-invalid=true]]:border-[color:var(--bad)] has-[>textarea]:h-auto',
        className,
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  // Prefixo/sufixo em MONO n-500 (`.t-dado-meta`): o adorno costuma carregar
  // unidade, sigla ou moeda — coisa que se compara com o valor ao lado, não
  // texto de leitura. O degrau já traz a cor terciária; o `!` devolve a tinta
  // cheia quando o grupo está desabilitado, porque `.t-dado-meta` mora fora de
  // camada e venceria o `text-*` do Tailwind (ver nota em `button.tsx`).
  'flex h-auto cursor-text items-center justify-center gap-2 py-1.5 select-none t-dado-meta group-data-[disabled=true]/input-group:text-[color:var(--n-900)]! [&>svg:not([class*="size-"])]:size-[15px]',
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
        't-dado-meta flex items-center gap-2 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-[15px]',
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
        // O sulco e a borda moram no GRUPO; o campo de dentro é cru — duas
        // molduras encostadas na mesma fronteira é a proibição do §Hierarquia.
        //
        // O `!` no foco não é excesso: `focus-ring` é `@utility` declarada no
        // fim do `index.css` e vence, por ordem de documento, qualquer
        // `outline-none` de utility core. Sem ele o campo desenharia o anel
        // POR DENTRO do anel que o grupo já desenha — dois halos concêntricos
        // no mesmo foco.
        'h-full flex-1 border-0 bg-transparent shadow-none ring-0 focus-visible:shadow-none! focus-visible:ring-0 focus-visible:outline-none! disabled:bg-transparent aria-invalid:ring-0',
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
        'flex-1 resize-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:shadow-none! focus-visible:ring-0 focus-visible:outline-none! disabled:bg-transparent aria-invalid:ring-0',
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
