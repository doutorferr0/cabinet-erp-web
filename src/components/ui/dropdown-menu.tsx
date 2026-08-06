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

/** Menu brut: folha opaca, caixa preta 2px, sombra dura 3px, item focado = Bancada. */
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
        'z-50 w-(--trigger-width) min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-card border-2 border-border bg-popover p-1 text-popover-foreground pop-spring shadow-el3 outline-none data-exiting:overflow-hidden',
        className,
      )}
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
      className={cn(
        'px-1.5 py-1 font-mono text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase data-inset:pl-7',
        className,
      )}
      {...props}
    />
  )
}

const dropdownMenuItemVariants = cva(
  'group/dropdown-menu-item relative flex cursor-default items-center rounded-item outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      selectionMode: {
        none: 'gap-1.5 px-1.5 py-1 text-sm focus:bg-muted data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive data-[variant=destructive]:focus:text-white [&_svg:not([class*="size-"])]:size-4',
        single:
          'gap-1.5 py-1 pr-8 pl-1.5 text-sm focus:bg-muted data-inset:pl-7 [&_svg:not([class*="size-"])]:size-4',
        multiple:
          'gap-1.5 py-1 pr-8 pl-1.5 text-sm focus:bg-muted data-inset:pl-7 [&_svg:not([class*="size-"])]:size-4',
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
        'flex cursor-default items-center gap-1.5 px-1.5 py-1 text-sm outline-hidden select-none focus:bg-muted data-inset:pl-7 data-open:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
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
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
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
