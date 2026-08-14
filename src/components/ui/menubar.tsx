import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type * as React from 'react'
import {
  Button as ButtonPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Toolbar as ToolbarPrimitive,
  type ToolbarProps as ToolbarPrimitiveProps,
  composeRenderProps,
} from 'react-aria-components'

/**
 * MENUBAR — a barra de comandos do topo, no formato que o operador de ERP
 * conhece do sistema de desktop: `Arquivo · Editar · Relatórios`, cada um
 * abrindo sua lista.
 *
 * **É `Toolbar` com botões de menu, não `role="menubar"`.** A diferença
 * importa e é decisão consciente:
 *
 * - a `react-aria-components` não tem menubar, e o padrão exige gerência de
 *   foco própria (setas trocam de menu com o menu ABERTO, Home/End, digitação
 *   que salta para a inicial). Escrever isso à mão é reescrever a metade
 *   difícil de uma biblioteca de acessibilidade;
 * - `role="menubar"` mal implementado é PIOR que não usá-lo: o leitor de tela
 *   entra em modo de aplicação, para de anunciar como navegação e passa a
 *   esperar um teclado que a implementação não tem.
 *
 * `Toolbar` entrega setas entre os botões, um único ponto de tabulação e
 * anúncio honesto do que a barra é. Cada botão abre o mesmo menu do resto do
 * sistema (`DropdownMenu`), então item, submenu, separador e atalho são os
 * MESMOS componentes — barra de comandos não é motivo para ter um segundo
 * menu com regras próprias.
 *
 * **Atalhos:** a decisão de 30/07/2026 vale aqui — nenhum fluxo depende de
 * tecla memorizada. `MenubarShortcut` só ANUNCIA um atalho que já exista em
 * `src/lib/shortcuts.ts`; escrever um rótulo de tecla que não está registrado
 * ali é prometer ao operador algo que não acontece.
 */

function Menubar({
  className,
  ...props
}: Omit<ToolbarPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <ToolbarPrimitive
      data-slot="menubar"
      orientation="horizontal"
      className={composeRenderProps(className, (className) =>
        cn('flex items-center gap-0.5 rounded-data border-2 border-border bg-card p-1', className),
      )}
      {...props}
    />
  )
}

/** Um menu da barra: envolve o gatilho e o conteúdo, como o `DropdownMenu`. */
function MenubarMenu({ ...props }: React.ComponentProps<typeof MenuTriggerPrimitive>) {
  return <MenuTriggerPrimitive data-slot="menubar-menu" {...props} />
}

function MenubarTrigger({
  className,
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, 'className'> & {
  className?: string
}) {
  return (
    <ButtonPrimitive
      data-slot="menubar-trigger"
      className={composeRenderProps(className, (className) =>
        cn(
          // ITEM (raio 0): os gatilhos encostam uns nos outros na barra.
          // Não levanta no hover pelo mesmo motivo — lift é de peça solta.
          'cursor-pointer rounded-item px-2.5 py-1 font-semibold text-sm outline-none transition-colors',
          'hover:bg-neutral data-pressed:bg-neutral',
          // Menu ABERTO = violeta, a cor do que está ativo (§Acentos). É o
          // mesmo sinal da aba ativa e do item de menu ativo.
          'aria-expanded:bg-primary aria-expanded:text-primary-foreground',
          'focus-visible:focus-ring',
          'desabilitado data-disabled:pointer-events-none',
          className,
        ),
      )}
      {...props}
    />
  )
}

/**
 * O conteúdo é o menu do sistema. `placement` desce do gatilho e alinha à
 * esquerda dele, que é onde o olho já está depois do clique.
 */
function MenubarContent({ className, ...props }: React.ComponentProps<typeof DropdownMenu>) {
  return (
    <DropdownMenu
      data-slot="menubar-content"
      // Sem `w-(--trigger-width)`: o gatilho da barra é curto ("Arquivo") e o
      // menu precisa caber o rótulo mais longo que ele contém.
      className={cn('w-auto min-w-44', className)}
      {...props}
    />
  )
}

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  DropdownMenuItem as MenubarItem,
  DropdownMenuGroup as MenubarGroup,
  DropdownMenuLabel as MenubarLabel,
  DropdownMenuSeparator as MenubarSeparator,
  DropdownMenuShortcut as MenubarShortcut,
  DropdownMenuSub as MenubarSub,
  DropdownMenuSubTrigger as MenubarSubTrigger,
  DropdownMenuSubContent as MenubarSubContent,
}
