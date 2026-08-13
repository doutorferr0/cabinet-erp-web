import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type * as React from 'react'
import {
  Dialog as AlertDialogPrimitive,
  type DialogProps as AlertDialogPrimitiveProps,
  DialogTrigger as AlertDialogTriggerPrimitive,
  type DialogTriggerProps as AlertDialogTriggerPrimitiveProps,
  Heading,
  ModalOverlay as ModalOverlayPrimitive,
  type ModalOverlayProps as ModalOverlayPrimitiveProps,
  Modal as ModalPrimitive,
  Text,
} from 'react-aria-components'

/**
 * DIÁLOGO DE ALERTA — a pergunta que interrompe porque a resposta tem
 * consequência.
 *
 * Copiado do staging `neobrutalism-aria/`, com a pele daqui. **A diferença para
 * o `Dialog` comum não é visual, é de comportamento**, e é por isso que vale um
 * arquivo próprio:
 *
 * 1. **`role="alertdialog"`** — o leitor de tela anuncia como alerta e lê a
 *    DESCRIÇÃO junto do título, sem esperar o operador navegar até ela. Num
 *    diálogo comum a consequência ficaria depois do foco, e a confirmação seria
 *    dada antes de ela ser lida.
 * 2. **Não fecha sozinho** (`isDismissable={false}`): clicar fora não cancela.
 *    Numa confirmação destrutiva, sumir ao primeiro clique perdido é ambíguo —
 *    o operador não sabe se cancelou ou se a ação foi embora sem resposta. A
 *    saída é sempre por um botão NOMEADO.
 * 3. **Sem botão X** pelo mesmo motivo: `Cancelar` diz o que faz; um "x" no
 *    canto não diz.
 *
 * `Escape` continua fechando — é a saída de teclado que o padrão ARIA exige, e
 * ela equivale a cancelar.
 */

function AlertDialogTrigger({ ...props }: AlertDialogTriggerPrimitiveProps) {
  return <AlertDialogTriggerPrimitive data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogOverlay({
  className,
  children,
  ...props
}: Omit<ModalOverlayPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <ModalOverlayPrimitive
      data-slot="alert-dialog-overlay"
      // `isDismissable` NÃO entra aqui: a cortina não cancela a decisão.
      className={cn('fade-veil fixed inset-0 isolate z-50 bg-veil', className)}
      {...props}
    >
      {children}
    </ModalOverlayPrimitive>
  )
}

function AlertDialog({
  className,
  children,
  ...props
}: Omit<ModalOverlayPrimitiveProps, 'className' | 'children'> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <AlertDialogOverlay {...props}>
      <ModalPrimitive
        data-slot="alert-dialog-content"
        // Mesma folha do diálogo: raio de painel e `el-5`, o degrau que a
        // escada reserva para o que flutua sobre tudo.
        className={cn(
          'pop-spring fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-panel border-2 border-border bg-card p-4 text-sm text-card-foreground shadow-el5 outline-none sm:max-w-sm',
          className,
        )}
      >
        <AlertDialogPrimitive
          data-slot="alert-dialog"
          role="alertdialog"
          className="[display:inherit] [gap:inherit] outline-none"
        >
          {children}
        </AlertDialogPrimitive>
      </ModalPrimitive>
    </AlertDialogOverlay>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

/** Onde o ornamento de alerta pousa, ao lado do título. */
function AlertDialogMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Heading>, 'slot'>) {
  return (
    <Heading
      slot="title"
      data-slot="alert-dialog-title"
      // Sem caixa alta e em 700: ver a nota do `SheetTitle`.
      // Sora explícito, e não herdado: desde que a regra do `index.css` passou a
      // valer só para `h1` (2026-08-13), um `Heading` sem família cai no Inter
      // do body — e a regra é "de H2 para baixo, Sora". Herança que sumiu, e
      // sumiu calada: o título continuava renderizando, só que na voz errada.
      className={cn('font-display text-base leading-none font-bold', className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Text>, 'slot'>) {
  return (
    <Text
      // `slot="description"` é o que amarra o `aria-describedby` do diálogo.
      // Sem ele o `role="alertdialog"` perde metade da graça: o leitor
      // anunciaria o alerta e não leria a consequência junto.
      slot="description"
      data-slot="alert-dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      // Rodapé afundado com régua forte por cima: a mesma gramática do rodapé
      // de formulário — a régua separa a decisão do texto que a explica.
      className={cn(
        'rule-strong-top -mx-4 -mb-4 flex flex-col-reverse gap-2 bg-surface-sunken p-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" className={cn(className)} {...props} />
}

function AlertDialogCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      variant={variant}
      size={size}
      {...props}
    />
  )
}

export {
  type AlertDialogPrimitiveProps,
  type AlertDialogTriggerPrimitiveProps,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialogTrigger,
}
