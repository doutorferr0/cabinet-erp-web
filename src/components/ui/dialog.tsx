import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { XIcon } from 'lucide-react'
import type * as React from 'react'
import {
  Dialog as DialogPrimitive,
  type DialogProps as DialogPrimitiveProps,
  DialogTrigger as DialogTriggerPrimitive,
  type DialogTriggerProps as DialogTriggerPrimitiveProps,
  Heading,
  ModalOverlay as ModalOverlayPrimitive,
  type ModalOverlayProps as ModalOverlayPrimitiveProps,
  Modal as ModalPrimitive,
} from 'react-aria-components'

function DialogTrigger({ ...props }: DialogTriggerPrimitiveProps) {
  return <DialogTriggerPrimitive data-slot="dialog-trigger" {...props} />
}

/**
 * O botão que fecha. Padrão **ghost** desde a D29: no rodapé de um diálogo há
 * duas ações e só uma delas faz alguma coisa acontecer. Com as duas em caixa
 * (`outline` + primária), o par lia como escolha entre iguais e o olho tinha de
 * ler as duas etiquetas para achar a que confirma. Ghost ao lado da tecla é a
 * hierarquia dita pelo desenho.
 */
function DialogClose({
  className,
  variant = 'ghost',
  size = 'default',
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      slot="close"
      data-slot="dialog-close"
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  children,
  ...props
}: Omit<ModalOverlayPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <ModalOverlayPrimitive
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 isolate z-50 fade-veil bg-veil', className)}
      {...props}
    >
      {children}
    </ModalOverlayPrimitive>
  )
}

/**
 * A FOLHA DO DIÁLOGO (2.0) — papel pousado sobre a cortina.
 *
 * Borda de **1.5px** em n-900 e sombra dura `--hard-3` (o degrau que a escada
 * reserva para o que flutua sobre tudo, servido pelo alias `shadow-el5`). O
 * 1.5px não é preciosismo: com 2px a folha do diálogo tinha o MESMO traço do
 * card de página, e as duas superfícies liam como o mesmo plano — o que separa
 * o diálogo do resto é ele estar por cima, e o traço um pouco mais fino é o que
 * deixa a sombra fazer esse trabalho sozinha.
 *
 * Uma sombra dura por tela é a regra (§Hierarquia); enquanto o diálogo está
 * aberto, a dele é a que vale — o que está atrás está sob a cortina.
 */
function Dialog({
  className,
  children,
  showCloseButton = true,
  isDismissable = true,
  ...props
}: Omit<ModalOverlayPrimitiveProps, 'className' | 'children'> &
  Pick<React.ComponentProps<typeof ModalPrimitive>, 'isDismissable'> & {
    className?: string
    children: React.ReactNode
    showCloseButton?: boolean
  }) {
  return (
    <DialogOverlay isDismissable={isDismissable} {...props}>
      <ModalPrimitive
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-panel border-[1.5px] border-border bg-card p-4 t-corpo text-card-foreground pop-spring shadow-el5 outline-none sm:max-w-sm',
          className,
        )}
      >
        <DialogPrimitive
          data-slot="dialog"
          className="[display:inherit] [gap:inherit] outline-none"
        >
          {children}
          {showCloseButton && (
            <DialogClose variant="ghost" className="absolute top-2 right-2" size="icon-sm">
              <XIcon />
              <span className="sr-only">Fechar</span>
            </DialogClose>
          )}
        </DialogPrimitive>
      </ModalPrimitive>
    </DialogOverlay>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)} {...props} />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      // Ações à DIREITA (§Hierarquia): a leitura vai do texto para a decisão, e
      // a decisão fica onde o polegar e o olho terminam. Em coluna
      // (`flex-col-reverse`, telas estreitas) a primária sobe para o topo da
      // pilha pelo mesmo motivo.
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && <DialogClose>Fechar</DialogClose>}
    </div>
  )
}

function DialogTitle({ className, ...props }: Omit<React.ComponentProps<typeof Heading>, 'slot'>) {
  return (
    <Heading
      slot="title"
      data-slot="dialog-title"
      // `t-secao` (Gambarino 20): §Hierarquia trata o diálogo como TELA
      // PRÓPRIA, e é por isso que ele pode gastar um Gambarino sem contar
      // contra o da página que está atrás da cortina. A família vem da
      // utility, e não herdada — herança de `font-display` já sumiu calada uma
      // vez aqui, quando a regra do `index.css` passou a valer só para `h1`.
      className={cn('t-secao', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: Omit<React.ComponentProps<'div'>, 'slot'>) {
  return <div data-slot="dialog-description" className={cn('t-meta', className)} {...props} />
}

export {
  type DialogPrimitiveProps,
  type DialogTriggerPrimitiveProps,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
}
