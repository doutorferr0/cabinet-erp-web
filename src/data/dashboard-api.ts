import type {
  AgendaEventDto,
  DashboardSummaryDto,
  TaskDto,
  TaskDtoStatus,
  TaskPatchRequest,
  TaskWriteRequest,
  TodoDto,
} from '@/api/gerado'
import {
  createTask,
  getDashboardSummary,
  listAgendaEvents,
  listTasks,
  listTodos,
  patchTask,
  patchTodo,
} from '@/api/gerado'
import { type RespostaDaApi, dadosOuErro, repetirSeValeAPena } from '@/data/api-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * FRONTEIRA DO DASHBOARD — resumo, agenda, quadro de tarefas e lista A fazer.
 *
 * Os quatro caminhos entraram no contrato marcados `Proposto` (§dashboard) — eram
 * pedido do front a um backend que ainda não os tinha. **Os quatro já são
 * servidos**, e os quatro estão na passagem de `src/mocks/rotas-do-backend.ts`;
 * a marca `Proposto` sobreviveu no texto do contrato e hoje descreve a origem
 * deles, não o estado. No `VITE_API_MODE=mock` quem responde continua sendo o
 * handler de `src/mocks/api/handlers.ts`, e a tela não sabe a diferença — chama
 * estes hooks, como manda a regra de acesso a dado.
 *
 * **Nada aqui inventa número.** O que o servidor não apura, a tela não mostra: a
 * variação contra o mês anterior sai de dois campos do próprio DTO
 * (`monthSalesCents` e `previousMonthSalesCents`), e é derivação, não estimativa.
 * Percentual pronto vindo do servidor seria número que o operador não consegue
 * conferir contra nada na tela.
 *
 * A recíproca dessa regra é o cartão `Pedidos a receber`: `incomingOrders` vem
 * do servidor, mas vem SEMPRE `0` porque ninguém o apura, e por isso a tela não
 * o imprime — ver `features/dashboard/indicadores.tsx`. Campo obrigatório no DTO
 * não é o mesmo que campo medido.
 */

/** Chaves de cache num lugar só: mutação que invalida a chave errada é bug mudo. */
export const CHAVES = {
  resumo: ['dashboard', 'resumo'] as const,
  agenda: (de: string, ate: string) => ['dashboard', 'agenda', de, ate] as const,
  tarefas: ['dashboard', 'tarefas'] as const,
  todos: ['dashboard', 'todos'] as const,
}

export function useResumoDoDashboard() {
  return useQuery({
    queryKey: CHAVES.resumo,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await getDashboardSummary()
      return dadosOuErro<DashboardSummaryDto>(resposta, 'Falha ao carregar os indicadores.')
    },
  })
}

/**
 * Compromissos do intervalo. UMA consulta serve o calendário do mês e a agenda
 * do dia — o recorte do dia é feito na tela, sobre o mesmo array. Duas consultas
 * mostrariam o mesmo compromisso em dois lugares com respostas de instantes
 * diferentes.
 *
 * `de`/`ate` são datas ISO (`YYYY-MM-DD`), inclusivas nas duas pontas.
 */
export function useAgenda(de: string, ate: string) {
  return useQuery({
    queryKey: CHAVES.agenda(de, ate),
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listAgendaEvents({ from: de, to: ate })
      return dadosOuErro<AgendaEventDto[]>(resposta, 'Falha ao carregar a agenda.')
    },
  })
}

/**
 * O quadro inteiro numa consulta. O filtro `q` viaja para o servidor em vez de
 * peneirar o array já carregado: a contagem do cabeçalho de cada coluna precisa
 * dizer quantos cartões a busca alcançou, e filtro só no cliente daria número
 * certo hoje e errado no dia em que o quadro passar do que cabe numa resposta.
 */
export function useTarefas(q?: string) {
  const busca = q?.trim() ? q.trim() : undefined
  return useQuery({
    queryKey: [...CHAVES.tarefas, busca ?? ''],
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listTasks(busca ? { q: busca } : undefined)
      return dadosOuErro<TaskDto[]>(resposta, 'Falha ao carregar as tarefas.')
    },
  })
}

export function useCriarTarefa() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async (corpo: TaskWriteRequest) => {
      const resposta: RespostaDaApi = await createTask(corpo)
      return dadosOuErro<TaskDto>(resposta, 'Falha ao criar a tarefa.')
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVES.tarefas }),
  })
}

/**
 * Mover de coluna e mudar prioridade são o MESMO verbo: `PATCH` parcial. Um
 * `PUT` a partir do cartão apagaria o que o cartão não carrega (descrição,
 * responsáveis) — é por isso que o contrato abre exceção à regra do `PUT` inteiro
 * justamente aqui.
 */
export function useAlterarTarefa() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: TaskPatchRequest }) => {
      const resposta: RespostaDaApi = await patchTask(id, mudanca)
      return dadosOuErro<TaskDto>(resposta, 'Falha ao alterar a tarefa.')
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVES.tarefas }),
  })
}

export function useTodos() {
  return useQuery({
    queryKey: CHAVES.todos,
    retry: repetirSeValeAPena,
    queryFn: async () => {
      const resposta: RespostaDaApi = await listTodos()
      return dadosOuErro<TodoDto[]>(resposta, 'Falha ao carregar a lista A fazer.')
    },
  })
}

