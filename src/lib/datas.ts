/**
 * DATAS DE CALENDÁRIO — o que o Dashboard precisa para desenhar "hoje".
 *
 * Separado de `formatters.ts` de propósito: lá mora a EXIBIÇÃO de um dado que
 * já existe (moeda, data ISO → pt-BR); aqui mora o cálculo de quais dias
 * existem, que é o que monta a grade do mini-calendário e o recorte do dia.
 *
 * **Tudo em fuso LOCAL, nunca UTC.** `toISOString()` devolve o dia em UTC, e no
 * Brasil (UTC-3) todo compromisso marcado depois das 21h cai no dia seguinte —
 * a agenda de hoje mostraria o evento de amanhã e o calendário marcaria o dia
 * errado. O operador vive no fuso dele; o dia é o dele.
 */

/** `YYYY-MM-DD` do dia LOCAL do instante dado. */
export function diaLocalISO(data: Date = new Date()): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

/** O dia local de um instante ISO (`2026-08-07T23:30:00Z` → o dia daqui). */
export function diaDoInstante(iso: string): string {
  return diaLocalISO(new Date(iso))
}

/** `09:00` — a hora local de um instante ISO. */
export function horaLocal(iso: string): string {
  const data = new Date(iso)
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`
}

export interface Mes {
  ano: number
  /** 1–12, como o humano conta — não o 0–11 do `Date`. */
  mes: number
}

export function mesDe(data: Date = new Date()): Mes {
  return { ano: data.getFullYear(), mes: data.getMonth() + 1 }
}

/**
 * Mês vizinho, atravessando a virada do ano.
 *
 * A conta é feita em MESES ABSOLUTOS desde o ano 0 (`ano * 12 + mes`), que é a
 * única forma de dezembro→janeiro virar o ano sozinho. Sem `%` de teto: uma
 * primeira versão normalizava por 12000 meses "para segurar o intervalo" e
 * transformava 2027 em 27 — o teste da virada de ano pegou.
 */
export function mesDeslocado({ ano, mes }: Mes, passos: number): Mes {
  const total = ano * 12 + (mes - 1) + passos
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 }
}

/** `agosto de 2026` — o rótulo do cabeçalho do calendário. */
export function nomeDoMes({ ano, mes }: Mes): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(ano, mes - 1, 1),
  )
}

/** Primeiro e último dia do mês, em ISO — é o intervalo que a agenda consulta. */
export function limitesDoMes({ ano, mes }: Mes): { de: string; ate: string } {
  return {
    de: diaLocalISO(new Date(ano, mes - 1, 1)),
    ate: diaLocalISO(new Date(ano, mes, 0)),
  }
}

export interface CelulaDoMes {
  iso: string
  /** O número que aparece na célula. */
  dia: number
  /** Dia de outro mês, mostrado só para fechar a semana. */
  deFora: boolean
}

/**
 * A grade do mini-calendário: SEMPRE semanas inteiras de domingo a sábado,
 * começando no domingo anterior ao dia 1 e terminando no sábado seguinte ao
 * último dia.
 *
 * Semana incompleta faria as colunas mudarem de significado entre a primeira e
 * a última linha — o operador procura "as sextas" olhando uma coluna, e a coluna
 * tem de ser a mesma de cima a baixo. O número de linhas varia (4 a 6) porque o
 * mês varia; travar em 6 mostraria uma semana inteira de outro mês em fevereiro.
 */
export function gradeDoMes({ ano, mes }: Mes): CelulaDoMes[] {
  const primeiro = new Date(ano, mes - 1, 1)
  const inicio = new Date(ano, mes - 1, 1 - primeiro.getDay())
  const ultimo = new Date(ano, mes, 0)
  const fim = new Date(ano, mes - 1, ultimo.getDate() + (6 - ultimo.getDay()))

  const celulas: CelulaDoMes[] = []
  for (const cursor = new Date(inicio); cursor <= fim; cursor.setDate(cursor.getDate() + 1)) {
    celulas.push({
      iso: diaLocalISO(cursor),
      dia: cursor.getDate(),
      deFora: cursor.getMonth() !== mes - 1,
    })
  }
  return celulas
}

/**
 * Cabeçalho da grade, na ordem (domingo primeiro).
 *
 * Cada coluna carrega `nome` além da inicial porque as iniciais REPETEM (duas
 * segundas-feiras em `S`, dois `Q`): é o nome que dá chave estável à coluna e
 * texto de verdade para quem usa leitor de tela.
 */
export const DIAS_DA_SEMANA = [
  { nome: 'domingo', inicial: 'D' },
  { nome: 'segunda', inicial: 'S' },
  { nome: 'terça', inicial: 'T' },
  { nome: 'quarta', inicial: 'Q' },
  { nome: 'quinta', inicial: 'Q' },
  { nome: 'sexta', inicial: 'S' },
  { nome: 'sábado', inicial: 'S' },
] as const

/**
 * `Bom dia` / `Boa tarde` / `Boa noite` pela hora local.
 *
 * Os cortes são os do português falado (12h e 18h), não os do relógio de 8/16h
 * de sistema americano — a saudação existe para soar como alguém falando.
 */
export function saudacao(data: Date = new Date()): string {
  const hora = data.getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** `sexta-feira, 7 de agosto de 2026` — a data por extenso do cabeçalho. */
export function dataPorExtenso(data: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(data)
}
