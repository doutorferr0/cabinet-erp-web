import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Tabela brut, ainda em HTML puro: a versão RAC (grid navegável do spike)
 * entra na fase 2 junto com a reescrita da DataTable. O contêiner de fora
 * (caixa preta 2px) é do consumidor; aqui mora a malha interna em Fio e a
 * barra preta do cabeçalho (DESIGN.md §DataTable).
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  // A barra preta sólida da fundação anterior SAIU (DESIGN.md §Don'ts). O
  // cabeçalho é caixa clara com letra preta: a força vem da régua de 3px, da
  // caixa alta e do tracking, não de um bloco de tinta atravessando a tela.
  // Sem separador vertical entre colunas — a amostra tirou a malha vertical, e
  // a régua horizontal já delimita.
  <thead ref={ref} className={cn('[&_tr]:border-0', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  // A malha VERTICAL saiu (a amostra não tem separador entre colunas: a
  // régua horizontal já delimita, e coluna fechada dos dois lados vira gaiola).
  // A régua entre linhas sobe de 1px de Fio para 2px de Tinta, acompanhando a
  // célula de 52px — régua fina sob célula alta some.
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0 [&_tr]:border-b-2 [&_tr]:border-border', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t-2 border-border font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    // Hover fica a cargo do consumidor (a DataTable usa Bancada cheia; cabeçalho não tem hover).
    <tr
      ref={ref}
      className={cn('border-b transition-colors data-[state=selected]:bg-muted', className)}
      {...props}
    />
  ),
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  // Cabeçalho de coluna = BARRA PRETA (fusão v5, decisão do user 2026-08-19,
  // supersede a etiqueta invertida da 1.5 AQUI, e só aqui): papel preto, tinta
  // clara, mono 10px tracking largo. Com o rótulo de campo rebaixado a
  // sussurro, o topo da grade vira a única peça escura da malha — âncora que
  // separa cabeçalho de dado sem régua de 3px. Peso 400: a caixa alta e o
  // contraste já são a força.
  <th
    ref={ref}
    className={cn(
      'h-[38px] bg-primary px-3 text-left align-middle font-mono text-[10px] font-normal tracking-[0.12em] text-primary-foreground uppercase [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    // 52px é o pedido da amostra: a listagem é onde o operador mira com o
    // mouse, e ganha ar. A densidade de comanda segue valendo no FORMULÁRIO —
    // a célula editável da FormGrid continua em 32px.
    className={cn('h-[52px] px-3 py-0 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
))
TableCaption.displayName = 'TableCaption'

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
