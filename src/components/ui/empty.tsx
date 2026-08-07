import { cn } from '@/lib/utils'
import type * as React from 'react'

/**
 * ESTADO VAZIO — a peça que fala quando não há o que mostrar.
 *
 * Copiado do staging `neobrutalism-aria/`, com duas mudanças de pele: título em
 * Display (era `cn-font-heading`) e **sem caixa própria por padrão**. O
 * original desenha `border-2` + `bg-card`; aqui o vazio quase sempre mora
 * DENTRO de algo que já é caixa — a célula da DataTable, a folha da tela — e a
 * borda criaria moldura dentro de moldura. Quem precisar de caixa passa pelo
 * `className`.
 *
 * **A razão de existir como componente, e não de continuar escrito à mão em
 * cada tela:** a memória lista seis vazios diferentes (módulo sem registro,
 * busca sem resultado, primeira vez, sem permissão, offline, rota inexistente),
 * cada um com shape e cor próprios. Escritos soltos, eles divergem no primeiro
 * mês — e o que separa um bom estado vazio de um ruim é justamente dizer a
 * coisa CERTA: "não existe registro" pede cadastrar, "a busca não achou" pede
 * corrigir o termo. Um componente força a mesma anatomia nos seis.
 *
 * Anatomia: `<EmptyMedia>` (o ornamento) · `<EmptyTitle>` (o que houve) ·
 * `<EmptyDescription>` (o que fazer) · `<EmptyContent>` (a ação, quando há).
 * O ornamento é `aria-hidden`, então o TÍTULO é o que carrega o sentido — vazio
 * explicado só pelo desenho é tela muda para quem usa leitor.
 */

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex w-full min-w-0 flex-col items-center justify-center gap-3 p-6 text-center text-balance',
        className,
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-1.5', className)}
      {...props}
    />
  )
}

/** Onde o ornamento pousa. Só centraliza — a cor e o shape são dele. */
function EmptyMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        'flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      // Display: é o título da situação, e título fala em Display aqui.
      className={cn('font-display text-base font-bold tracking-tight text-foreground', className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn('text-sm/relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

/** A saída: o botão que tira o operador do vazio. Opcional — nem todo vazio tem. */
function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance',
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
