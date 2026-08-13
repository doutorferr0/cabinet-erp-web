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

/** Painel lateral brut: folha opaca com régua preta 2px no lado de contato. */
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
      // Serifada não leva caixa alta (decisão do user, 2026-08-13): o título fala
      // na voz de QUEM desde a troca de tipografia, e caixa alta em Newsreader
      // vira letreiro. Maiúscula só na inicial, como o texto vem escrito. Peso
      // 700 porque não há arquivo de 800 — 800 aqui seria negrito sintético.
      // Sora explícito, e não herdado: desde que a regra do `index.css` passou a
      // valer só para `h1` (2026-08-13), um `Heading` sem família cai no Inter
      // do body — e a regra é "de H2 para baixo, Sora". Herança que sumiu, e
      // sumiu calada: o título continuava renderizando, só que na voz errada.
      className={cn('font-display text-base font-bold text-foreground', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: Omit<React.ComponentProps<'div'>, 'slot'>) {
  return (
    <div
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
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
