import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import { CheckIcon, SearchIcon } from 'lucide-react'
import type * as React from 'react'
import {
  Autocomplete,
  type AutocompleteProps,
  Collection,
  Header,
  Input,
  type InputProps,
  Menu,
  MenuItem,
  type MenuItemProps,
  type MenuProps,
  MenuSection,
  type MenuSectionProps,
  SearchField,
  Separator,
  type SeparatorProps,
  composeRenderProps,
  useFilter,
} from 'react-aria-components'

/**
 * Command sobre RAC Autocomplete+Menu (o cmdk saiu com a base aria).
 * A superfície de composição (Command/Input/List/Empty/Item) é a mesma.
 */
function Command({
  className,
  dir,
  style,
  ...props
}: Omit<AutocompleteProps, 'className' | 'style'> & {
  className?: string
  dir?: React.HTMLAttributes<HTMLDivElement>['dir']
  style?: React.CSSProperties
}) {
  const { contains } = useFilter({ sensitivity: 'base' })
  return (
    <div
      data-slot="command"
      dir={dir}
      className={cn(
        'flex size-full flex-col overflow-hidden bg-popover text-popover-foreground',
        className,
      )}
      style={style}
    >
      <Autocomplete {...props} filter={props.filter || contains}>
        {props.children}
      </Autocomplete>
    </div>
  )
}

function CommandDialog({
  title = 'Busca',
  description = 'Digite para buscar…',
  children,
  open,
  onOpenChange,
  className,
  showCloseButton = false,
  ...props
}: Omit<
  React.ComponentProps<typeof Dialog>,
  'children' | 'className' | 'isOpen' | 'onOpenChange'
> & {
  title?: string
  description?: string
  open?: boolean
  onOpenChange?: (isOpen: boolean) => void
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog
      {...(open !== undefined && { isOpen: open })}
      {...(onOpenChange !== undefined && { onOpenChange })}
      className={cn('top-1/3 translate-y-0 overflow-hidden p-0', className)}
      showCloseButton={showCloseButton}
      isDismissable
      {...props}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </Dialog>
  )
}

function CommandInput({ className, ...props }: InputProps) {
  return (
    <SearchField
      autoFocus
      aria-label={props.placeholder || 'Busca'}
      data-slot="command-input-wrapper"
      className="border-b-2 border-border p-1"
    >
      <InputGroup className="border-0 ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
        <Input
          {...props}
          data-slot="command-input"
          className={cn(
            'desabilitado w-full text-sm outline-hidden [&::-webkit-search-cancel-button]:hidden',
            className,
          )}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        </InputGroupAddon>
      </InputGroup>
    </SearchField>
  )
}

function CommandList<T extends object>({ className, ...props }: MenuProps<T>) {
  return (
    <Menu
      {...props}
      data-slot="command-list"
      className={cn(
        'max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto p-1 outline-none',
        className,
      )}
    />
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="command-empty"
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function CommandGroup<T extends object>({
  className,
  children,
  items,
  heading,
  ...props
}: MenuSectionProps<T> & { heading?: string }) {
  return (
    <MenuSection
      data-slot="command-group"
      className={cn('overflow-hidden p-1 text-foreground', className)}
      {...props}
    >
      {heading && (
        <Header className="px-2 py-1.5 font-mono text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          {heading}
        </Header>
      )}
      <Collection {...(items !== undefined && { items })}>{children}</Collection>
    </MenuSection>
  )
}

function CommandSeparator({ className, ...props }: SeparatorProps) {
  return (
    <Separator
      data-slot="command-separator"
      className={cn('-mx-1 h-px bg-rule-hair', className)}
      {...props}
    />
  )
}

function CommandItem<T extends object>({
  className,
  children,
  textValue,
  ...props
}: MenuItemProps<T>) {
  return (
    <MenuItem
      {...props}
      data-slot="command-item"
      className={cn(
        // RAC marca estado sem valor (`data-disabled`, não `data-disabled="true"`).
        'group/command-item relative flex cursor-default items-center gap-2 px-2 py-1.5 text-sm outline-hidden select-none desabilitado data-focused:bg-muted data-disabled:pointer-events-none data-selected:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      {...(() => {
        const tv = textValue || (typeof children === 'string' ? children : undefined)
        return tv !== undefined ? { textValue: tv } : {}
      })()}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <CheckIcon className="ml-auto opacity-0 group-data-selected/command-item:opacity-100" />
        </>
      ))}
    </MenuItem>
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
