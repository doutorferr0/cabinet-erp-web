import type { TaskDto, TaskDtoStatus } from '@/api/gerado'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { COLUNAS, agruparPorColuna, useAlterarTarefa, useTarefas } from '@/data/dashboard-api'
import { formatDateBR } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Calendar, MessageSquare, MoreHorizontal, Paperclip } from 'lucide-react'
import { FalhaDoPainel } from './falha'
import { Prioridade } from './prioridade'

/**
 * O QUADRO — as tarefas nas quatro colunas do andamento.
 *
 * ## Move-se por CLIQUE, não por arrasto
 *
 * A decisão de interface por clique (user, 30/07/2026) diz que toda ação é
 * alcançável por mouse e nenhum fluxo depende de gesto ou tecla memorizada.
 * Arrastar cartão é o gesto clássico do kanban e falha exatamente nisso: não
 * existe para quem opera por teclado, não existe em leitor de tela, e num ERP
 * denso ainda concorre com a rolagem da coluna. Cada cartão traz o menu `⋯` com
 * as outras três colunas — um clique a mais que o arrasto, e alcançável por
 * todo mundo.
 *
 * Isto também é o que dispensa uma dependência nova (`dnd-kit` e parentes) num
 * repo com trava de idade de pacote — a alternativa não é "kanban pior", é
 * kanban operável.
 */

/**
 * Avatares empilhados. Roxo de MARCA é o tom de avatar no DESIGN.md (§Acentos:
 * "roxo — marca e realce (avatar, badge)"), e é o mesmo para todo mundo de
 * propósito: cor por pessoa viraria uma nona, décima, décima-primeira cor sem
 * dono, e a paleta de módulo perderia o significado que ela tem hoje.
 */
function Avatares({ pessoas }: { pessoas: TaskDto['assignees'] }) {
  if (pessoas.length === 0) return null
  const visiveis = pessoas.slice(0, 3)
  const resto = pessoas.length - visiveis.length

  return (
    <span className="ml-auto flex items-center">
      {visiveis.map((pessoa) => (
        <span
          key={pessoa.id}
          title={pessoa.name}
          className="-ml-1.5 grid size-6 place-content-center rounded-item border-2 bg-accent font-mono text-[0.75rem] font-medium first:ml-0"
        >
          {pessoa.initials}
        </span>
      ))}
      {resto > 0 ? (
        <span className="-ml-1.5 grid size-6 place-content-center rounded-item border-2 bg-card font-mono text-[0.75rem] font-medium">
          +{resto}
        </span>
      ) : null}
    </span>
  )
}

function Cartao({ tarefa }: { tarefa: TaskDto }) {
  const alterar = useAlterarTarefa()
  const destinos = COLUNAS.filter((coluna) => coluna.status !== tarefa.status)
  const concluida = tarefa.status === 'done'

  return (
    <li
      data-slot="tarefa"
      data-status={tarefa.status}
      className="rounded-card border-2 bg-card p-2.5"
    >
      <div className="flex items-start gap-1">
        <span
          className={cn(
            'font-display font-semibold leading-tight',
            // Concluído se lê riscado, e não só por cor: o mesmo motivo do
            // carimbo — cor sozinha não diz estado (WCAG 1.4.1).
            concluida && 'text-muted-foreground line-through',
          )}
        >
          {tarefa.title}
        </span>

        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label={`Ações de ${tarefa.title}`}
          >
            <MoreHorizontal />
          </Button>
          <DropdownMenu placement="bottom end">
            <DropdownMenuLabel>Mover para</DropdownMenuLabel>
            {destinos.map((coluna) => (
              <DropdownMenuItem
                key={coluna.status}
                onAction={() =>
                  alterar.mutate({ id: tarefa.id, mudanca: { status: coluna.status } })
                }
              >
                {coluna.titulo}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      {tarefa.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{tarefa.description}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-1.5 text-sm text-muted-foreground">
        {tarefa.dueOn ? (
          <span className="flex items-center gap-1 tabular-nums">
            <Calendar className="size-3.5" aria-hidden="true" />
            {formatDateBR(tarefa.dueOn)}
          </span>
        ) : null}
        <span className="flex items-center gap-1 tabular-nums">
          <MessageSquare className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Comentários:</span>
          {tarefa.commentCount}
        </span>
        <span className="flex items-center gap-1 tabular-nums">
          <Paperclip className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Anexos:</span>
          {tarefa.attachmentCount}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Prioridade prioridade={tarefa.priority} />
        <Avatares pessoas={tarefa.assignees} />
      </div>
    </li>
  )
}

function Coluna({
  status,
  titulo,
  tarefas,
  aoIncluir,
}: {
  status: TaskDtoStatus
  titulo: string
  tarefas: TaskDto[]
  aoIncluir: (status: TaskDtoStatus) => void
}) {
  return (
    <section data-slot="coluna" data-status={status} className="flex min-w-0 flex-col gap-2">
      <header className="flex items-center gap-2 rounded-card border-2 bg-card px-2 py-1.5">
        <h3 className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
          {titulo}
        </h3>
        <span className="rounded-item border-2 px-1.5 font-mono text-[0.75rem] font-medium tabular-nums">
          {tarefas.length}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label={`Incluir tarefa em ${titulo}`}
          onClick={() => aoIncluir(status)}
        >
          +
        </Button>
      </header>

      {tarefas.length === 0 ? (
        <p className="rounded-card border-2 border-dashed p-3 text-center text-sm text-muted-foreground">
          Nenhuma tarefa aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tarefas.map((tarefa) => (
            <Cartao key={tarefa.id} tarefa={tarefa} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function Quadro({
  busca,
  aoIncluir,
}: { busca: string; aoIncluir: (status: TaskDtoStatus) => void }) {
  const query = useTarefas(busca)

  if (query.isPending) {
    return (
      <div className="grid gap-3 lg:grid-cols-4">
        {COLUNAS.map((coluna) => (
          <Skeleton key={coluna.status} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <FalhaDoPainel
        titulo="O quadro não carregou"
        erro={query.error}
        aoTentar={() => query.refetch()}
      />
    )
  }

  const porColuna = agruparPorColuna(query.data)

  if (busca.trim() && query.data.length === 0) {
    return (
      <p className="rounded-card border-2 bg-card p-6 text-center text-sm text-muted-foreground">
        Nenhuma tarefa encontrada para “{busca}”.
      </p>
    )
  }

  return (
    // A bancada do quadro: as colunas pousam sobre a superfície afundada, que é
    // o degrau interno da folha — sem ela as quatro colunas flutuariam soltas.
    <div className="grid gap-3 rounded-panel border-2 bg-surface-sunken p-3 lg:grid-cols-4">
      {COLUNAS.map((coluna) => (
        <Coluna
          key={coluna.status}
          status={coluna.status}
          titulo={coluna.titulo}
          tarefas={porColuna[coluna.status]}
          aoIncluir={aoIncluir}
        />
      ))}
    </div>
  )
}
