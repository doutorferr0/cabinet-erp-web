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
import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { diasDeAtraso, estaAtrasada, hojeISO } from './apuracao'
import { Prioridade } from './prioridade'

/**
 * O QUADRO — as tarefas nas quatro colunas do andamento, no desenho 2.0.
 *
 * ## O que a Reface 2.0 mudou aqui (mockup, aba Quadro)
 *
 * O 1.x pintava a COLUNA inteira com a pastel da situação e punha um cartão
 * branco de contorno grosso por cima. Lido de longe, o quadro virava quatro
 * blocos de cor com retângulos dentro: a cor dominava e o cartão — que é o
 * objeto que o operador move — era o que menos aparecia. Invertemos:
 *
 * - **Coluna em `--n-50`, sem borda.** Tint é a ferramenta mais barata que
 *   separa região por natureza (§Hierarquia), e borda por cima dela seria a
 *   segunda ferramenta na mesma fronteira. A cor da situação não sumiu: foi
 *   para o quadradinho do cabeçalho, que é onde ela informa sem tingir tudo.
 *   (O mockup ainda leva uma borda superior de 3px na cor; a issue pede coluna
 *   sem borda, e o quadradinho já carrega a mesma informação.)
 * - **O cartão é o card**, e o único: folha `--n-0`, borda `--n-300`,
 *   `--hard-soft` parado. No hover ele LEVANTA — `--hard-1` (sombra de tinta),
 *   borda `--n-900` e 1px para cima e para a esquerda. É a única mudança de
 *   profundidade do quadro, e ela acontece onde a mão vai.
 * - **Dentro do cartão, só espaço e hairline.** Prioridade em pílula pastel,
 *   prazo e contadores em mono, avatares empilhados de 20px. Nada de terceiro
 *   nível de card.
 *
 * ## Move-se por CLIQUE **e** por arrasto — nesta ordem
 *
 * O arrasto entrou com `@atlaskit/pragmatic-drag-and-drop` (#229) e o menu `⋯`
 * NÃO saiu. A decisão de interface por clique (user, 30/07/2026) diz que toda
 * ação é alcançável por mouse e nenhum fluxo depende de gesto: arrastar falha
 * nisso sozinho — não existe para quem opera por teclado nem em leitor de tela.
 * O gesto SOMA, e é por isso que o menu é o que os testes de teclado vigiam.
 *
 * ## Arrastar troca de COLUNA, e só
 *
 * `TaskPatchRequest` tem `status` e não tem campo de ordem — reordenar dentro
 * da coluna é coisa que o contrato não sabe dizer, e inventar aqui seria mandar
 * ao servidor um pedido que ele não entende. Por isso o alvo do arrasto é a
 * coluna inteira, e não a posição entre dois cartões: o realce promete
 * exatamente o que vai acontecer. O quadro do funil reordena porque LÁ o
 * contrato tem `precedeId`.
 *
 * ## Por que o quadro é local, e não o `ModoKanban` genérico de D12
 *
 * O kanban genérico (`components/cabinet/listagem/modo-kanban.tsx`) está
 * mergeado nesta branch e é usado — na visão Calendário desta mesma tela, pelo
 * irmão `ModoCalendario`. O que ele não serve é o CARTÃO: por decisão dele,
 * `CartaoDoQuadro` tem cinco lugares fixos (título, subtítulo, badge, data,
 * valor em centavos) e nenhum slot livre. O cartão de tarefa do mockup tem
 * quatro elementos fora dessa lista — pílula de prioridade, contadores
 * `↩n ⌗n`, avatares empilhados e o riscado da concluída — mais o `+` no
 * cabeçalho da coluna. Usá-lo apagaria os cinco do desenho aprovado; ampliá-lo
 * seria editar a zona de D12. Fica local, com o MESMO vocabulário visual
 * (coluna `--n-50` sem borda, cartão que levanta do `--hard-soft` para o
 * `--hard-1`), e a fusão volta quando o cartão genérico tiver slot rico.
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

/**
 * A cor da coluna vem da SITUAÇÃO, e mora só no quadradinho.
 *
 * `A fazer` é neutro de propósito: o que ainda não começou não tem estado
 * próprio, e dar-lhe matiz gastaria uma cor para dizer "nada aconteceu".
 * Os outros três leem a semântica que já significa estado no sistema — o azul
 * do que está em curso, o âmbar do que pede atenção, o verde do que fechou.
 */
const COR_DA_COLUNA: Record<TaskDtoStatus, string> = {
  todo: 'var(--n-400)',
  doing: 'var(--sky-400)',
  review: 'var(--amber-400)',
  done: 'var(--mint-400)',
}

