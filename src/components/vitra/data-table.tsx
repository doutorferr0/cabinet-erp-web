import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ErroDaApi } from '@/data/api-provider'
import type { TableFetcher, TableQueryState, TableSort } from '@/lib/table-query'
import { cn } from '@/lib/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    /** Coluna de valor: numerais tabulares alinhados à direita (DESIGN.md, Regra do Número Tabular). */
    numeric?: boolean
  }
}

/** Ação da barra padrão das listagens (transcrição §9, padrão 4). */
export interface DataTableAction<T> {
  id: string
  label: string
  /** Recebe a linha selecionada (null quando `needsSelection` é false). */
  onClick?: (row: T | null) => void
  /** Desabilita sem linha selecionada (Alterar, Consul., Excluir/Cancelar). */
  needsSelection?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost'
}

export interface VitraDataTableProps<T> {
  columns: ColumnDef<T>[]
  /** Prefixo da query key do TanStack Query (o estado da tabela é anexado). */
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  searchPlaceholder?: string
  /** Barra de ações padrão: Filtro · Incluir · Alterar · Consul. · Excluir/Cancelar · Imprimir. */
  actions?: DataTableAction<T>[]
  pageSizeOptions?: number[]
  /**
   * Coluna de numeração (DESIGN.md §DataTable): primeira coluna, 40px, valor
   * em Meta alinhado à direita, sequencial GLOBAL da consulta (a "linha 12"
   * que o operador diz em voz alta não muda ao trocar de página). Desligada
   * por padrão — listagem de cadastro não numera.
   */
  rowNumbers?: boolean
}

const SEARCH_DEBOUNCE_MS = 300

const SKELETON_ROWS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'] as const

export function VitraDataTable<T>({
  columns,
  queryKey,
  fetcher,
  searchPlaceholder = 'Busca pelo código:',
  actions = [],
  pageSizeOptions = [10, 20, 50],
  rowNumbers = false,
}: VitraDataTableProps<T>) {
  const [qInput, setQInput] = useState('')
  const [state, setState] = useState<TableQueryState>({
    q: '',
    sort: null,
    page: 1,
    pageSize: pageSizeOptions[0] ?? 10,
  })
  const [selected, setSelected] = useState<T | null>(null)

  // Toda mudança de estado de consulta limpa a seleção.
  function updateState(updater: (s: TableQueryState) => TableQueryState) {
    setSelected(null)
    setState(updater)
  }

  // Debounce da busca; qualquer mudança de busca volta para a página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => {
        if (s.q === qInput) return s
        setSelected(null)
        return { ...s, q: qInput, page: 1 }
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [qInput])

  const query = useQuery({
    queryKey: [...queryKey, state],
    queryFn: () => fetcher(state),
    placeholderData: keepPreviousData,
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize))

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  })

  // Folha total de colunas (grupos contam as folhas) + a numeração opcional.
  const totalColSpan = table.getAllLeafColumns().length + (rowNumbers ? 1 : 0)

  function toggleSort(columnId: string) {
    updateState((s) => {
      const next: TableSort | null =
        s.sort?.id !== columnId
          ? { id: columnId, desc: false }
          : s.sort.desc
            ? null
            : { id: columnId, desc: true }
      return { ...s, sort: next, page: 1 }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Busca"
            className="pl-8"
            placeholder={searchPlaceholder}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant ?? 'outline'}
            size="sm"
            disabled={action.needsSelection === true && selected === null}
            onClick={() => action.onClick?.(action.needsSelection ? selected : null)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {/* Contêiner da tabela: caixa em Régua, canto 4px (a malha interna é Fio). */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup, hgIndex, headerGroups) => (
              // Cabeçalho agrupado: fileira de grupo separada das sub-colunas
              // por Fio (a sublinha forte fica na fileira das folhas).
              <TableRow
                key={headerGroup.id}
                className={cn(hgIndex < headerGroups.length - 1 && 'border-rule-hair!')}
              >
                {rowNumbers && hgIndex === 0 ? (
                  <TableHead className="w-10" rowSpan={headerGroups.length} />
                ) : null}
                {headerGroup.headers.map((header) => {
                  const sortable =
                    header.column.columnDef.enableSorting !== false &&
                    'accessorKey' in header.column.columnDef
                  const active = state.sort?.id === header.column.id
                  const numeric = header.column.columnDef.meta?.numeric === true
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(header.colSpan > 1 && 'text-center', numeric && 'text-right')}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                          onClick={() => toggleSort(header.column.id)}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {active &&
                            (state.sort?.desc ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUp className="size-3.5" />
                            ))}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              SKELETON_ROWS.map((rowKey) => (
                <TableRow key={rowKey}>
                  <TableCell colSpan={totalColSpan}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : query.isError ? (
              // Falhou ≠ vazio: o operador precisa saber se avisa alguém ou se a
              // consulta não tem resultado mesmo. Com o backend real, essa
              // distinção é a diferença entre "some" e "não existe".
              <TableRow>
                <TableCell colSpan={totalColSpan} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    Não foi possível carregar a consulta.
                    {/* O `detail` do problem+json é a frase que o backend escolheu
                        para o caso — é a única informação acionável da resposta. */}
                    {query.error instanceof ErroDaApi && query.error.detail ? (
                      <span className="max-w-prose text-[0.75rem]">{query.error.detail}</span>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                      Tentar de novo
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalColSpan}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum registro.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => {
                const isSelected = selected !== null && row.original === selected
                return (
                  // Seleção = Bancada + marcador esquerdo de 2px em Régua Forte — estado
                  // nunca depende só de cor (a tinta sozinha não alcança 3:1 na vizinha).
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      'cursor-pointer hover:bg-muted',
                      isSelected && 'bg-muted shadow-[inset_2px_0_0_hsl(var(--rule-strong))]',
                    )}
                    onClick={() => setSelected(isSelected ? null : row.original)}
                  >
                    {rowNumbers ? (
                      // Numeração em Meta, sequencial global da consulta.
                      <TableCell className="w-10 text-right font-mono text-[0.75rem] font-medium tabular-nums tracking-[0.06em] text-muted-foreground">
                        {(state.page - 1) * state.pageSize + rowIndex + 1}
                      </TableCell>
                    ) : null}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.columnDef.meta?.numeric === true && 'text-right tabular-nums',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {/* Contagem em Meta (rótulo de rodapé de tabela); paginação em tabular. */}
        <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
          {/* Consulta que falhou não tem contagem: "0 registros" seria afirmar
              que a consulta voltou vazia, que é exatamente o que não se sabe. */}
          {query.isError ? '— registros' : `${total} registro${total === 1 ? '' : 's'}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="vitra-page-size">Por página:</label>
          <select
            id="vitra-page-size"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums"
            value={state.pageSize}
            onChange={(e) =>
              updateState((s) => ({ ...s, pageSize: Number(e.target.value), page: 1 }))
            }
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            disabled={state.page <= 1}
            onClick={() => updateState((s) => ({ ...s, page: s.page - 1 }))}
          >
            Anterior
          </Button>
          <span className="tabular-nums">
            Página {state.page} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={state.page >= pageCount}
            onClick={() => updateState((s) => ({ ...s, page: s.page + 1 }))}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
