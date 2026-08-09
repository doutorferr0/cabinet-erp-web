import type { TaskDto, TaskDtoStatus } from '@/api/gerado'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
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
 *
 * ## A cor da coluna vem da SITUAÇÃO, não de módulo emprestado
 *
 * `mockup-dashboard-cores.html` pinta as quatro colunas com pastéis de módulo
 * (laranja de Boletim, azul de Estoque, roxo de Vendas, verde). O preenchimento
 * entra, a FONTE da cor não: coluna é situação da tarefa, e uma coluna roxa de
 * Vendas diria ao operador que `Em revisão` pertence àquele módulo — que é
 * exatamente a leitura que o par por módulo ensina no resto do sistema.
 *
 * As quatro leem as ZONAS, que é a família que já significa estado aqui:
 * informação · o violeta do que está ATIVO (o mesmo do "hoje" no calendário) ·
 * o amarelo de FOCO, que é o que uma revisão pede · e o verde, que já é a cor
 * do carimbo `done`. O efeito do mockup fica de pé — quatro colunas, quatro
 * preenchimentos distintos — e nenhuma cor mente sobre o que significa.
 */
const ZONA_DA_COLUNA: Record<TaskDtoStatus, string> = {
  todo: 'bg-zone-info',
  doing: 'bg-zone-id',
  review: 'bg-zone-warn',
  done: 'bg-zone-money',
}

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
            <MoreHorizontal className="text-modulo" />
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
    <section
      data-slot="coluna"
      data-status={status}
      // A coluna vira caixa própria com o preenchimento da situação. Os cartões
      // ficam em `bg-card` por cima — é o contraste que separa a tarefa da
      // coluna, e sem ele a pilha some dentro da pastel.
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-panel border-2 p-2.5 shadow-el1',
        ZONA_DA_COLUNA[status],
      )}
    >
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
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
    // A bancada afundada SAIU: ela existia para as quatro colunas não flutuarem
    // soltas, e agora cada coluna tem caixa, contorno e preenchimento próprios.
    // Mantida, seria um cinza atrás de quatro pastéis — o degrau que separava
    // viraria a sujeira que aproxima.
    //
    // `items-start`: cada coluna para onde os cartões dela param. Sem isto o
    // grid estica as quatro até a altura da mais cheia, e o que antes era um
    // vazio branco invisível virou um bloco de pastel do tamanho da diferença —
    // medido na conferência renderizada, com `Em andamento` de um cartão só ao
    // lado de `A fazer` com dois.
    // `auto-fit`/`minmax(238px,1fr)`, nunca `@media` (§@casca-global — regra
    // de quebra): as quatro colunas espremem antes de quebrar em duas linhas,
    // e a quebra reage ao espaço real — inclusive à gaveta de notificações
    // aberta encolhendo o `<main>`, que um breakpoint fixo não veria.
    <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] items-start gap-4">
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
