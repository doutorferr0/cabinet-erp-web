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

/**
 * ABA = LINHA INFERIOR (Reface 2.0, issue #470 · Polaris/Shopify).
 *
 * Supersede as duas formas anteriores: a régua de 2px da 1.5 e o pill de vidro
 * da fusão v5. A tira agora é uma faixa com UMA hairline embaixo (n-200) e a
 * aba ativa marca a si mesma com um traço de 2px em tinta, comendo essa
 * hairline — uma ferramenta de separação por fronteira, que é a lei do
 * §Hierarquia. O pill de vidro punha borda 2px + fundo translúcido + desfoque +
 * sombra na MESMA fronteira, quatro ferramentas onde cabia uma, e ainda deixava
 * a aba com o peso visual de um botão primário.
 *
 * A cor faz a segunda metade do trabalho: n-500 em repouso, n-900 e peso 600 na
 * ativa. Nenhuma aba tem caixa, nenhuma levanta — aba não é tecla, é uma pasta
 * de fichário e a ficha selecionada é a que encosta no conteúdo.
 *
 * `variant` continua na API (`default` | `line`) porque é exportado, mas as
 * duas desenham a mesma linha: não há mais duas formas de aba no sistema.
 */
const tabsListVariants = cva(
  'group/tabs-list flex w-full items-center gap-0.5 border-b border-[color:var(--n-200)] px-2.5 pt-2 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:w-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:border-r group-data-[orientation=vertical]/tabs:border-b-0 group-data-[orientation=vertical]/tabs:px-0 group-data-[orientation=vertical]/tabs:py-2',
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

/**
 * Contagem ao lado do rótulo da aba: chip MONO, sem borda.
 *
 * Sem borda é decisão da issue e não descuido do mockup: o chip mora a 6px do
 * traço da aba ativa, e uma segunda linha ali seria duas ferramentas de
 * separação encostadas — o tint de folha-2 já basta para destacar o número. Ele
 * inverte na aba ativa (tinta cheia, sinal em folha) para acompanhar o traço.
 */
function TabsCount({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        't-dado-meta rounded-[var(--r-chip)] bg-[color:var(--n-50)] px-1.5 py-px transition-colors group-data-selected/tab:bg-[color:var(--n-900)] group-data-selected/tab:text-[color:var(--n-0)]!',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  contagem,
  children,
  ...props
}: React.ComponentProps<typeof TabPrimitive> & {
  value?: string | undefined
  /** Quantidade opcional ao lado do rótulo (chip mono). */
  contagem?: number | undefined
}) {
  return (
    <TabPrimitive
      data-slot="tabs-trigger"
      {...(value !== undefined && { id: value })}
      className={cn(
        // `-mb-px` põe o traço da aba ativa EM CIMA da hairline da tira, em vez
        // de embaixo dela: sem isso as duas linhas aparecem juntas e a fronteira
        // ganha 3px de espessura só na aba selecionada.
        //
        // A borda inferior já existe transparente em repouso — reservar o espaço
        // desde o começo evita que a fileira inteira ande 2px quando o mouse
        // passa.
        'group/tab desabilitado t-ui -mb-px inline-flex cursor-pointer items-center justify-center gap-[7px] border-b-2 border-transparent px-3 pt-2 pb-2.5 whitespace-nowrap text-[color:var(--n-500)]! outline-none transition-colors focus-visible:focus-ring hover:text-[color:var(--n-900)]! data-[disabled]:pointer-events-none data-selected:border-b-[color:var(--n-900)] data-selected:font-semibold! data-selected:text-[color:var(--n-900)]! group-data-[orientation=vertical]/tabs:-mr-px group-data-[orientation=vertical]/tabs:mb-0 group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:border-r-2 group-data-[orientation=vertical]/tabs:border-b-0 group-data-[orientation=vertical]/tabs:data-selected:border-r-[color:var(--n-900)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-[15px]',
        className,
      )}
      {...props}
    >
      {typeof children === 'function' ? (
        children
      ) : (
        <>
          {children}
          {contagem !== undefined && <TabsCount>{contagem}</TabsCount>}
        </>
      )}
    </TabPrimitive>
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
      className={cn('t-corpo flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsCount, tabsListVariants }