export function useMarcarTodo() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, feito }: { id: string; feito: boolean }) => {
      const resposta: RespostaDaApi = await patchTodo(id, { done: feito })
      return dadosOuErro<TodoDto>(resposta, 'Falha ao marcar o item.')
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVES.todos }),
  })
}

/**
 * As quatro colunas do quadro, na ordem em que o trabalho anda. A ordem é da
 * TELA, não do contrato: o enum do DTO é um conjunto, e um `Object.values` dele
 * amarraria o desenho do quadro à ordem em que alguém digitou o enum no JSON.
 */
export const COLUNAS: ReadonlyArray<{ status: TaskDtoStatus; titulo: string }> = [
  { status: 'todo', titulo: 'A fazer' },
  { status: 'doing', titulo: 'Em andamento' },
  { status: 'review', titulo: 'Em revisão' },
  { status: 'done', titulo: 'Concluído' },
]

/**
 * Tarefas repartidas pelas colunas, preservando a ordem em que o servidor
 * mandou. Função pura e exportada porque é o que decide a contagem de cada
 * coluna — e contagem errada num quadro é o tipo de defeito que ninguém nota.
 *
 * Status fora das quatro colunas conhecidas é DESCARTADO em vez de virar uma
 * quinta coluna: o enum é fechado no contrato, e valor de fora é servidor
 * divergindo do contrato, não coluna nova.
 */
export function agruparPorColuna(tarefas: TaskDto[]): Record<TaskDtoStatus, TaskDto[]> {
  const vazio = { todo: [], doing: [], review: [], done: [] } as Record<TaskDtoStatus, TaskDto[]>
  for (const tarefa of tarefas) {
    vazio[tarefa.status]?.push(tarefa)
  }
  return vazio
}

/**
 * Variação percentual do mês contra o anterior, arredondada ao inteiro.
 *
 * `null` quando o mês anterior foi ZERO: não existe "cresceu 100%" sobre base
 * zero, e qualquer número ali seria invenção — a tela mostra o valor sem
 * comparação.
 */
export function variacaoDoMes(resumo: DashboardSummaryDto): number | null {
  if (resumo.previousMonthSalesCents === 0) return null
  const razao =
    (resumo.monthSalesCents - resumo.previousMonthSalesCents) / resumo.previousMonthSalesCents
  return Math.round(razao * 100)
}

/**
 * PROGRESSO DO QUADRO — concluídas, em aberto e total.
 *
 * Derivação pura das tarefas que a tela já carregou; nenhuma consulta nova e
 * nenhum campo inventado. `percentual` é `null` no quadro vazio: 0 de 0 não é
 * "0% concluído", é "não há o que concluir", e uma barra zerada ali diria que o
 * time está atrasado num projeto que não começou.
 */
export interface ProgressoDoQuadro {
  concluidas: number
  emAberto: number
  total: number
  percentual: number | null
}

export function progressoDoQuadro(tarefas: TaskDto[]): ProgressoDoQuadro {
  const concluidas = tarefas.filter((t) => t.status === 'done').length
  const total = tarefas.length
  return {
    concluidas,
    emAberto: total - concluidas,
    total,
    percentual: total === 0 ? null : Math.round((concluidas / total) * 100),
  }
}

/**
 * CARGA POR PESSOA — quantas tarefas cada responsável tem e quantas fechou.
 *
 * Uma tarefa com dois responsáveis conta para os DOIS: a pergunta é "quanto
 * cada um tem na mão", não "como se reparte o trabalho". Somar as linhas desta
 * lista, portanto, não dá o total do quadro — e é por isso que a tela não
 * mostra soma nenhuma aqui.
 *
 * Tarefa sem responsável fica de fora: ela é carga de ninguém, e uma linha
 * "sem responsável" no meio de nomes viraria uma pessoa que não existe. Quem
 * responde por ela é a coluna do quadro.
 *
 * Ordem: quem tem mais EM ABERTO primeiro — é a leitura que a lista existe para
 * dar. Empate desempata por nome, para a lista não dançar entre renderizações.
 */
export interface CargaDaPessoa {
  id: string
  nome: string
  iniciais: string
  total: number
  concluidas: number
  percentual: number
}

export function cargaPorPessoa(tarefas: TaskDto[]): CargaDaPessoa[] {
  const porPessoa = new Map<string, CargaDaPessoa>()

  for (const tarefa of tarefas) {
    for (const pessoa of tarefa.assignees) {
      const atual = porPessoa.get(pessoa.id) ?? {
        id: pessoa.id,
        nome: pessoa.name,
        iniciais: pessoa.initials,
        total: 0,
        concluidas: 0,
        percentual: 0,
      }
      atual.total += 1
      if (tarefa.status === 'done') atual.concluidas += 1
      porPessoa.set(pessoa.id, atual)
    }
  }

  return [...porPessoa.values()]
    .map((p) => ({ ...p, percentual: Math.round((p.concluidas / p.total) * 100) }))
    .sort(
      (a, b) => b.total - b.concluidas - (a.total - a.concluidas) || a.nome.localeCompare(b.nome),
    )
}
