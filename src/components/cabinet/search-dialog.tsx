import { VitraDataTable } from '@/components/cabinet/data-table'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TableFetcher } from '@/lib/table-query'
import type { ColumnDef } from '@tanstack/react-table'

export interface SearchDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  columns: ColumnDef<T>[]
  queryKey: readonly unknown[]
  fetcher: TableFetcher<T>
  /** Chamado com a linha escolhida (botão Selecionar com linha marcada). */
  onSelect: (row: T) => void
}

/**
 * Janela auxiliar de busca — transcrição §9 padrão 5 (`[busca +...]`).
 * Reutiliza a MESMA VitraDataTable das listagens, com seleção e retorno.
 */
export function SearchDialog<T>({
  open,
  onOpenChange,
  title,
  columns,
  queryKey,
  fetcher,
  onSelect,
}: SearchDialogProps<T>) {
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Busque, clique na linha e confirme em Selecionar.</DialogDescription>
      </DialogHeader>
      <VitraDataTable
        columns={columns}
        queryKey={queryKey}
        fetcher={fetcher}
        actions={[
          {
            id: 'selecionar',
            label: 'Selecionar',
            variant: 'default',
            needsSelection: true,
            onClick: (row) => {
              if (!row) return
              onSelect(row)
              onOpenChange(false)
            },
          },
        ]}
      />
    </Dialog>
  )
}
