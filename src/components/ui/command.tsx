import type { Modulo } from '@/app/modulo'
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
      className={cn('top-1/3 w-full translate-y-0 overflow-hidden p-0 sm:max-w-xl', className)}
      // A FOLHA DA BUSCA — 1.5px de tinta e `--hard-3`, o degrau que a 2.0
      // reserva para modal e popover. O `Dialog` genérico traz `border-2` e
      // `shadow-el5` (8px): a paleta é a peça que mais aparece no dia do
      // usuário avançado e não pode ser a mais pesada da escada.
      //
      // Inline porque as duas propriedades brigam com utilities: a espessura
      // com o `border-2` do próprio Dialog (mesma camada, ordem de geração
      // decide) e a sombra com `shadow-el5`. `esc` e clique fora já fecham —
      // `isDismissable` é do Dialog, não desta folha.
      style={{ borderWidth: '1.5px', boxShadow: 'var(--hard-3)' }}
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

/**
 * A linha de digitar: 40px, SEM caixa própria, hairline separando do corpo.
 *
 * O campo não é um controle solto dentro da folha — ele é o cabeçalho dela, e
 * a régua §Hierarquia manda separar header de corpo com UMA hairline. A caixa
 * de input (borda + inset) somada à borda da folha punha duas molduras a 4px
 * uma da outra, e o olho lia duas peças onde há uma.
 */
function CommandInput({ className, ...props }: InputProps) {
  return (
    <SearchField
      autoFocus
      aria-label={props.placeholder || 'Busca'}
      data-slot="command-input-wrapper"
      className="flex h-10 items-center border-b px-3"
      // Hairline n-200 inline pelo mesmo motivo do `TRACO_DE_FOLHA`: o
      // `* { border-color }` do `index.css` mora fora de camada e apaga toda
      // utility de cor de borda — sem isto o filete sai preto, com a mesma
      // força da moldura da folha, e a régua proíbe duas linhas fortes na
      // mesma fronteira.
      style={{ borderBottomColor: 'var(--n-200)' }}
    >
      <InputGroup className="border-0 bg-transparent px-0 shadow-none ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
        <Input
          {...props}
          data-slot="command-input"
          className={cn(
            'desabilitado w-full bg-transparent t-corpo outline-hidden [&::-webkit-search-cancel-button]:hidden',
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
      className={cn('py-6 text-center t-meta', className)}
      {...props}
    />
  )
}

/**
 * Grupo com QUADRADINHO DE COR — o mesmo sinal que a barra lateral usa.
 *
 * `modulo` pinta um quadrado de 7px na cor do módulo, à esquerda do rótulo. É
 * a peça que faz a lista longa da paleta ser lida por bloco em vez de linha a
 * linha: quem procura uma tela de Compras acha o indigo antes de ler qualquer
 * nome. A cor sai de `[data-modulo]` no próprio cabeçalho, como no resto do
 * sistema — nenhuma cor nova é decidida aqui.
 *
 * **Cor no rótulo, nunca na linha de dado** (regra 7 da rodada): o quadradinho
 * fica no cabeçalho do grupo e os itens seguem em tinta. Grupo sem `modulo`
 * (Recentes, Ações, resultados do servidor) não ganha quadrado — ausência é
 * informação, e um quadrado neutro diria "módulo cinza".
 */
function CommandGroup<T extends object>({
  className,
  children,
  items,
  heading,
  modulo,
  ...props
}: MenuSectionProps<T> & { heading?: string; modulo?: Modulo }) {
  return (
    <MenuSection
      data-slot="command-group"
      className={cn('overflow-hidden p-1 text-foreground', className)}
      {...props}
    >
      {heading && (
        <Header
          className="flex h-7 items-center gap-2 px-2 t-rotulo"
          {...(modulo && { 'data-modulo': modulo })}
        >
          {modulo && (
            <span
              aria-hidden="true"
              data-slot="command-group-cor"
              className="size-[7px] shrink-0 rounded-data bg-modulo-cheia"
            />
          )}
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
        // `min-h-8` e não `h-8`: o item da paleta pode ter duas linhas (nome do
        // registro + subtítulo), e altura fixa cortaria a segunda.
        'group/command-item relative flex min-h-8 cursor-default items-center gap-2 rounded-item px-2 t-ui outline-hidden select-none desabilitado data-focused:bg-muted data-disabled:pointer-events-none data-selected:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
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

/**
 * O CAMINHO do item, à direita do rótulo e antes do atalho.
 *
 * Diz ONDE a tela mora (`Compras › Ordens`) e é o que separa dois destinos de
 * nome parecido — "Pedidos" existe em Compras e em Vendas, e sem o caminho a
 * paleta oferece duas linhas idênticas. Fica em `t-meta` (n-500) porque é
 * contexto, não o rótulo que se procura.
 */
function CommandCaminho({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-caminho"
      className={cn('ml-auto hidden shrink-0 truncate t-meta sm:block', className)}
      {...props}
    />
  )
}

/**
 * O atalho, no fim da linha — MONO, porque é o que se compara com a tecla.
 *
 * NÃO traz `ml-auto`: quem empurra para a direita é o `CommandCaminho`, e dois
 * `ml-auto` na mesma linha disputariam a sobra, deixando o atalho no meio.
 * Item sem caminho passa `className="ml-auto"` — é uma linha a mais na chamada
 * e uma regra a menos aqui.
 */
function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('shrink-0 t-dado-meta tracking-widest', className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandCaminho,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
