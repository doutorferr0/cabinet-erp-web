import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { COLUNAS, useTarefas } from '@/data/dashboard-api'
import { formatDateBR } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Prioridade } from './prioridade'

/**
 * A MESMA consulta do quadro, em fileira.
 *
 * Não usa a `DataTable` compartilhada, e é decisão: aquela peça é o ledger
 * server-ready — busca, ordenação e paginação num estado tipado que o backend
 * aplica. Tarefa não pagina (o contrato devolve o quadro inteiro, e o motivo
 * está escrito lá), então a `DataTable` traria uma barra de paginação que não
 * paginaria nada e cabeçalhos que ordenam por `sortBy` que o recurso não aceita.
 * Aqui a peça certa é a tabela crua — a mesma escolha que o Boletim faz.
 *
 * A vista existe porque quadro e lista respondem a perguntas diferentes: o
 * quadro mostra ONDE cada coisa está, a lista mostra QUANDO cada coisa vence,
 * numa coluna que o olho desce de uma vez.
 */
export function ListaDeTarefas({ busca }: { busca: string }) {
  const query = useTarefas(busca)
  const rotuloDaColuna = Object.fromEntries(COLUNAS.map((c) => [c.status, c.titulo]))

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {['l1', 'l2', 'l3', 'l4'].map((chave) => (
          <Skeleton key={chave} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <FalhaDoPainel
        titulo="A lista não carregou"
        erro={query.error}
        aoTentar={() => query.refetch()}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarefa</TableHead>
            <TableHead>Coluna</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Responsáveis</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {busca.trim() ? `Nenhuma tarefa para “${busca}”.` : 'Nenhuma tarefa no quadro.'}
              </TableCell>
            </TableRow>
          ) : (
            query.data.map((tarefa) => (
              <TableRow key={tarefa.id} className="hover:bg-muted">
                <TableCell>
                  <span
                    className={cn(
                      'font-semibold',
                      tarefa.status === 'done' && 'text-muted-foreground line-through',
                    )}
                  >
                    {tarefa.title}
                  </span>
                  {tarefa.description ? (
                    <span className="block truncate text-sm text-muted-foreground">
                      {tarefa.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{rotuloDaColuna[tarefa.status]}</TableCell>
                <TableCell>
                  <Prioridade prioridade={tarefa.priority} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {tarefa.dueOn ? (
                    formatDateBR(tarefa.dueOn)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="truncate">
                  {tarefa.assignees.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    tarefa.assignees.map((pessoa) => pessoa.name).join(', ')
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
