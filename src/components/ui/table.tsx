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
  // Barra preta sólida: fundo Tinta, células separadas por 1px de tinta clara.
  <thead
    ref={ref}
    className={cn(
      '[&_tr]:border-0 [&_th]:border-l [&_th]:border-l-white/20 [&_th:first-child]:border-l-0',
      className,
    )}
    {...props}
  />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  // Malha interna em Fio (linhas E colunas) — a caixa grita, a malha sussurra.
  <tbody
    ref={ref}
    className={cn(
      '[&_tr:last-child]:border-0 [&_tr]:border-rule-hair [&_td]:border-l [&_td]:border-rule-hair [&_td:first-child]:border-l-0',
      className,
    )}
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
  // Cabeçalho de coluna = barra preta: Meta em cream sobre Tinta, 34px.
  <th
    ref={ref}
    className={cn(
      'h-[34px] bg-primary px-2 text-left align-middle font-mono text-[0.75rem] font-semibold uppercase tracking-[0.07em] text-primary-foreground [&:has([role=checkbox])]:pr-0',
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
    className={cn('h-[33px] px-2 py-0 align-middle [&:has([role=checkbox])]:pr-0', className)}
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