/**
 * As iniciais dentro de um avatar de 20px.
 *
 * §Hierarquia não tem degrau abaixo de `--t-dado-meta` (11px), e 11px não cabe
 * num círculo de 20 — o mockup escreve 9px ali. Entra pelo mecanismo da regra 4
 * do regime paralelo (token faltando → `var(--x, <fallback>)`), como o
 * `KpiTile` já fez com `--t-kpi-valor`, e o pedido de promover o degrau está
 * registrado na #469. Nunca como literal solto: `text-[9px]` é exatamente o que
 * D30 grepa em `src`.
 */
const INICIAIS = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--t-avatar-iniciais, 9px)',
  lineHeight: 1,
  fontWeight: 500,
} as const

/**
 * Avatares empilhados de 20px (mockup `.avs`).
 *
 * Três visíveis e o resto vira `+n`: a pilha existe para dizer "quem", e a
 * partir do quarto ela só diz "muita gente" — que o `+n` diz melhor e em menos
 * espaço.
 *
 * Tint ÚNICO aqui, como no mockup: no cartão a pilha responde "quantos e
 * quem", e quatro pastéis diferentes dentro de uma tira de 60px competiriam
 * com a pílula de prioridade ao lado, que é a cor que precisa ser vista. Quem
 * distingue pessoa por cor é a carga da faixa (`faixa.tsx`), onde cada pessoa
 * tem uma linha só sua.
 */
function Avatares({ pessoas }: { pessoas: TaskDto['assignees'] }) {
  if (pessoas.length === 0) return null
  const visiveis = pessoas.slice(0, 3)
  const resto = pessoas.length - visiveis.length

  return (
    <span className="ml-auto flex shrink-0 items-center">
      {visiveis.map((pessoa) => (
        <span
          key={pessoa.id}
          title={pessoa.name}
          className="-ml-1.5 grid size-5 place-content-center rounded-item border border-[var(--n-300)] first:ml-0"
          style={{ ...INICIAIS, background: 'var(--tint-lilac)', color: 'var(--n-900)' }}
        >
          {pessoa.initials}
        </span>
      ))}
      {resto > 0 ? (
        <span
          className="-ml-1.5 grid size-5 place-content-center rounded-item border border-[var(--n-300)]"
          style={{ ...INICIAIS, background: 'var(--n-0)', color: 'var(--n-500)' }}
        >
          +{resto}
        </span>
      ) : null}
    </span>
  )
}

