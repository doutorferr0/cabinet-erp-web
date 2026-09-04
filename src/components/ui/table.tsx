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
  // A barra preta do cabeçalho SAIU na 2.0. Header de tabela é uma REGIÃO de
  // natureza diferente do corpo, e a §Separação nomeia a ferramenta para isso:
  // TINT (`n-50`), não borda e não bloco de tinta. Uma ferramenta por
  // fronteira — o tint separa, e por isso não há régua de 3px por baixo dele.
  // Sem separador vertical entre colunas: coluna fechada dos dois lados vira
  // gaiola, e a hairline horizontal já delimita.
  <thead ref={ref} className={cn('[&_tr]:border-0', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  // A malha VERTICAL saiu (a amostra não tem separador entre colunas: a
  // régua horizontal já delimita, e coluna fechada dos dois lados vira gaiola).
  // A régua entre linhas VOLTOU a 1px, e desta vez com motivo escrito: 2px de
  // tinta entre linhas é a mesma espessura da borda que separa a tabela do
  // plano, então cada linha era lida como uma caixa própria e a listagem virava
  // pilha de caixas. Hairline separa itens do MESMO tipo (§Separação, nível 2);
  // a caixa é do contêiner, uma vez só.
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0 [&_tr]:border-b [&_tr]:border-input', className)}
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
    // Hover e SELEÇÃO ficam a cargo do consumidor: na 2.0 a linha marcada é
    // `--primary-soft` com faixa de 3px na borda esquerda, e um `bg-muted`
    // genérico aqui brigaria com ela por especificidade em metade das tabelas.
    <tr ref={ref} className={cn('border-b transition-colors', className)} {...props} />
  ),
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  // Cabeçalho de coluna = RÓTULO sobre tint (reface 2.0, supersede a barra
  // preta da fusão v5). É `--t-rotulo` da §Hierarquia — Inter 600 · 10.5 ·
  // tracking .12em · caixa alta, em `n-500` —, e a classe vem de lá em vez de
  // `text-[10px]` à mão: o degrau é o mesmo do rótulo de KPI e do título de
  // grupo da sidebar, e três lugares copiando o mesmo tamanho divergem no
  // primeiro ajuste.
  //
  // O tint `n-50` é a ÚNICA separação entre cabeçalho e corpo, mais a hairline
  // `n-300` do pé do header. Fundo escuro atravessando a tela era a peça mais
  // pesada de uma listagem cujo assunto é o dado, não a moldura.
  <th
    ref={ref}
    className={cn(
      'h-[38px] whitespace-nowrap bg-surface-sunken px-3 text-left align-middle t-rotulo [&:has([role=checkbox])]:pr-0',
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
    // 52px é o pedido do mockup para a densidade CONFORTÁVEL: a listagem é onde
    // o operador mira com o mouse, e ganha ar. Quem confere cinquenta linhas
    // troca para compacta (40px), que a DataTable aplica por classe sobre esta
    // mesma marcação. A densidade de comanda segue valendo no FORMULÁRIO — a
    // célula editável da FormGrid continua em 32px.
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
