import type { TaskDto } from '@/api/gerado'
import { progressoDoQuadro } from '@/data/dashboard-api'

/**
 * APURAÇÃO DO QUADRO — o que a faixa de KPIs afirma, sem tela no meio.
 *
 * A faixa do mockup (aba Quadro) diz três coisas: quantas fecharam, quantas
 * seguem abertas e quantas passaram do prazo. Duas saem de `progressoDoQuadro`
 * (`src/data/dashboard-api.ts`), que já existia e continua sendo a autoridade;
 * o que este arquivo acrescenta é o ATRASO, que ninguém derivava ainda.
 *
 * Tudo aqui é função pura sobre as tarefas que a tela já carregou — nenhuma
 * consulta nova e nenhum campo inventado. O KPI de atraso é o único número da
 * faixa que depende do DIA, e por isso `hoje` é PARÂMETRO: relógio lido dentro
 * da função tornaria o teste dependente da data em que ele roda, e um caso que
 * só falha em setembro é um caso que ninguém consegue reproduzir.
 *
 * ## O que o mockup pede e o contrato não dá
 *
 * O tile do mockup diz "2 concluídas **esta semana**". `TaskDto` não tem campo
 * de conclusão — só `status` —, então a janela de tempo não é derivável: a
 * única coisa verdadeira sobre as concluídas é quantas estão na coluna. A nota
 * do tile diz isso ("de N no quadro") em vez de repetir o mockup e afirmar uma
 * semana que o dado não conhece. Preencher com semana seria dado de mentira com
 * cara de dado do servidor, que é o proibido nº 1 do repo.
 */

/** Data de hoje em ISO (`YYYY-MM-DD`), no fuso de quem está olhando a tela. */
export function hojeISO(agora: Date = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

/**
 * Atrasada = tem prazo, o prazo já passou e a tarefa NÃO fechou.
 *
 * Vencer hoje não é atrasar: o dia ainda está correndo, e pintar de âmbar às
 * 9h uma tarefa que fecha às 17h ensina o operador a ignorar o âmbar. A
 * comparação é de STRING porque as duas datas são `YYYY-MM-DD` — ordem
 * lexicográfica e ordem cronológica coincidem nesse formato, e `new Date()`
 * sobre data sem hora entra como UTC e desloca o dia em fuso negativo.
 */
export function estaAtrasada(tarefa: TaskDto, hoje: string): boolean {
  if (tarefa.status === 'done') return false
  if (!tarefa.dueOn) return false
  return tarefa.dueOn.slice(0, 10) < hoje
}

/**
 * Quantos dias de atraso, contados em dias de calendário.
 *
 * `Date.UTC` nos dois lados de propósito: as duas pontas viram meia-noite UTC,
 * a subtração não pega horário de verão pelo caminho e o resultado é sempre
 * inteiro. Prazo no futuro dá zero, não negativo — "adiantada -3 dias" não é
 * uma frase que a tela precise saber dizer.
 */
export function diasDeAtraso(dueOn: string, hoje: string): number {
  const [ano, mes, dia] = dueOn.slice(0, 10).split('-').map(Number)
  const [anoH, mesH, diaH] = hoje.split('-').map(Number)
  if (ano === undefined || mes === undefined || dia === undefined) return 0
  if (anoH === undefined || mesH === undefined || diaH === undefined) return 0
  const prazo = Date.UTC(ano, mes - 1, dia)
  const agora = Date.UTC(anoH, mesH - 1, diaH)
  return Math.max(0, Math.round((agora - prazo) / 86_400_000))
}

export interface ApuracaoDoQuadro {
  concluidas: number
  emAberto: number
  total: number
  /** Quantas das em aberto estão na revisão — é a nota do tile "Em aberto". */
  emRevisao: number
  atrasadas: number
  /**
   * A atrasada com MAIOR atraso, que é a que a nota do tile nomeia. `null`
   * quando não há nenhuma — e aí a nota some, em vez de sair vazia.
   */
  piorAtraso: { titulo: string; dias: number } | null
}

export function apurarQuadro(tarefas: readonly TaskDto[], hoje: string): ApuracaoDoQuadro {
  const progresso = progressoDoQuadro([...tarefas])
  const atrasadas = tarefas.filter((tarefa) => estaAtrasada(tarefa, hoje))

  // A pior é a de prazo mais ANTIGO. Empate fica com a primeira que o servidor
  // mandou: desempatar por título aqui inventaria uma ordem que o operador não
  // pediu, e a nota do tile só precisa nomear uma.
  const pior = atrasadas.reduce<TaskDto | null>((maior, tarefa) => {
    if (maior === null) return tarefa
    return (tarefa.dueOn ?? '') < (maior.dueOn ?? '') ? tarefa : maior
  }, null)

  return {
    concluidas: progresso.concluidas,
    emAberto: progresso.emAberto,
    total: progresso.total,
    emRevisao: tarefas.filter((tarefa) => tarefa.status === 'review').length,
    atrasadas: atrasadas.length,
    piorAtraso:
      pior === null || !pior.dueOn
        ? null
        : { titulo: pior.title, dias: diasDeAtraso(pior.dueOn, hoje) },
  }
}