function Cartao({ tarefa, hoje }: { tarefa: TaskDto; hoje: string }) {
  const alterar = useAlterarTarefa()
  const destinos = COLUNAS.filter((coluna) => coluna.status !== tarefa.status)
  const concluida = tarefa.status === 'done'
  const atrasada = estaAtrasada(tarefa, hoje)
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
        'flex cursor-grab flex-col rounded-control border border-[var(--n-300)] bg-[var(--n-0)] shadow-[var(--hard-soft)]',
        // O papel LEVANTA: `--hard-soft` (cinza, parado) vira `--hard-1` (sombra
        // de tinta) e o cartão anda 1px para cima e para a esquerda, como se
        // saísse da mesa. É a única profundidade que muda no quadro.
        'transition-[transform,box-shadow,border-color] duration-[var(--dur-1)] ease-[var(--ease)]',
        'hover:-translate-x-px hover:-translate-y-px hover:border-[var(--n-900)] hover:shadow-[var(--hard-1)]',
        // O cartão em trânsito some pela metade: ele continua no lugar de
        // origem enquanto o gesto não termina, e sem isso o operador vê duas
        // cópias do mesmo cartão — a que ele arrasta e a que ficou.
        arrastando && 'opacity-40',
      )}
      style={{ gap: 'var(--s-2)', padding: 'var(--s-2) var(--s-3)' }}
    >
      <div className="flex items-start gap-1">
        <span
          className={cn(
            't-ui min-w-0 flex-1',
            // Concluída se lê riscada, e não só por cor: o mesmo motivo do
            // carimbo — cor sozinha não diz estado (WCAG 1.4.1).
            concluida && 'line-through',
          )}
          style={concluida ? { color: 'var(--n-500)' } : undefined}
        >
          {tarefa.title}
        </span>

        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${tarefa.title}`}>
            <MoreHorizontal aria-hidden="true" />
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

      {tarefa.description ? <p className="t-meta">{tarefa.description}</p> : null}

      {/* A tira de meta: prioridade · prazo · contadores · avatares. Tudo numa
          linha só, e sem hairline acima — o espaço já separa, e a linha seria a
          segunda ferramenta na mesma fronteira. Contador em mono porque é dado
          que se compara entre cartões. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {concluida ? null : <Prioridade prioridade={tarefa.priority} />}

        {tarefa.dueOn ? (
          <span
            className="t-dado-meta"
            // Atrasada é a única cor que entra no prazo, e ela vem com a
            // palavra junto: âmbar sozinho não diz "atrasada" para quem não
            // enxerga a diferença.
            style={atrasada ? { color: 'var(--warn)', fontWeight: 600 } : undefined}
          >
            {formatDateBR(tarefa.dueOn.slice(0, 10))}
            {atrasada ? ` · atrasada ${diasDeAtraso(tarefa.dueOn, hoje)}d` : ''}
          </span>
        ) : null}

        {tarefa.commentCount > 0 || tarefa.attachmentCount > 0 ? (
          <span className="t-dado-meta">
            <span className="sr-only">Comentários: </span>↩{tarefa.commentCount}
            {' · '}
            <span className="sr-only">Anexos: </span>⌗{tarefa.attachmentCount}
          </span>
        ) : null}

        <Avatares pessoas={tarefa.assignees} />
      </div>
    </li>
  )
}

function Coluna({
  status,
  titulo,
  tarefas,
  hoje,
  aoIncluir,
}: {
  status: TaskDtoStatus
  titulo: string
  tarefas: TaskDto[]
  hoje: string
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
      className={cn(
        'flex min-w-0 flex-col rounded-card bg-[var(--n-50)]',
        // O realce do alvo é ANEL, e não borda: borda mudaria a largura da
        // coluna e o quadro inteiro andaria de lado quando o cartão passa por
        // cima. Anel de tinta, não de cor — a cor daqui já significa a situação
        // da tarefa, e um realce colorido diria que a coluna virou outra coisa
        // enquanto o dedo passa.
        sobVoo && 'ring-2 ring-[var(--n-900)]',
      )}
      style={{ gap: 'var(--s-2)', padding: 'var(--s-2)' }}
    >
      {/* Quadradinho + nome + contagem + `+`. O cabeçalho não tem caixa nem
          fundo próprio: a coluna já é a região, e uma barra branca aqui seria um
          card dentro do tint. */}
      <header className="flex items-center gap-2" style={{ padding: '0 var(--s-1)' }}>
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-[2px]"
          style={{ background: COR_DA_COLUNA[status] }}
        />
        <h3 className="t-bloco truncate">{titulo}</h3>
        <span className="t-dado-meta shrink-0">{tarefas.length}</span>
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
        // Sem borda tracejada: dentro de uma região tintada, o vazio se diz com
        // texto, e a moldura seria mais uma caixa onde não há objeto nenhum.
        <p className="t-meta text-center" style={{ padding: 'var(--s-3) 0' }}>
          Nenhuma tarefa aqui.
        </p>
      ) : (
        <ul className="flex flex-col" style={{ gap: 'var(--s-2)' }}>
          {tarefas.map((tarefa) => (
            <Cartao key={tarefa.id} tarefa={tarefa} hoje={hoje} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function Quadro({
  busca,
  aoIncluir,
  hoje = hojeISO(),
}: { busca: string; aoIncluir: (status: TaskDtoStatus) => void; hoje?: string }) {
  const query = useTarefas(busca)

  if (query.isPending) {
    return (
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))]"
        style={{ gap: 'var(--s-3)' }}
      >
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
      <p
        className="t-meta rounded-card border border-[var(--n-300)] bg-[var(--n-0)] text-center"
        style={{ padding: 'var(--s-5)' }}
      >
        Nenhuma tarefa encontrada para “{busca}”.
      </p>
    )
  }

  return (
    // `items-start`: cada coluna para onde os cartões dela param. Sem isto o
    // grid estica as quatro até a altura da mais cheia, e o tint da coluna vazia
    // vira um bloco do tamanho da diferença.
    // `auto-fit`/`minmax(240px,1fr)`, nunca `@media`: as quatro espremem antes
    // de quebrar em duas linhas, e a quebra reage ao espaço real — inclusive à
    // gaveta de notificações aberta encolhendo o `<main>`.
    <div
      className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start"
      style={{ gap: 'var(--s-3)' }}
    >
      {COLUNAS.map((coluna) => (
        <Coluna
          key={coluna.status}
          status={coluna.status}
          titulo={coluna.titulo}
          tarefas={porColuna[coluna.status]}
          hoje={hoje}
          aoIncluir={aoIncluir}
        />
      ))}
    </div>
  )
}
