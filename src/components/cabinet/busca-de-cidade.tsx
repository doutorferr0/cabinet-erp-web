import { SearchDialog } from '@/components/cabinet/search-dialog'
import { data } from '@/data'
import type { TableFetcher } from '@/lib/table-query'
import type { Cidade } from '@/mocks/cidades'
import type { ColumnDef } from '@tanstack/react-table'

const cidadeColumns: ColumnDef<Cidade>[] = [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nome', header: 'Cidade' },
  { accessorKey: 'uf', header: 'UF' },
]

export interface BuscaDeCidadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  onSelect: (cidade: Cidade) => void
}

/** Busca de cidade/naturalidade, compartilhada pelos formulários de pessoa. */
export function BuscaDeCidade({ open, onOpenChange, titulo, onSelect }: BuscaDeCidadeProps) {
  const fetcher: TableFetcher<Cidade> = (state) => data.cidades.list(state)

  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      title={titulo}
      columns={cidadeColumns}
      queryKey={['cidades']}
      fetcher={fetcher}
      onSelect={onSelect}
    />
  )
}
