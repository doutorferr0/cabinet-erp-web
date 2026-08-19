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
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { Calendar, MessageSquare, MoreHorizontal, Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Prioridade } from './prioridade'

/**
 * O QUADRO — as tarefas nas quatro colunas do andamento.
 *
 * ## Move-se por CLIQUE **e** por arrasto — nesta ordem
 *
 * O arrasto entrou com `@atlaskit/pragmatic-drag-and-drop` (#229). O menu `⋯`
 * NÃO saiu, e a ordem da frase é a regra: o clique continua sendo o caminho
 * completo, o arrasto é atalho por cima dele.
 *
 * A decisão de interface por clique (user, 30/07/2026) diz que toda ação é
 * alcançável por mouse e nenhum fluxo depende de gesto ou tecla memorizada.
 * Arrastar falha nisso sozinho: não existe para quem opera por teclado nem em
 * leitor de tela. O que a issue pediu foi somar o gesto, e trocar um pelo outro
 * teria REGREDIDO a acessibilidade que o menu garante — por isso o menu é o que
 * os testes de teclado vigiam, e ele é a base de comparação, não o arrasto.
 *
 * A peça foi escolhida por não ter opinião de estilo: ela publica eventos e não
 * pinta nada, então o realce de coluna abaixo é escrito com os tokens do
 * `DESIGN.md`, e não com CSS de terceiro.
 *
 * ## Arrastar troca de COLUNA, e só
 *
 * `TaskPatchRequest` tem `status`, e não tem campo de ordem — reordenar dentro
 * da coluna não é coisa que o contrato saiba dizer, e inventar aqui seria
 * escrever no servidor um pedido que ele não entende. Por isso a coluna inteira
 * é o alvo do arrasto, e não a posição entre dois cartões: o realce diz "vai
 * para esta coluna", que é a verdade do que vai acontecer. O quadro do funil
 * reordena porque LÁ o contrato tem `precedeId`.
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
/**
 * A etiqueta do que está sendo arrastado.
 *
 * O adaptador de elemento é GLOBAL: um cartão do funil arrastado numa tela que
 * também tenha o quadro de tarefas chegaria aqui como origem válida. A etiqueta
 * é o que faz o alvo recusar o que não é dele, em vez de tentar mover pelo id.
 */
const TIPO_CARTAO = 'tarefa'

/**
 * Para qual coluna o cartão vai — `null` quando o arrasto não move nada.
 *
 * Pura e exportada porque é a decisão inteira do gesto: soltar fora de coluna
 * nenhuma e soltar na coluna de origem são os dois casos que NÃO podem virar
 * requisição. Um `PATCH` que grava o status que já estava lá volta 200, não
 * muda nada na tela e some no log — o defeito mais caro de achar.
 */
export function colunaDoArrasto(
  cartao: { status: TaskDtoStatus },
  alvo: { status: TaskDtoStatus } | undefined,
): TaskDtoStatus | null {
  if (alvo === undefined) return null
  return alvo.status === cartao.status ? null : alvo.status
}

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
  const caixa = useRef<HTMLLIElement>(null)
  const [arrastando, setArrastando] = useState(false)

  /**
   * O que o gesto precisa saber, sempre fresco, SEM entrar nas dependências.
   *
   * O efeito abaixo roda uma vez por cartão de propósito. Pôr `tarefa` ou o
   * resultado de `useMutation` nas dependências parece mais correto e não é: o
   * `useMutation` devolve objeto novo a cada render, e o próprio
   * `setArrastando(true)` re-renderiza no meio do arrasto — o efeito
   * desregistraria o `draggable` com o cartão no ar, e o `onDrop` nunca
   * chegaria. Falha que só aparece com o mouse na mão.
   */
  const agora = useRef({ tarefa, alterar })
  agora.current = { tarefa, alterar }

  // Quem grava é o CARTÃO que foi arrastado, e não um monitor no alto do
  // quadro: a mutação e o recado de falha já moram aqui, e um monitor de fora
  // gravaria por uma segunda instância do hook — a falha apareceria longe do
  // cartão que não se mexeu, ou não apareceria.
  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    return draggable({
      element: elemento,
      getInitialData: () => ({
        tipo: TIPO_CARTAO,
        id: agora.current.tarefa.id,
        status: agora.current.tarefa.status,
      }),
      onDragStart: () => setArrastando(true),
      onDrop: ({ location }) => {
        setArrastando(false)
        const alvo = location.current.dropTargets[0]?.data as { status?: TaskDtoStatus } | undefined
        const destino = colunaDoArrasto(
          agora.current.tarefa,
          alvo?.status === undefined ? undefined : { status: alvo.status },
        )
        if (destino === null) return
        agora.current.alterar.mutate({
          id: agora.current.tarefa.id,
          mudanca: { status: destino },
        })
      },
    })
  }, [])

  return (
    <li
      ref={caixa}
      data-slot="tarefa"
      data-status={tarefa.status}
      data-arrastando={arrastando ? '' : undefined}
      className={cn(
        'rounded-card border-2 bg-card p-2.5',
        // O cartão em trânsito some pela metade: ele continua no lugar de
        // origem enquanto o gesto não termina, e sem isso o operador vê duas
        // cópias do mesmo cartão — a que ele arrasta e a que ficou.
        arrastando && 'opacity-40',
      )}
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
  const caixa = useRef<HTMLElement>(null)
  const [sobVoo, setSobVoo] = useState(false)

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    return dropTargetForElements({
      element: elemento,
      // A coluna de ORIGEM recusa o próprio cartão: sem isto ela acende junto
      // com o resto e promete um movimento que `colunaDoArrasto` vai descartar.
      canDrop: ({ source }) => source.data.tipo === TIPO_CARTAO && source.data.status !== status,
      getData: () => ({ tipo: 'coluna', status }),
      onDragEnter: () => setSobVoo(true),
      onDragLeave: () => setSobVoo(false),
      onDrop: () => setSobVoo(false),
    })
  }, [status])

  return (
    <section
      ref={caixa}
      data-slot="coluna"
      data-status={status}
      data-sob-voo={sobVoo ? '' : undefined}
      // A coluna vira caixa própria com o preenchimento da situação. Os cartões
      // ficam em `bg-card` por cima — é o contraste que separa a tarefa da
      // coluna, e sem ele a pilha some dentro da pastel.
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-panel border-2 p-2.5 shadow-el1',
        ZONA_DA_COLUNA[status],
        // A coluna que vai receber sobe um DEGRAU de elevação (§Elevação), e
        // não muda de cor: a cor daqui já significa a situação da tarefa, e um
        // realce colorido diria que a coluna virou outra coisa enquanto o dedo
        // passa. O amarelo também está fora — ele é a identidade do FOCO, e
        // dois significados no mesmo tom é o que o DESIGN.md chama de duas
        // leituras de estado brigando.
        sobVoo && 'shadow-el2',
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
