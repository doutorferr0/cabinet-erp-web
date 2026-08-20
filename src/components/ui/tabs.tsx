import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import type * as React from 'react'
import {
  TabList as TabListPrimitive,
  TabPanel as TabPanelPrimitive,
  Tab as TabPrimitive,
  Tabs as TabsPrimitive,
} from 'react-aria-components'

/** Compat shadcn→RAC: `defaultValue`/`value` viram `defaultSelectedKey`/`selectedKey`. */
function Tabs({
  className,
  defaultValue,
  value,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive> & {
  defaultValue?: string | undefined
  value?: string | undefined
  onValueChange?: ((value: string) => void) | undefined
}) {
  return (
    <TabsPrimitive
      data-slot="tabs"
      // RAC marca a orientação em `data-orientation` (não em `data-horizontal`):
      // com o atalho errado a tira de abas caía ao LADO do painel, em coluna.
      className={cn('group/tabs flex gap-3 data-[orientation=horizontal]:flex-col', className)}
      {...(defaultValue !== undefined && { defaultSelectedKey: defaultValue })}
      {...(value !== undefined && { selectedKey: value })}
      {...(onValueChange !== undefined && {
        onSelectionChange: (key: React.Key) => onValueChange(String(key)),
      })}
      {...props}
    />
  )
}

/** FUSÃO v5 r3: a tira de abas vira PILL DE VIDRO (mockup v5) — cartão
 *  translúcido com desfoque, abas dentro; a ativa segue Tinta sólida com
 *  sombra de decisão. Supersede a régua inferior de 2px. */
const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center gap-1 rounded-control border-2 border-border bg-card/70 p-1 backdrop-blur-md text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
  {
    variants: {
      variant: {
        default: '',
        line: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabListPrimitive> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabListPrimitive
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  ...props
}: React.ComponentProps<typeof TabPrimitive> & { value?: string | undefined }) {
  return (
    <TabPrimitive
      data-slot="tabs-trigger"
      {...(value !== undefined && { id: value })}
      className={cn(
        // §3b lista a aba junto do chip clicável: ela PULA no hover e afunda no
        // press, como o resto dos controles. Era `cursor-default`, que é o
        // ponteiro do texto morto — aba é controle.
        //
        // A borda de 2px já existe TRANSPARENTE em repouso: ela só aparece no
        // hover e na aba selecionada, e reservar o espaço desde o começo evita
        // que a fileira inteira ande 2px quando o mouse passa. Selecionada é
        // violeta cheio COM traço de Tinta (Regra da Caixa Preta) — do staging
        // `neobrutalism-aria`, com `shadow-sm` traduzido para a escada de
        // elevação do sistema (quente até 2026-08-12, neutra-fria desde a troca
        // das superfícies — a escada é a mesma, a matiz é que mudou).
        'lift-flat desabilitado inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-item border-2 border-transparent px-3 text-sm font-semibold whitespace-nowrap outline-none hover:border-border hover:text-foreground focus-visible:focus-ring data-[disabled]:pointer-events-none data-selected:border-border data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-el2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<typeof TabPanelPrimitive> & { value?: string | undefined }) {
  return (
    <TabPanelPrimitive
      data-slot="tabs-content"
      {...(value !== undefined && { id: value })}
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
