import { RELEVO_DE_FOLHA, TRACO_DE_FOLHA } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import type * as React from 'react'
import {
  Header as HeaderPrimitive,
  MenuItem as MenuItemPrimitive,
  type MenuItemProps as MenuItemPrimitiveProps,
  Menu as MenuPrimitive,
  MenuSection as MenuSectionPrimitive,
  type MenuSectionProps as MenuSectionPrimitiveProps,
  MenuTrigger as MenuTriggerPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
  SubmenuTrigger as SubmenuTriggerPrimitive,
  composeRenderProps,
} from 'react-aria-components'

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof MenuTriggerPrimitive>) {
  return <MenuTriggerPrimitive data-slot="dropdown-menu-trigger" {...props} />
}

/**
 * Menu 2.0: folha, filete `n-300`, relevo `--hard-soft`, raio de card.
 *
 * Mesma moldura do popover e pelo MESMO motivo — os dois pousam sobre a página
 * e não são a página. A borda e o relevo vêm de `popover.tsx` (`TRACO_DE_FOLHA`
 * / `RELEVO_DE_FOLHA`) em vez de repetidos aqui: duas cópias do mesmo filete
 * divergem na primeira vez que alguém ajusta um dos dois.
 */
function DropdownMenu({
  'data-slot': dataSlot = 'dropdown-menu-content',
  placement = 'bottom start',
  offset = 4,
  crossOffset = 0,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof MenuPrimitive<object>>, 'children' | 'className'> &
  Pick<React.ComponentProps<typeof PopoverPrimitive>, 'placement' | 'offset' | 'crossOffset'> & {
    'data-slot'?: string
    className?: string
    children?: React.ReactNode
  }) {
  return (
    <PopoverPrimitive
      data-slot={dataSlot}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        'z-50 w-(--trigger-width) min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-card border bg-popover p-1 text-popover-foreground pop-spring outline-none data-exiting:overflow-hidden',
        className,
      )}
      style={{ ...TRACO_DE_FOLHA, ...RELEVO_DE_FOLHA }}
    >
      <MenuPrimitive
        className="max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden"
        {...props}
      >
        {children}
      </MenuPrimitive>
    </PopoverPrimitive>
  )
}

function DropdownMenuGroup({
  ...props
}: Omit<MenuSectionPrimitiveProps<object>, 'children'> & {
  children?: React.ReactNode
}) {
  return <MenuSectionPrimitive data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof HeaderPrimitive> & {
  inset?: boolean
}) {
  return (
    <HeaderPrimitive
      data-slot="dropdown-menu-label"
      data-inset={inset}
      // `t-rotulo` é a régua: Inter 600 uppercase com tracking, NÃO mono — a
      // 2.0 reserva mono para dado que se copia, compara ou soma, e cabeçalho
      // de grupo é rótulo. Antes era `font-mono`, que dizia "isto é dado".
      className={cn('px-1.5 py-1 t-rotulo data-inset:pl-7', className)}
      {...props}
    />
  )
}

/**
 * Item de 32px — a altura da régua §Hierarquia para linha de menu.
 *
 * `h-8` e não `py-1`: com padding, a altura seguia a fonte, e o item mudava de
 * tamanho entre um rótulo com ícone e um sem. A régua mede a LINHA, não o
 * conteúdo, e é isso que faz uma pilha de itens ter ritmo.
 *
 * O destrutivo fica em `text-destructive`, que é o consumidor 1.x do vermelho
 * de estado. A 2.0 o chama `--bad` e a D1 aliasa os nomes antigos para a escala
 * nova — se aquele alias não incluir `--destructive`, é aqui que se troca, num
 * lugar só.
 */
const dropdownMenuItemVariants = cva(
  'group/dropdown-menu-item desabilitado relative flex cursor-default items-center rounded-item outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      selectionMode: {
        none: 'h-8 gap-2 px-2 t-ui focus:bg-muted data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive data-[variant=destructive]:focus:text-destructive-foreground [&_svg:not([class*="size-"])]:size-4',
        single:
          'h-8 gap-2 pr-8 pl-2 t-ui focus:bg-muted data-inset:pl-7 [&_svg:not([class*="size-"])]:size-4',
        multiple:
          'h-8 gap-2 pr-8 pl-2 t-ui focus:bg-muted data-inset:pl-7 [&_svg:not([class*="size-"])]:size-4',
      },
    },
  },
)

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      {...(() => {
        const tv = typeof children === 'string' ? children : props.textValue
        return tv !== undefined ? { textValue: tv } : {}
      })()}
      className={composeRenderProps(className, (className, { selectionMode }) =>
        cn(dropdownMenuItemVariants({ selectionMode }), className),
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, selectionMode }) => (
        <>
          {selectionMode !== 'none' ? (
            <span
              className="pointer-events-none absolute right-2 flex items-center justify-center"
              data-slot={
                selectionMode === 'single'
                  ? 'dropdown-menu-radio-item-indicator'
                  : 'dropdown-menu-checkbox-item-indicator'
              }
            >
              {isSelected ? <CheckIcon /> : null}
            </span>
          ) : null}
          {children}
        </>
      ))}
    </MenuItemPrimitive>
  )
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof SubmenuTriggerPrimitive>) {
  return <SubmenuTriggerPrimitive data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      {...(() => {
        const tv = typeof children === 'string' ? children : props.textValue
        return tv !== undefined ? { textValue: tv } : {}
      })()}
      className={cn(
        'flex h-8 cursor-default items-center gap-2 px-2 t-ui outline-hidden select-none focus:bg-muted data-inset:pl-7 data-open:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <ChevronRightIcon className="ml-auto" />
        </>
      ))}
    </MenuItemPrimitive>
  )
}

function DropdownMenuSubContent({
  placement = 'end top',
  crossOffset = -3,
  offset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenu>) {
  return (
    <DropdownMenu
      data-slot="dropdown-menu-sub-content"
      className={cn('w-auto min-w-[96px]', className)}
      placement={placement}
      crossOffset={crossOffset}
      offset={offset}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-rule-hair', className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ml-auto t-dado-meta tracking-widest', className)}
      {...props}
    />
  )
}

export {
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
