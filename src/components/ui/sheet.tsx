import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { XIcon } from 'lucide-react'
import type * as React from 'react'
import {
  Heading,
  ModalOverlay as ModalOverlayPrimitive,
  type ModalOverlayProps as ModalOverlayPrimitiveProps,
  Modal as ModalPrimitive,
  Dialog as SheetPrimitive,
  type DialogProps as SheetPrimitiveProps,
  DialogTrigger as SheetTriggerPrimitive,
  type DialogTriggerProps as SheetTriggerPrimitiveProps,
} from 'react-aria-components'

function SheetTrigger({ ...props }: SheetTriggerPrimitiveProps) {
  return <SheetTriggerPrimitive data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      slot="close"
      data-slot="sheet-close"
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    />
  )
}

function SheetOverlay({
  className,
  children,
  ...props
}: Omit<ModalOverlayPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <ModalOverlayPrimitive
      data-slot="sheet-overlay"
      isDismissable
      className={cn(
        'fixed inset-0 z-50 bg-veil transition-opacity duration-150 data-entering:opacity-0 data-exiting:opacity-0',
        className,
      )}
      {...props}
    >
      {children}
    </ModalOverlayPrimitive>
  )
}

/**
 * PAINEL LATERAL — folha opaca, régua de tinta no lado de contato, sombra dura.
 *
 * ## Por que ele continua aqui depois de D7
 *
 * A gaveta de notificações morreu nesta mesma issue, e as duas coisas são
 * distintas: a gaveta era uma coluna irmã do `<main>` que EMPURRAVA o conteúdo,
 * escrita à mão, sem Dialog e sem véu. Este é o painel modal do design system, e
 * ele tem consumidor (`sidebar.tsx` em telas estreitas, `company-switcher.tsx`) e
 * um encomendado: D24 monta Entrada/Saída/Ajuste da movimentação nele. Apagá-lo
 * junto seria confundir o desenho errado com a primitiva.
 *
 * ## O que mudou (reestilização 2.0)
 *
 * - **Folha**: era `bg-card`, continua — o painel é objeto sobre o plano, não uma
 *   região da página, e nesse papel a folha é opaca por definição.
 * - **Borda de tinta**: `border-border` já é a tinta do tema (n-900 em D1), e o
 *   painel a mostra só no lado de contato. As outras três estão fora da janela.
 * - **Sombra dura**: entrou agora. O painel pousava sem profundidade nenhuma
 *   sobre o véu, e a linguagem 2.0 é sombra DURA de tinta — `shadow-el5`, o
 *   degrau mais alto, que é o alias que D1 remapeia para `--hard-3`. É a única
 *   sombra da tela enquanto ele está aberto: o resto está atrás do véu.
 * - A direção acompanha o lado: painel que entra pela direita projeta para a
 *   esquerda, senão a sombra cai para fora da janela e não existe.
 *
 * O raio segue reto, e isso não mudou: o painel encosta em três bordas da
 * janela, e arredondar canto que está fora dela é máquina para nada.
 */
