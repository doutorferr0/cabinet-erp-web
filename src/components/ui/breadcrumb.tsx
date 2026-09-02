import { cn } from '@/lib/utils'
import { MoreHorizontalIcon } from 'lucide-react'
import type * as React from 'react'
import {
  Breadcrumb as BreadcrumbPrimitive,
  type BreadcrumbProps,
  Breadcrumbs as BreadcrumbsPrimitive,
  type BreadcrumbsProps,
  Link as LinkPrimitive,
  type LinkProps,
  composeRenderProps,
} from 'react-aria-components'

/**
 * MIGALHA — onde o operador está, e como voltar.
 *
 * Copiado do staging `neobrutalism-aria/` (variante React Aria, MIT), com o
 * mapa de tokens do README aplicado. O que mudou em relação ao original:
 *
 * - **`.t-ui` no lugar de `font-head`** (Reface 2.0 · D5) — a migalha do 1.x era
 *   Mono em caixa alta, e as duas coisas contradizem a §Hierarquia: mono é
 *   DADO (o que se copia, compara ou soma) e caixa alta é exclusiva de
 *   `--t-rotulo`. Nome de seção não é nenhum dos dois — é item de navegação, e
 *   item de navegação é `--t-ui`. A hierarquia entre os degraus passa a sair da
 *   COR (n-500 acima, n-900 no atual), como manda a régua;
 * - **separador `/` no lugar do chevron** — o mockup 2.0 usa a barra, e ela
 *   custa um caractere onde o ícone custava um SVG de 14px por degrau;
 * - **anel de foco amarelo** — o link deles não tinha estilo de foco NENHUM.
 *   Migalha é navegação: sem indicador, quem anda de Tab não sabe onde está;
 * - **`cn-rtl-flip` removido** — classe do design system deles, sem
 *   contrapartida aqui;
 * - textos em PT-BR, inclusive o nome acessível do marco.
 *
 * O separador é responsabilidade do ITEM, não de um componente à parte: quem
 * sabe se é o último da trilha é o `isCurrent` que a RAC entrega ao item. Um
 * `<BreadcrumbSeparator>` solto obrigaria a tela a contar posições na mão e a
 * errar no dia em que a trilha ficasse dinâmica.
 */

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      // `<nav>` nomeado: é um marco, e quem usa leitor pula direto para ele.
      aria-label="Trilha de navegação"
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  )
}

function BreadcrumbList<T extends object>({ className, ...props }: BreadcrumbsProps<T>) {
  return (
    <BreadcrumbsPrimitive
      data-slot="breadcrumb-list"
      className={cn(
        't-ui flex flex-wrap items-center gap-1.5 wrap-break-word text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({
  className,
  children,
  separatorClassName,
  ...props
}: BreadcrumbProps & { separatorClassName?: string }) {
  return (
    <BreadcrumbPrimitive
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    >
      {composeRenderProps(children, (children, { isCurrent }) => (
        <>
          {children}
          {/* Só quem NÃO é o último desenha separador — e ele é decoração:
              a hierarquia já está na estrutura da lista. */}
          {!isCurrent && (
            <span
              data-slot="breadcrumb-separator"
              role="presentation"
              aria-hidden="true"
              className={cn(separatorClassName)}
            >
              /
            </span>
          )}
        </>
      ))}
    </BreadcrumbPrimitive>
  )
}

function BreadcrumbLink({ className, ...props }: LinkProps) {
  return (
    <LinkPrimitive
      data-slot="breadcrumb-link"
      className={composeRenderProps(className, (className) =>
        cn(
          'cursor-pointer rounded-item no-underline outline-none transition-colors',
          'hover:text-foreground',
          // O original não estilizava foco. Aqui o anel é obrigatório: migalha
          // é caminho de volta, e caminho de volta tem que ser alcançável.
          'focus-visible:focus-ring',
          className,
        ),
      )}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      // O original do staging punha `role="link" aria-disabled="true"` aqui.
      // Saiu: papel de link exige ser focável, e um "link" que não navega nem
      // recebe foco é mentira para quem usa leitor — o Biome pega isso pela
      // `useFocusableInteractive`. A página atual é TEXTO, e `aria-current`
      // sozinho já diz que é o nó em que o operador está, que é a informação.
      aria-current="page"
      // Tinta, e não `font-bold`: dentro de Inter a hierarquia é peso E cor, e
      // aqui o peso já é o 500 de `.t-ui` na fileira inteira — subir para 700
      // só no último faria o degrau atual parecer de outro degrau da escala.
      className={cn('text-foreground', className)}
      {...props}
    />
  )
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn('flex size-5 items-center justify-center [&>svg]:size-4', className)}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">Níveis ocultos</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbEllipsis,
}
