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
 * Os quatro caminhos entraram no contrato marcados `Proposto` (§dashboard): são
 * pedido do front ao backend que ainda não existe, e no `VITE_API_MODE=mock`
 * quem responde é o handler de `src/mocks/api/handlers.ts`. A tela não sabe a
 * diferença — chama estes hooks, como manda a regra de acesso a dado.
 *
 * **Nada aqui inventa número.** O que o servidor não apura, a tela não mostra: a
 * variação contra o mês anterior sai de dois campos do próprio DTO
 * (`monthSalesCents` e `previousMonthSalesCents`), e é derivação, não estimativa.
 * Percentual pronto vindo do servidor seria número que o operador não consegue
 * conferir contra nada na tela.
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
