import type { VisaoDaListagem } from '@/components/cabinet/data-table'
import type { TomDoCartao } from '@/components/cabinet/listagem/modo-kanban'
import {
  DIAS_DA_SEMANA,
  type Mes,
  diaLocalISO,
  gradeDoMes,
  mesDe,
  mesDeslocado,
  nomeDoMes,
} from '@/lib/datas'
import { cn } from '@/lib/utils'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * MODO CALENDÁRIO — a listagem desenhada no mês (ou na semana), sem ser tela
 * própria.
 *
 * Irmão do `ModoKanban`: recebe as MESMAS linhas que a tabela recebeu, um campo
 * com a data (`campoDeData`) e uma função que traduz linha em evento. É o que
 * transforma `Previsão de chegada` e `Agenda` em visões da listagem de origem
 * em vez de duas rotas com consulta própria (Airtable views).
 *
 * ## Ele não consulta nada
 *
 * Nem sequer o mês: a consulta é da listagem, e ela já trouxe o conjunto (o
 * padrão 9 manda a visão que não é tabela pedir o teto do contrato). Navegar
 * entre meses aqui MOVE A JANELA sobre o que chegou — não dispara requisição.
 * Fosse o contrário, o mês seguinte viria com outro filtro que o operador não
 * pediu, e a contagem da barra deixaria de bater com o que a grade mostra.
 *
 * ## Desenho (Reface 2.0, §Hierarquia)
 *
 * A grade é hairline — `--n-200` entre células, nunca borda por célula (duas
 * hairlines encostadas seriam duas ferramentas na mesma fronteira). O cabeçalho
 * dos dias é `--t-rotulo`. O número do dia é DADO (`--t-dado-meta`), e o de HOJE
 * é um quadrado `--n-900` com a tinta invertida — o único preenchimento sólido
 * da grade, para o olho achar o dia sem procurar. O evento é uma pílula tintada
 * com um ponto do tom: a cor é reforço, nunca a informação sozinha (WCAG 1.4.1),
 * e o texto do evento está sempre lá.
 */

const FUNDO_DO_TOM: Record<TomDoCartao, string> = {
  ok: 'var(--ok-bg)',
  info: 'var(--info-bg)',
  warn: 'var(--warn-bg)',
  bad: 'var(--bad-bg)',
  mut: 'var(--mut-bg)',
}

const TINTA_DO_TOM: Record<TomDoCartao, string> = {
  ok: 'var(--ok)',
  info: 'var(--info)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  mut: 'var(--mut)',
}

/**
 * Quantos eventos a célula mostra antes de resumir em `+n`.
 *
 * Três, e não "os que couberem": altura de célula variável faria a grade pular
 * de tamanho a cada mês, e a semana com um dia cheio empurraria as outras seis
 * para fora da tela. O `+n` abre o dia inteiro, que é onde o resto está.
 */
const EVENTOS_POR_CELULA = 3

export type EscalaDoCalendario = 'mes' | 'semana'

export interface EventoDoCalendario {
  titulo: string
  tom?: TomDoCartao
}

export interface ModoCalendarioProps<T> {
  rows: readonly T[]
  /**
   * Campo da linha com a data. Aceita `YYYY-MM-DD` e ISO com hora — o
   * calendário lê só o DIA, que é a unidade da grade.
   */
  campoDeData: keyof T & string
  chave: (row: T) => string
  evento: (row: T) => EventoDoCalendario
  aoAbrir?: (row: T) => void
  escalaInicial?: EscalaDoCalendario
  /**
   * O mês, quando quem consulta é a PÁGINA e não a listagem.
   *
   * O caso é um só e é real: a agenda pergunta ao servidor por intervalo
   * (`GET /api/dashboard/agenda?from&to`), então andar de mês ali tem de virar consulta
   * nova. Passando `mes` + `aoMudarMes` o calendário deixa de guardar o mês e
   * passa a AVISAR — continua não consultando nada, que é a regra do padrão 9.
   * Sem as duas props ele navega sozinho sobre o conjunto que já recebeu.
   */
  mes?: Mes
  aoMudarMes?: (mes: Mes) => void
}

/** O dia de uma data que pode vir com hora — a grade é por dia, não por instante. */
function diaDaLinha(bruto: unknown): string | null {
  if (typeof bruto !== 'string' || bruto === '') return null
  return bruto.slice(0, 10)
}

/** A semana (domingo a sábado) que contém o dia — o recorte da escala `semana`. */
function semanaDoDia(iso: string): string[] {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const base = new Date(ano ?? 0, (mes ?? 1) - 1, dia ?? 1)
  const domingo = new Date(base)
  domingo.setDate(base.getDate() - base.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const cursor = new Date(domingo)
    cursor.setDate(domingo.getDate() + i)
    return diaLocalISO(cursor)
  })
}

/**
 * A PÍLULA do evento: ponto do tom + texto que trunca.
 *
 * O ponto é reforço, nunca a informação sozinha (WCAG 1.4.1) — o título está
 * sempre ali. Trunca em vez de quebrar porque célula que cresce muda a altura
 * da semana inteira, e a grade passaria a pular de tamanho a cada mês.
 */
function PilulaDoEvento({ titulo, tom }: { titulo: string; tom: TomDoCartao }) {
  return (
    <span className="flex items-center gap-1 truncate">
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: TINTA_DO_TOM[tom] }}
      />
      <span className="truncate">{titulo}</span>
    </span>
  )
}

export function ModoCalendario<T>({
  rows,
  campoDeData,
  chave,
  evento,
  aoAbrir,
  escalaInicial = 'mes',
  mes: mesControlado,
  aoMudarMes,
}: ModoCalendarioProps<T>) {
  const hoje = diaLocalISO()
  const [escala, setEscala] = useState<EscalaDoCalendario>(escalaInicial)
  const [mesInterno, setMesInterno] = useState<Mes>(() => mesDe())
  const mes = mesControlado ?? mesInterno

  /** Um caminho só para trocar de mês — controlado ou não. */
  function irParaOMes(proximo: Mes) {
    if (mesControlado === undefined) setMesInterno(proximo)
    aoMudarMes?.(proximo)
  }
  const [ancoraDaSemana, setAncoraDaSemana] = useState(hoje)
  const [diaAberto, setDiaAberto] = useState<string | null>(null)

  /** Os eventos indexados por DIA — uma passada, não uma varredura por célula. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, T[]>()
    for (const row of rows) {
      const dia = diaDaLinha(row[campoDeData])
      if (!dia) continue
      const lista = mapa.get(dia)
      if (lista) lista.push(row)
      else mapa.set(dia, [row])
    }
    return mapa
  }, [rows, campoDeData])

  /**
   * Linha SEM data não some calada.
   *
   * O calendário não tem onde pôr o registro sem data, e deixá-lo de fora em
   * silêncio faria a grade contar menos que a barra — o operador leria "seis" na
   * listagem e contaria quatro na tela. O rodapé diz quantos ficaram de fora.
   */
  const semData = rows.filter((row) => diaDaLinha(row[campoDeData]) === null).length

  const celulas =
    escala === 'mes'
      ? gradeDoMes(mes).map((c) => ({ iso: c.iso, dia: c.dia, deFora: c.deFora }))
      : semanaDoDia(ancoraDaSemana).map((iso) => ({
          iso,
          dia: Number(iso.slice(8, 10)),
          deFora: false,
        }))

  function andar(passos: number) {
    if (escala === 'mes') {
      irParaOMes(mesDeslocado(mes, passos))
      return
    }
    const [ano, mesNumero, dia] = ancoraDaSemana.split('-').map(Number)
    const cursor = new Date(ano ?? 0, (mesNumero ?? 1) - 1, (dia ?? 1) + passos * 7)
    const proximo = diaLocalISO(cursor)
    setAncoraDaSemana(proximo)
    // A semana atravessa a virada do mês, e quem consulta por intervalo precisa
    // saber disso — senão os dias do mês seguinte apareceriam vazios.
    const proximoMes = { ano: Number(proximo.slice(0, 4)), mes: Number(proximo.slice(5, 7)) }
    if (proximoMes.ano !== mes.ano || proximoMes.mes !== mes.mes) irParaOMes(proximoMes)
  }

  const titulo =
    escala === 'mes'
      ? nomeDoMes(mes)
      : `Semana de ${celulas[0]?.iso.split('-').reverse().join('/')}`

  return (
    <div data-slot="modo-calendario" className="flex flex-col" style={{ gap: 'var(--s-4)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => andar(-1)}
          className="rounded-item p-1 hover:bg-[var(--hover)]"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <h3 className="t-bloco min-w-40 text-center capitalize">{titulo}</h3>
        <button
          type="button"
          aria-label="Próximo"
          onClick={() => andar(1)}
          className="rounded-item p-1 hover:bg-[var(--hover)]"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            irParaOMes(mesDe())
            setAncoraDaSemana(hoje)
          }}
          className="t-ui rounded-item border border-[var(--n-300)] px-2 py-0.5 hover:bg-[var(--hover)]"
        >
          Hoje
        </button>

        {/* Rádio de verdade com pele de segmented: as escalas são exclusivas, e
            o nativo dá as setas, uma parada de Tab e o estado dito a quem ouve —
            a mesma decisão do alternador de visões da listagem. */}
        <fieldset className="ml-auto flex items-center gap-1">
          <legend className="sr-only">Escala do calendário</legend>
          {(['mes', 'semana'] as const).map((opcao) => {
            const ativa = opcao === escala
            return (
              <label
                key={opcao}
                className={cn(
                  't-ui cursor-pointer rounded-item border border-[var(--n-300)] px-2 py-0.5',
                  ativa && 'bg-[var(--n-900)]',
                  'has-[:focus-visible]:focus-ring',
                )}
                // Cor por `style` na opção ativa: `.t-ui` declara `color` com a
                // mesma especificidade da utility, e a folha dos tokens vem
                // depois — o rótulo saía preto sobre preto.
                style={ativa ? { color: 'var(--n-0)' } : undefined}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="escala-do-calendario"
                  value={opcao}
                  checked={ativa}
                  onChange={() => setEscala(opcao)}
                />
                {opcao === 'mes' ? 'Mês' : 'Semana'}
              </label>
            )
          })}
        </fieldset>
      </div>

      {/* A grade é UMA caixa com hairline por dentro: `gap` de 1px sobre o fundo
          `--n-200` desenha a linha sem nenhuma célula ter borda própria — que é
          como não encostar duas hairlines. */}
      <section
        className="grid grid-cols-7 gap-px overflow-hidden rounded-card bg-[var(--n-200)]"
        aria-label={titulo}
      >
        {DIAS_DA_SEMANA.map((dia) => (
          <div key={dia.nome} className="t-rotulo bg-[var(--n-50)] px-2 py-1 text-center">
            <abbr title={dia.nome} className="no-underline">
              {dia.inicial}
            </abbr>
          </div>
        ))}

        {celulas.map((celula) => {
          const doDia = porDia.get(celula.iso) ?? []
          const aberto = diaAberto === celula.iso
          const visiveis = aberto ? doDia : doDia.slice(0, EVENTOS_POR_CELULA)
          const escondidos = doDia.length - visiveis.length
          return (
            <div
              key={celula.iso}
              data-slot="dia"
              data-dia={celula.iso}
              data-hoje={celula.iso === hoje ? '' : undefined}
              className={cn(
                'flex min-h-24 flex-col gap-1 bg-[var(--n-0)] p-1.5',
                // Dia de outro mês existe só para fechar a semana: fica rebaixado
                // em vez de sumir, senão a coluna trocaria de significado entre a
                // primeira linha e a última.
                celula.deFora && 'bg-[var(--n-50)]',
              )}
            >
              <span
                className={cn(
                  't-dado-meta self-start',
                  celula.iso === hoje &&
                    'flex size-5 items-center justify-center bg-[var(--n-900)]',
                )}
                // Mesma regra do segmented: `.t-dado-meta` declara `color`, e a
                // tinta invertida do quadrado de HOJE só vence por `style`.
                style={celula.iso === hoje ? { color: 'var(--n-0)' } : undefined}
              >
                {celula.dia}
              </span>

              {visiveis.map((row) => {
                const dados = evento(row)
                const tom = dados.tom ?? 'mut'
                return aoAbrir ? (
                  <button
                    key={chave(row)}
                    type="button"
                    onClick={() => aoAbrir(row)}
                    className="t-meta w-full rounded-data px-1 text-left"
                    style={{ background: FUNDO_DO_TOM[tom] }}
                  >
                    <PilulaDoEvento titulo={dados.titulo} tom={tom} />
                  </button>
                ) : (
                  <span
                    key={chave(row)}
                    className="t-meta w-full rounded-data px-1"
                    style={{ background: FUNDO_DO_TOM[tom] }}
                  >
                    <PilulaDoEvento titulo={dados.titulo} tom={tom} />
                  </span>
                )
              })}

              {escondidos > 0 ? (
                <button
                  type="button"
                  onClick={() => setDiaAberto(celula.iso)}
                  className="t-dado-meta self-start underline-offset-2 hover:underline"
                >
                  +{escondidos}
                </button>
              ) : null}
              {aberto && doDia.length > EVENTOS_POR_CELULA ? (
                <button
                  type="button"
                  onClick={() => setDiaAberto(null)}
                  className="t-dado-meta self-start underline-offset-2 hover:underline"
                >
                  Recolher
                </button>
              ) : null}
            </div>
          )
        })}
      </section>

      {semData > 0 ? (
        <p className="t-meta">
          {semData === 1
            ? '1 registro sem data não aparece no calendário.'
            : `${semData} registros sem data não aparecem no calendário.`}
        </p>
      ) : null}
    </div>
  )
}

/**
 * A entrada de VISÃO que a listagem consome — `modo: 'calendario'` em uma
 * função. Irmã de `visaoKanban`, e pelo mesmo motivo: o calendário é um só no
 * ERP inteiro, e a tela compõe em vez de reimplementar.
 *
 * Não declara `agrupa`: o `Agrupar por` da barra não tem efeito aqui, e seletor
 * sem efeito é pior que ausência de seletor.
 */
export function visaoCalendario<T>({
  id = 'calendario',
  rotulo = 'Calendário',
  ...props
}: { id?: string; rotulo?: string } & Omit<ModoCalendarioProps<T>, 'rows'>): VisaoDaListagem<T> {
  return {
    id,
    rotulo,
    icon: CalendarDays,
    render: ({ rows }) => <ModoCalendario rows={rows} {...props} />,
  }
}
