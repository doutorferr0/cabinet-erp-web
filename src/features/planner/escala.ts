import type { PlanPhaseDto, ProjectPlanDto } from '@/api/gerado'
import { type Mes, mesDeslocado, nomeDoMes } from '@/lib/datas'

/**
 * A ESCALA DO GANTT — de que mês a que mês a grade vai, e onde cada barra cai.
 *
 * Tudo aqui é função pura sobre datas ISO, e é o que torna o gantt testável sem
 * montar tela: posição de barra é geometria, e geometria errada num gantt é o
 * defeito mais difícil de ver no olho (a barra continua bonita, só está no mês
 * errado).
 *
 * A grade é medida em DIAS e desenhada em porcentagem. A alternativa — uma
 * coluna de grade por mês e a barra ocupando colunas inteiras — arredondaria
 * todo item para o mês, e um pedido que vai do dia 28 ao 3 apareceria ocupando
 * dois meses cheios.
 */

const DIA_MS = 86_400_000

/** Meia-noite LOCAL do dia ISO. Nunca `new Date(iso)` cru: aquilo lê UTC. */
export function dataDoDia(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1)
}

export interface Escala {
  /** Primeiro dia da grade — dia 1 do mês em que o plano começa. */
  inicio: Date
  /** Último dia da grade — último dia do mês em que o plano termina. */
  fim: Date
  /** As colunas do cabeçalho, na ordem. */
  meses: Array<Mes & { rotulo: string }>
  /** Duração total da grade, em dias. */
  dias: number
}

/**
 * A grade fecha em MÊS INTEIRO nas duas pontas.
 *
 * Um plano que começa dia 20 não pode abrir a grade no dia 20: o cabeçalho de
 * meses ficaria com uma primeira coluna de largura diferente das outras, e o
 * olho lê largura como duração. Fechando no mês, toda coluna vale um mês.
 */
export function escalaDoPlano(fases: PlanPhaseDto[]): Escala | null {
  if (fases.length === 0) return null

  const inicios = fases.map((f) => f.startsOn).sort()
  const fins = fases.map((f) => f.endsOn).sort()
  const primeiro = dataDoDia(inicios[0] as string)
  const ultimo = dataDoDia(fins[fins.length - 1] as string)

  const inicio = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1)
  const fim = new Date(ultimo.getFullYear(), ultimo.getMonth() + 1, 0)

  const meses: Escala['meses'] = []
  let cursor: Mes = { ano: inicio.getFullYear(), mes: inicio.getMonth() + 1 }
  const ultimoMes = { ano: fim.getFullYear(), mes: fim.getMonth() + 1 }
  while (
    cursor.ano < ultimoMes.ano ||
    (cursor.ano === ultimoMes.ano && cursor.mes <= ultimoMes.mes)
  ) {
    meses.push({ ...cursor, rotulo: nomeDoMes(cursor) })
    cursor = mesDeslocado(cursor, 1)
  }

  return {
    inicio,
    fim,
    meses,
    // +1 porque as duas pontas são inclusivas: de 1º a 31 de março são 31 dias,
    // não 30. Sem isso toda barra fica levemente larga e a última vaza a grade.
    dias: Math.round((fim.getTime() - inicio.getTime()) / DIA_MS) + 1,
  }
}

export interface Faixa {
  /** Distância da borda esquerda da grade, em % da largura. */
  esquerda: number
  /** Largura da barra, em % da grade. */
  largura: number
}

/**
 * Onde a barra começa e quanto ela ocupa.
 *
 * Item de um dia só recebe a largura de UM dia, nunca zero: barra de largura
 * zero some, e o operador concluiria que a entrega não está planejada. Item que
 * termina antes de começar (dado torto do servidor) também recebe um dia — a
 * tela mostra o que existe e não tenta consertar o dado.
 */
export function faixaDoItem(item: { startsOn: string; endsOn: string }, escala: Escala): Faixa {
  const inicio = dataDoDia(item.startsOn).getTime()
  const fim = dataDoDia(item.endsOn).getTime()
  const base = escala.inicio.getTime()

  const diaInicial = Math.round((inicio - base) / DIA_MS)
  const diaFinal = Math.round((fim - base) / DIA_MS)
  const duracao = Math.max(1, diaFinal - diaInicial + 1)

  return {
    esquerda: (diaInicial / escala.dias) * 100,
    largura: (duracao / escala.dias) * 100,
  }
}

/**
 * Onde HOJE cai na grade, em % — ou `null` quando hoje está fora do plano.
 *
 * Um gantt sem a marca do agora obriga o operador a procurar o mês corrente no
 * cabeçalho e descer com o olho até a linha; com ela, atrasado e por vir se
 * separam num relance. Fora do intervalo devolve `null` em vez de grudar a
 * linha na borda — linha colada no dia 1 diria que o plano começa hoje.
 */
export function posicaoDeHoje(escala: Escala, hoje: Date = new Date()): number | null {
  const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()
  if (dia < escala.inicio.getTime() || dia > escala.fim.getTime()) return null
  return (Math.round((dia - escala.inicio.getTime()) / DIA_MS) / escala.dias) * 100
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