function Sheet({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: Omit<ModalOverlayPrimitiveProps, 'className' | 'children'> &
  Pick<React.ComponentProps<typeof ModalPrimitive>, 'isDismissable'> & {
    className?: string | undefined
    children: React.ReactNode
    side?: 'top' | 'right' | 'bottom' | 'left'
    showCloseButton?: boolean
  }) {
  return (
    <SheetOverlay {...props}>
      <ModalPrimitive
        data-slot="sheet-content"
        data-side={side}
        // EXCEÇÃO ao raio por natureza, deliberada: a gaveta encosta em três
        // bordas da janela e tem UMA borda visível (a de dentro). Arredondar
        // canto que está fora da tela não aparece, e arredondar só o de dentro
        // pediria um raio por lado por `data-side` — muita máquina para um
        // canto. Fica reta, como item que encosta em item.
        className={cn(
          // A SOMBRA DURA acompanha o LADO DE ENTRADA. Painel que vem da
          // direita encosta em `right-0`: uma sombra para a direita cai fora da
          // janela e não existe. Por isso o eixo X vira de sinal por `data-side`
          // — a geometria é sempre a de `--hard-3` (6px, o degrau que
          // `tokens-2.0.css` reserva para "dialog, sheet, ⌘K"), só espelhada.
          //
          // A COR sai de `--tinta-dura`, declarada aqui em duas linhas porque o
          // token espelhado não existe: `--hard-3` é `<x> <y> 0 0 <cor>` inteiro,
          // e não dá para virar só o X de dentro de uma `var()`. As duas linhas
          // repetem exatamente a fonte que `--hard-3` usa — n-900 no claro,
          // n-400 no escuro, onde a tinta do tema é CLARA e uma sombra em n-900
          // seria um halo. Pedido de `--hard-3-esq`/`--hard-3-baixo` registrado
          // na #469; no dia em que existirem, isto vira uma `var()` e some.
          '[--tinta-dura:var(--n-900)] dark:[--tinta-dura:var(--n-400)]',
          'data-[side=right]:shadow-[-6px_6px_0_0_var(--tinta-dura)] data-[side=left]:shadow-[6px_6px_0_0_var(--tinta-dura)] data-[side=top]:shadow-[6px_6px_0_0_var(--tinta-dura)] data-[side=bottom]:shadow-[6px_-6px_0_0_var(--tinta-dura)]',
          'fixed z-50 flex flex-col gap-4 border-border bg-card text-sm text-card-foreground transition duration-200 ease-in-out data-entering:opacity-0 data-exiting:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t-2 data-[side=bottom]:data-entering:translate-y-[2.5rem] data-[side=bottom]:data-exiting:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r-2 data-[side=left]:data-entering:translate-x-[-2.5rem] data-[side=left]:data-exiting:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l-2 data-[side=right]:data-entering:translate-x-[2.5rem] data-[side=right]:data-exiting:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b-2 data-[side=top]:data-entering:translate-y-[-2.5rem] data-[side=top]:data-exiting:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
          className,
        )}
      >
        <SheetPrimitive
          data-slot="sheet"
          className="[display:inherit] h-full max-h-[inherit] [flex-direction:inherit] [gap:inherit] outline-none"
        >
          {children}
          {showCloseButton && (
            <SheetClose variant="ghost" className="absolute top-3 right-3" size="icon-sm">
              <XIcon />
              <span className="sr-only">Fechar</span>
            </SheetClose>
          )}
        </SheetPrimitive>
      </ModalPrimitive>
    </SheetOverlay>
  )
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Sheet> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}) {
  return (
    <Sheet className={className} side={side} showCloseButton={showCloseButton} {...props}>
      {children}
    </Sheet>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-0.5 p-4', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: Omit<React.ComponentProps<typeof Heading>, 'slot'>) {
  return (
    <Heading
      slot="title"
      data-slot="sheet-title"
      // Título de painel é TÍTULO DE SEÇÃO (§Hierarquia `--t-secao`, 20px na
      // display): o painel é tela própria enquanto está aberto, e um título de
      // 16px o deixava do tamanho do texto que ele encabeça. Caixa alta não
      // entra — na régua 2.0 só `--t-rotulo` é maiúscula, e display em caixa
      // alta vira letreiro.
      //
      // A classe traz família, peso, tamanho e cor de uma vez, e é por isso
      // que ela substitui `font-display text-xl font-bold` inteiro em vez de se
      // somar a ele: o degrau é indivisível. Herdar a família tampouco serviria
      // — a regra do `index.css` vale para `h1`, e um `Heading` sem família cai
      // no Inter do body. Herança que sumia calada: o título continuava
      // renderizando, só que na voz errada.
      className={cn('t-secao', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: Omit<React.ComponentProps<'div'>, 'slot'>) {
  return (
    <div
      data-slot="sheet-description"
      // `.t-meta` — o degrau de subtítulo/ajuda. Era `text-sm` + cor solta,
      // que é a mesma intenção escrita fora da régua.
      className={cn('t-meta', className)}
      {...props}
    />
  )
}

export {
  type SheetPrimitiveProps,
  type SheetTriggerPrimitiveProps,
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
