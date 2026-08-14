import { cn } from '@/lib/utils'
import { ChevronDownIcon } from 'lucide-react'
import type * as React from 'react'
import {
  Button as ButtonPrimitive,
  DisclosureGroup as DisclosureGroupPrimitive,
  type DisclosureGroupProps as DisclosureGroupPrimitiveProps,
  DisclosurePanel as DisclosurePanelPrimitive,
  type DisclosurePanelProps as DisclosurePanelPrimitiveProps,
  Disclosure as DisclosurePrimitive,
  type DisclosureProps as DisclosurePrimitiveProps,
  Heading,
  composeRenderProps,
} from 'react-aria-components'

/**
 * ACORDEÃO — seção que abre e fecha.
 *
 * Base: `Disclosure`/`DisclosureGroup` da `react-aria-components`, que já
 * entrega o que um acordeão feito à mão erra: `aria-expanded` e `aria-controls`
 * amarrados, cabeçalho de verdade (`<h3><button>`) e teclado nativo. A pele é
 * a do sistema, como em todo primitivo daqui — a referência do neobrutalism.dev
 * é VISUAL; o código de lá é Radix e não se copia (DESIGN.md §Components).
 *
 * **Por que a seção é ITEM (raio 0) e não cartão:** seções irmãs encostam umas
 * nas outras dentro do grupo, e canto arredondado abre fresta na fileira — a
 * mesma regra da aba, da célula e do item de menu (§Canto por natureza). Elas
 * também não LEVANTAM no hover: lift é de peça solta, e estas estão coladas.
 * O que muda no hover é o fundo do cabeçalho, como no item de menu.
 *
 * **Onde ele cabe neste ERP, e onde não:** serve para dobrar seção de
 * formulário longo e bloco de detalhe. Não serve para esconder campo
 * obrigatório nem linha de grade — dado que o operador precisa conferir não
 * pode depender de ele lembrar de abrir uma gaveta.
 */

function Accordion({
  className,
  ...props
}: Omit<DisclosureGroupPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <DisclosureGroupPrimitive
      data-slot="accordion"
      // Caixa do conjunto: as seções desenham as próprias réguas por dentro.
      className={cn('rounded-data border-2 border-border bg-card', className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: Omit<DisclosurePrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <DisclosurePrimitive
      data-slot="accordion-item"
      className={composeRenderProps(className, (className) =>
        cn(
          // `group/accordion-item` NÃO é decoração: é o que permite ao gatilho
          // e à seta lerem o `data-expanded`, que mora AQUI (no `Disclosure`) e
          // não no botão. Sem esta classe o seletor não casa com nada e a seta
          // fica parada — falha silenciosa, porque nada quebra.
          'group/accordion-item border-b-2 border-border last:border-b-0',
          className,
        ),
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ButtonPrimitive>, 'className' | 'children' | 'slot'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    // `<Heading>` + `<Button slot="trigger">` é a estrutura que a RAC espera:
    // sem o cabeçalho, o leitor de tela perde a lista de seções da página.
    <Heading level={3}>
      <ButtonPrimitive
        slot="trigger"
        data-slot="accordion-trigger"
        className={composeRenderProps(className, (className) =>
          cn(
            'group/accordion-trigger flex w-full cursor-pointer items-center gap-2 rounded-item px-3.5 py-3 text-left font-semibold text-sm outline-none transition-colors',
            'hover:bg-neutral data-pressed:bg-neutral',
            // Seção ABERTA fica com o cabeçalho tingido. A seta girada já diz,
            // mas ela é pequena e some no canto — o fundo é o sinal que se lê
            // de longe, correndo o olho por uma pilha de seções.
            'group-data-[expanded]/accordion-item:bg-neutral',
            'focus-visible:focus-ring-inset',
            'desabilitado data-disabled:pointer-events-none',
            className,
          ),
        )}
        {...props}
      >
        {composeRenderProps(children, (children) => (
          <>
            {children}
            {/* A seta gira: é o indicador redundante de aberto/fechado que a
                cor sozinha não dá (1.4.1). O `group-data-expanded` vem do
                `Disclosure` acima, não do botão. */}
            <ChevronDownIcon className="ml-auto size-4 shrink-0 transition-transform duration-150 group-data-[expanded]/accordion-item:rotate-180" />
          </>
        ))}
      </ButtonPrimitive>
    </Heading>
  )
}

function AccordionPanel({
  className,
  ...props
}: Omit<DisclosurePanelPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <DisclosurePanelPrimitive
      data-slot="accordion-panel"
      className={composeRenderProps(className, (className) =>
        // Fundo afundado: o painel é conteúdo DENTRO da seção, e meio grau de
        // luz separa sem gastar traço nem cor.
        cn('bg-surface-sunken px-3 py-2.5 text-sm', className),
      )}
      {...props}
    />
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel }
