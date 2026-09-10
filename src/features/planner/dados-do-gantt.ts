import type { PlanItemDtoKind, PlanPhaseDto, ProjectPlanDto } from '@/api/gerado'
import type { Modulo } from '@/app/modulo'
import type { Reagendamento } from '@/data/planner-api'

/**
 * O PLANO DO CONTRATO → o que o SVAR Gantt come.
 *
 * Este arquivo substitui `escala.ts`, e a troca é de RESPONSABILIDADE, não de
 * implementação: a geometria da grade (de que mês a que mês, onde cada barra
 * cai, largura mínima de um dia, onde hoje entra) era nossa e por isso precisava
 * de teste; agora é do SVAR. O que sobra aqui é a TRADUÇÃO — e tradução é
 * exatamente o que continua sendo nosso e continua testável sem montar tela.
 *
 * ## Fase é tarefa-resumo, item é filho
 *
 * O contrato dá `phases[].items[]`, duas camadas. O SVAR não tem "fase": tem
 * árvore de tarefas com `parent`, e `type: 'summary'` para o pai. A fase vira
 * resumo e o item vira filho — que é o que faz a coluna da esquerda agrupar
 * sozinha, sem a coluna de fases desenhada à mão que a versão anterior tinha.
 *
 * **Ids ganham prefixo.** `phases[].id` e `items[].id` são uuids de tabelas
 * diferentes e podem coincidir; no SVAR os dois viram nós do MESMO conjunto, e
 * id repetido faz o filho virar pai de si mesmo. `fase:` e `item:` separam os
 * dois espaços de nome, e a volta (`idOriginal`) desfaz.
 */

const DIA_MS = 86_400_000

/** Meia-noite LOCAL do dia ISO. Nunca `new Date(iso)` cru: aquilo lê UTC. */
export function dataDoDia(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1)
}

/**
 * A cor da barra segue o TIPO, não a fase — decisão registrada quando o gantt
 * era caseiro, e mantida na troca.
 *
 * A fase já é lida pela coluna da esquerda, que agrupa e nomeia; pintar a barra
 * pela fase repetiria essa informação e gastaria o único canal de cor que
 * sobra. Pelo TIPO, a cor diz o que a barra É, e usa o par de módulo que o
 * sistema já ensinou em outras telas — o mesmo mapa da agenda do Dashboard.
 */
export const TIPOS: Record<PlanItemDtoKind, { rotulo: string; modulo: Modulo }> = {
  task: { rotulo: 'Tarefa', modulo: 'vendas' },
  order: { rotulo: 'Pedido', modulo: 'compras' },
  delivery: { rotulo: 'Entrega', modulo: 'estoque' },
}

/** O que a barra precisa saber de si — o que o `taskTemplate` vai ler. */
export interface TarefaDoGantt {
  id: string
  text: string
  type: 'summary' | 'task' | 'milestone'
  start: Date
  /**
   * FIM EXCLUSIVO — e é a diferença de convenção que mais dá erro de um dia.
   *
   * O contrato diz `endsOn` inclusivo (uma entrega que começa e termina no dia
   * 10 dura um dia). O SVAR trata `end` como limite exclusivo, então mandar o
   * mesmo valor produziria barra de duração ZERO, que some da tela — e o
   * operador concluiria que a entrega não está planejada.
   */
  end: Date
  progress?: number
  parent?: string
  open?: boolean
  /** Só nos filhos. O `taskTemplate` pinta por ele. */
  tipo?: PlanItemDtoKind
}

/**
 * MARCO é o item que começa e acaba no MESMO dia.
 *
 * O contrato não tem campo de marco, e não precisa ter: um item de um dia já é
 * um marco por definição — é uma data em que algo acontece, não um período em
 * que algo corre. "Entrega final", "Aprovação do cliente" e "Visita técnica"
 * nascem assim no plano, e desenhá-los como barra de um dia produz um retângulo
 * de 3px que o olho lê como sujeira da grade.
 *
 * O SVAR desenha `type: 'milestone'` como losango, e `gantt-2.0.css` o pinta em
 * n-900 — a mesma tinta da linha do hoje, porque as duas coisas são a mesma
 * espécie: instante, não intervalo.
 *
 * **Isto é derivação, não campo novo.** Se um dia o contrato publicar `kind:
 * 'milestone'`, esta função vira a leitura daquele campo e nada mais muda.
 */
export function ehMarco(startsOn: string, endsOn: string): boolean {
  return startsOn === endsOn
}

/** `fase:<uuid>` / `item:<uuid>` — ver a nota de ids no topo. */
export function idDaFase(id: string): string {
  return `fase:${id}`
}
export function idDoItem(id: string): string {
  return `item:${id}`
}
/** Desfaz o prefixo. Devolve `null` para id que não veio daqui. */
export function idOriginal(id: string): string | null {
  const corte = id.indexOf(':')
  return corte < 0 ? null : id.slice(corte + 1)
}

/** Dia seguinte ao ISO — a ponta exclusiva que o SVAR espera. */
function diaSeguinte(iso: string): Date {
  return new Date(dataDoDia(iso).getTime() + DIA_MS)
}

/**
 * As tarefas do plano, na ordem em que o contrato as deu.
 *
 * A ordem NÃO é reordenada por data de propósito: `phases` é a sequência que o
 * projeto tem, e ordenar por início faria uma fase de preparo que começa tarde
 * saltar para o meio da obra.
 */
export function tarefasDoPlano(plano: ProjectPlanDto): TarefaDoGantt[] {
  const tarefas: TarefaDoGantt[] = []
  for (const fase of plano.phases) {
    tarefas.push({
      id: idDaFase(fase.id),
      text: fase.name,
      type: 'summary',
      start: dataDoDia(fase.startsOn),
      end: diaSeguinte(fase.endsOn),
      // Aberta: o plano existe para mostrar os itens. Fase fechada por padrão
      // faria o Planner abrir com uma lista de fases e nenhuma barra.
      open: true,
    })
    for (const item of fase.items) {
      tarefas.push({
        id: idDoItem(item.id),
        parent: idDaFase(fase.id),
        text: item.label,
        type: ehMarco(item.startsOn, item.endsOn) ? 'milestone' : 'task',
        start: dataDoDia(item.startsOn),
        end: diaSeguinte(item.endsOn),
        // O contrato dá 0–100; o SVAR quer a mesma faixa. Guardado como veio.
        progress: item.progressPercent,
        tipo: item.kind,
      })
    }
  }
  return tarefas
}

export interface JanelaDoPlano {
  inicio: Date
  /** Exclusivo, como o `end` das tarefas. */
  fim: Date
}

/**
 * De quando a quando a grade vai — **fechando em MÊS INTEIRO nas duas pontas**.
 *
 * Regra herdada do gantt caseiro e mantida por ser visual, não técnica: um plano
 * que começa dia 20 não pode abrir a grade no dia 20, senão a primeira coluna do
 * cabeçalho de meses fica mais estreita que as outras — e o olho lê largura como
 * duração.
 *
 * `null` no plano sem fase: grade de zero mês não é grade vazia, é "este projeto
 * não tem plano", que é outra frase e outra tela.
 */
export function janelaDoPlano(fases: PlanPhaseDto[]): JanelaDoPlano | null {
  if (fases.length === 0) return null

  const inicios = fases.map((f) => f.startsOn).sort()
  const fins = fases.map((f) => f.endsOn).sort()
  const primeiro = dataDoDia(inicios[0] as string)
  const ultimo = dataDoDia(fins[fins.length - 1] as string)

  return {
    inicio: new Date(primeiro.getFullYear(), primeiro.getMonth(), 1),
    // Dia 1 do mês SEGUINTE ao último: é o mesmo "último dia do mês" da versão
    // anterior, escrito na convenção exclusiva do SVAR.
    fim: new Date(ultimo.getFullYear(), ultimo.getMonth() + 1, 1),
  }
}

