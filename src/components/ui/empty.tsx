import { cn } from '@/lib/utils'
import type * as React from 'react'

/**
 * ESTADO VAZIO — a peça que fala quando não há o que mostrar.
 *
 * **Reface 2.0 (D29): o vazio perdeu o desenho de acervo.** Até a 1.x cada
 * vazio pousava um shape de 96 a 128px no `EmptyMedia` — um desenho grande,
 * colorido e diferente por situação. Eram seis shapes para dizer seis vezes a
 * mesma coisa ("não há nada aqui"), e o desenho ficava mais alto e mais saturado
 * que a frase que de fato informa e que a ação que de fato resolve. O 2.0 troca
 * os seis por **um ícone lucide de 32px em tinta apagada**: o olho continua
 * achando a caixa de longe, e o peso volta para o título e para a tecla.
 *
 * O único vazio que mantém desenho é o 404 (`rota-inexistente.tsx`), onde a
 * tela inteira é o estado e não há mais nada competindo por atenção.
 *
 * ## Anatomia
 *
 * `<EmptyMedia>` (o ícone) · `<EmptyTitle>` (o que houve) ·
 * `<EmptyDescription>` (o que fazer) · `<EmptyContent>` (a ação, quando há).
 * O ícone é `aria-hidden`, então o TÍTULO é o que carrega o sentido — vazio
 * explicado só pelo desenho é tela muda para quem usa leitor.
 *
 * **A razão de existir como componente, e não de continuar escrito à mão em
 * cada tela:** a memória lista seis vazios diferentes (módulo sem registro,
 * busca sem resultado, primeira vez, sem permissão, offline, rota inexistente).
 * Escritos soltos, eles divergem no primeiro mês — e o que separa um bom estado
 * vazio de um ruim é justamente dizer a coisa CERTA: "não existe registro" pede
 * cadastrar, "a busca não achou" pede corrigir o termo. Um componente força a
 * mesma anatomia nos seis.
 *
 * ## §Hierarquia
 *
 * Separação por ESPAÇO apenas (`gap`), nunca borda: o vazio quase sempre mora
 * dentro de algo que já é caixa — a célula da DataTable, a folha da tela — e
 * uma borda própria seria a segunda ferramenta na mesma fronteira. Quem
 * precisar de caixa passa pelo `className`.
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

/**
 * Onde o ÍCONE pousa — 32px, tinta apagada, sempre `aria-hidden`.
 *
 * O tamanho e a cor moram aqui, e não em cada chamador, de propósito: passado
 * por tela, o "32 em tinta apagada" vira "40 em tinta cheia" na terceira, e o
 * vazio volta a ter seis aparências. O consumidor escolhe QUAL ícone lucide; o
 * resto é da peça.
 *
 * Tinta: `muted-foreground` (n-500). A espec da D29 pede n-400, mas §Hierarquia
 * reserva n-400 para desabilitado e placeholder — e o ícone do vazio não está
 * desabilitado, está apagado. Um degrau acima é o que a régua permite.
 */
function EmptyMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-media"
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center text-muted-foreground',
        '[&_svg]:pointer-events-none [&_svg]:size-8 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

/**
 * O título do vazio.
 *
 * `t-bloco` (Inter 600 · 13.5) e não Gambarino: §Hierarquia dá **um** Gambarino
 * por tela, e a tela que mostra um vazio já gastou o dela no título da página.
 * O vazio é um bloco dentro dessa tela, não uma tela própria — o 404 é a
 * exceção, porque lá o vazio É a tela.
 */
function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-title" className={cn('t-bloco', className)} {...props} />
}

/** A frase que diz o que fazer. `t-meta`: Inter 400 · 12 · n-500. */
function EmptyDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty-description" className={cn('t-meta', className)} {...props} />
}

/** A saída: a tecla que tira o operador do vazio. Opcional — nem todo vazio tem. */
function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full max-w-sm min-w-0 flex-col items-center gap-2 text-balance',
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
