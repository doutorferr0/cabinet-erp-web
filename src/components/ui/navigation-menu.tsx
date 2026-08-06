import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from 'lucide-react'
import type * as React from 'react'
import {
  Button as ButtonPrimitive,
  Link as LinkPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Toolbar as ToolbarPrimitive,
  type ToolbarProps as ToolbarPrimitiveProps,
  composeRenderProps,
} from 'react-aria-components'

/**
 * NAVIGATION MENU — a barra horizontal que leva a OUTRA TELA.
 *
 * Parece o `Menubar` e não é a mesma coisa; a diferença é o que o item faz:
 *
 * | | Menubar | NavigationMenu |
 * |---|---|---|
 * | item | executa um COMANDO (`onAction`) | vai para um LUGAR (`href`) |
 * | marco | `<div role="toolbar">` | `<nav>` com nome acessível |
 * | estado | não tem "atual" | tem: `aria-current="page"` |
 *
 * Misturar os dois é o erro comum: navegação que dispara ação surpreende quem
 * abriu em outra aba, e comando disfarçado de link mente sobre o botão direito
 * do mouse. Por isso são dois arquivos e não um com `variant`.
 *
 * **Integração com o roteador:** os itens saem em `<a href>` de verdade. Sob o
 * TanStack Router isso é navegação de página inteira, com recarga — para
 * navegação interna, ou se instala o `RouterProvider` da `react-aria-components`
 * (que faz `href` virar navegação do roteador em todo o app), ou se passa o
 * `Link` do roteador como filho. Enquanto o `RouterProvider` não estiver
 * montado, este componente serve para destino EXTERNO e para o app que quiser
 * recarga honesta; a sidebar continua sendo a navegação interna.
 */

function NavigationMenu({
  className,
  'aria-label': ariaLabel = 'Navegação principal',
  ...props
}: Omit<ToolbarPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    // `<nav>` por fora do `Toolbar`: o marco é o que o leitor de tela usa para
    // pular direto para a navegação, e toolbar não é marco. O rótulo é
    // obrigatório porque uma página pode ter mais de uma navegação.
    <nav data-slot="navigation-menu" aria-label={ariaLabel}>
      <ToolbarPrimitive
        orientation="horizontal"
        className={composeRenderProps(className, (className) =>
          cn('flex items-center gap-0.5', className),
        )}
        {...props}
      />
    </nav>
  )
}

/** Destino direto, sem lista: o item folha da barra. */
function NavigationMenuLink({
  className,
  isCurrent,
  ...props
}: Omit<React.ComponentProps<typeof LinkPrimitive>, 'className'> & {
  className?: string
  /** Marca a tela em que o operador está. Vira `aria-current="page"`. */
  isCurrent?: boolean
}) {
  return (
    <LinkPrimitive
      data-slot="navigation-menu-link"
      {...(isCurrent && { 'aria-current': 'page' })}
      className={composeRenderProps(className, (className) =>
        cn(
          'rounded-item px-2.5 py-1 font-semibold text-sm no-underline outline-none transition-colors',
          'hover:bg-neutral data-pressed:bg-neutral',
          // A tela ATUAL é violeta cheio, o mesmo sinal do item de menu ativo
          // na sidebar. `aria-current` carrega o estado para quem não vê a cor.
          'aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground',
          'focus-visible:focus-ring',
          'data-disabled:pointer-events-none data-disabled:opacity-50',
          className,
        ),
      )}
      {...props}
    />
  )
}

/** Grupo com lista de destinos. Envolve gatilho e conteúdo. */
function NavigationMenuGroup({ ...props }: React.ComponentProps<typeof MenuTriggerPrimitive>) {
  return <MenuTriggerPrimitive data-slot="navigation-menu-group" {...props} />
}

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <ButtonPrimitive
      data-slot="navigation-menu-trigger"
      className={composeRenderProps(className, (className) =>
        cn(
          'group/navigation-menu-trigger flex items-center gap-1 rounded-item px-2.5 py-1 font-semibold text-sm outline-none transition-colors',
          'hover:bg-neutral data-pressed:bg-neutral',
          'aria-expanded:bg-primary aria-expanded:text-primary-foreground',
          'focus-visible:focus-ring',
          'data-disabled:pointer-events-none data-disabled:opacity-50',
          className,
        ),
      )}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <ChevronDownIcon className="size-3.5 shrink-0 transition-transform duration-150 group-aria-expanded/navigation-menu-trigger:rotate-180" />
        </>
      ))}
    </ButtonPrimitive>
  )
}

function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof DropdownMenu>) {
  return (
    <DropdownMenu
      data-slot="navigation-menu-content"
      className={cn('w-auto min-w-48', className)}
      {...props}
    />
  )
}

export {
  NavigationMenu,
  NavigationMenuLink,
  NavigationMenuGroup,
  NavigationMenuTrigger,
  NavigationMenuContent,
  // O destino DENTRO da lista é um item de menu com `href` — a RAC o renderiza
  // como `<a>`, então continua sendo link para o botão direito e para o teclado.
  DropdownMenuItem as NavigationMenuItem,
  DropdownMenuSeparator as NavigationMenuSeparator,
}