/**
 * ONDE O DIA CAI na janela, medido em MESES (fracionário). `null` fora dela.
 *
 * Existe porque a linha do hoje é NOSSA de novo. `markers` do SVAR é recurso
 * PRO: medido em 02/09/2026, o `init` da store faz `t.markers = []` e
 * `t._markers = []` na mesma linha em que zera `baselines`, `criticalPath`,
 * `schedule`, `rollups` e `slack` — a lista de recursos pagos que o
 * `planner.tsx` já documentava. O `markers={[{ start: new Date() }]}` que
 * estava na tela desde a troca de motor nunca desenhou nada, e o comentário ao
 * lado dele afirmava o contrário.
 *
 * **A unidade é MÊS porque a grade é de mês, e as colunas têm largura IGUAL.**
 * Medido no navegador: seis meses, 111px cada, sem proporção a dias do mês. Um
 * cálculo em "fração de dias da janela" erraria até três dias em fevereiro
 * contra dezembro — e erro de posição na linha do hoje é a pior espécie, porque
 * a linha continua bonita mentindo.
 *
 * O fim da janela é EXCLUSIVO (dia 1 do mês seguinte ao último), então o
 * intervalo aceito é `[inicio, fim)` — o que faz o último dia do plano cair
 * dentro e o primeiro dia de fora ficar de fora.
 */
export function mesesAteODia(janela: JanelaDoPlano, dia: Date): number | null {
  if (dia.getTime() < janela.inicio.getTime() || dia.getTime() >= janela.fim.getTime()) return null

  const meses =
    (dia.getFullYear() - janela.inicio.getFullYear()) * 12 +
    (dia.getMonth() - janela.inicio.getMonth())
  const diasNoMes = new Date(dia.getFullYear(), dia.getMonth() + 1, 0).getDate()
  return meses + (dia.getDate() - 1) / diasNoMes
}

/** Quantos meses a janela inteira tem — o denominador da grade. */
export function mesesDaJanela(janela: JanelaDoPlano): number {
  return (
    (janela.fim.getFullYear() - janela.inicio.getFullYear()) * 12 +
    (janela.fim.getMonth() - janela.inicio.getMonth())
  )
}

/** O período da fase, escrito para o humano: `mar 2026 — jun 2026`. */
export function periodoDaFase(fase: PlanPhaseDto): string {
  const curto = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(dataDoDia(iso))
  return `${curto(fase.startsOn)} — ${curto(fase.endsOn)}`
}

/** Quantas barras o plano inteiro tem — o número do cabeçalho do projeto. */
export function totalDeItens(plano: ProjectPlanDto): number {
  return plano.phases.reduce((soma, fase) => soma + fase.items.length, 0)
}

export interface ProgressoDoProjeto {
  concluidos: number
  emAndamento: number
  naoIniciados: number
  total: number
  /** Média simples do progresso dos itens; `null` no plano sem item nenhum. */
  percentual: number | null
}

/**
 * O andamento do projeto inteiro, derivado das barras do plano.
 *
 * **Média SIMPLES, e a tela diz que é dos itens.** Ponderar por duração daria um
 * número mais "certo" e menos conferível: o operador olha a grade, conta as
 * barras cheias e espera que a conta bata. Média ponderada bate com uma conta
 * que ele não tem como fazer no olho, e número que não se confere é número em
 * que ninguém confia.
 *
 * `null` no plano vazio: 0 de 0 não é "0% concluído" — é projeto sem plano.
 */
export function progressoDoProjeto(plano: ProjectPlanDto): ProgressoDoProjeto {
  const itens = plano.phases.flatMap((fase) => fase.items)
  const total = itens.length
  const concluidos = itens.filter((i) => i.progressPercent >= 100).length
  const naoIniciados = itens.filter((i) => i.progressPercent <= 0).length

  return {
    concluidos,
    emAndamento: total - concluidos - naoIniciados,
    naoIniciados,
    total,
    percentual:
      total === 0
        ? null
        : Math.round(itens.reduce((soma, i) => soma + i.progressPercent, 0) / total),
  }
}

/* ------------------------------------------------------------------------- *
 * A VOLTA — o arraste da barra vira pedido do contrato.
 *
 * Tudo acima traduz contrato → gantt. Daqui para baixo é o caminho inverso, e
 * ele é mais perigoso: a ida erra na tela, onde o olho vê; a volta erra no
 * BANCO, onde ninguém vê até o próximo carregamento. As três conversões que
 * ela faz — id com prefixo → uuid, `Date` → dia ISO, fim exclusivo → inclusivo
 * — são exatamente as três que a ida fez, e cada uma erra em silêncio.
 * ------------------------------------------------------------------------- */

