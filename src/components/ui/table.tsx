import { cn } from '@/lib/utils'
import * as React from 'react'

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
  // Sublinha em Régua Forte sob o cabeçalho; malha vertical em Fio (grade fechada, DESIGN.md §DataTable).
  <thead
    ref={ref}
    className={cn(
      '[&_tr]:border-b [&_tr]:border-rule-strong [&_th]:border-l [&_th]:border-rule-hair [&_th:first-child]:border-l-0',
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
  // Fio entre linhas e entre colunas — a malha delimita a célula sem virar gaiola.
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
    className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
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
  // 36px, etiqueta Meta: mono 0.75rem, peso 500, caixa alta, tracking 0.06em (DESIGN.md §Typography).
  <th
    ref={ref}
    className={cn(
      'h-9 px-2 text-left align-middle font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground [&:has([role=checkbox])]:pr-0',
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
    className={cn('p-2 align-middle [&:has([role=checkbox])]:pr-0', className)}
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