/**
 * O dia LOCAL da data, em `YYYY-MM-DD`.
 *
 * Nunca `toISOString().slice(0,10)`: aquilo converte para UTC antes de cortar,
 * e num fuso negativo (o nosso) uma barra solta às 00:00 de 10/03 viraria
 * `2026-03-09`. O erro é de UM dia, aparece só em parte do dia e some quando
 * quem confere está em UTC — a forma mais cara de bug de data que existe.
 */
export function isoDoDia(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

export interface EventoDeTarefa {
  id?: string | number
  task?: { start?: Date; end?: Date; [outros: string]: unknown }
  /** `true` enquanto o dedo ainda está no botão do mouse. */
  inProgress?: boolean
}

/**
 * O evento do gantt → o corpo do `PATCH`. `null` quando NÃO é para gravar.
 *
 * Devolve `null` em quatro situações, e cada uma tem uma razão própria:
 *
 * 1. **`inProgress`** — o SVAR dispara `update-task` a cada quadro do arraste.
 *    Gravar em todos faria dezenas de `PATCH` por gesto, e o último a chegar
 *    (não o último a sair) decidiria a data final. Grava-se na SOLTURA.
 * 2. **Sem `start` nem `end`** — o mesmo evento carrega mudança de progresso,
 *    de texto e de abertura da fase. Só data vira reagendamento; o resto não
 *    tem caminho no contrato e mandá-lo seria inventar escrita.
 * 3. **Id de FASE** — o contrato só reagenda ITEM. A fase acompanha os filhos
 *    (é a regra declarada no caminho), então mover a fase por si mesma não tem
 *    para onde ir. Ver a nota do `readonly` de fase em `planner.tsx`.
 * 4. **Id que não veio daqui** — sem prefixo, `idOriginal` devolve `null` e nós
 *    também. Adivinhar o uuid a partir de um id estranho seria escrever numa
 *    linha que ninguém pediu.
 *
 * A conversão do fim usa **menos um MILISSEGUNDO**, não menos um dia. O `end`
 * do SVAR é exclusivo e normalmente cai à meia-noite do dia seguinte —
 * `-1 dia` acertaria esse caso. Mas quando o motor devolve a ponta já dentro do
 * último dia (23:59), `-1 dia` tiraria um dia a mais e a barra encolheria
 * sozinha a cada arraste. `-1ms` acerta os DOIS, porque só pergunta "em que dia
 * cai o instante imediatamente anterior ao fim".
 */
export function reagendamentoDoEvento(evento: EventoDeTarefa): Reagendamento | null {
  if (evento.inProgress) return null

  const inicio = evento.task?.start
  const fim = evento.task?.end
  if (!(inicio instanceof Date) || !(fim instanceof Date)) return null

  const id = String(evento.id ?? '')
  if (!id.startsWith('item:')) return null
  const itemId = idOriginal(id)
  if (!itemId) return null

  return {
    itemId,
    startsOn: isoDoDia(inicio),
    endsOn: isoDoDia(fimInclusivo(inicio, fim)),
  }
}

/**
 * A ponta de fim que o contrato quer, a partir da que o SVAR devolve.
 *
 * O caso normal é `fim - 1ms` — ver a nota do `reagendamentoDoEvento`. O caso
 * que o `-1ms` sozinho erra é o **MARCO**: o losango tem duração zero, o motor
 * devolve `end === start`, e `start - 1ms` cai no dia ANTERIOR. O `PATCH` sairia
 * com `endsOn` antes de `startsOn` — data invertida, que o contrato recusa com
 * 400 e a barra volta sozinha sem explicação.
 *
 * Arrastar um marco é gesto legítimo (mover a data da entrega final é
 * exatamente o que o Planner serve para fazer), então a conversão precisa
 * cobri-lo: fim não posterior ao início = evento de um dia, e o dia é o do
 * início.
 */
function fimInclusivo(inicio: Date, fim: Date): Date {
  return fim.getTime() <= inicio.getTime() ? inicio : new Date(fim.getTime() - 1)
}
