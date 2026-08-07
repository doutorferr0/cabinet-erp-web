import type { AgendaEventDto } from '@/api/gerado'
import { FormBlock } from '@/components/cabinet/form-block'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgenda, useMarcarTodo, useTodos } from '@/data/dashboard-api'
import {
  DIAS_DA_SEMANA,
  type Mes,
  diaLocalISO,
  gradeDoMes,
  horaLocal,
  limitesDoMes,
  mesDeslocado,
  nomeDoMes,
} from '@/lib/datas'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { FalhaDoPainel } from './falha'
import { MarcaDeTipo, TIPOS, TIPOS_NA_ORDEM, eventosDoDia } from './tipos-de-evento'

/**
 * A LINHA DO "HOJE" — calendário do mês, agenda do dia e a lista A fazer.
 *
 * Calendário e agenda leem a MESMA consulta (`useAgenda` do mês visível) e é
 * decisão: são duas vistas do mesmo dado, e duas consultas fariam o dia marcado
 * no calendário e a linha da agenda virem de instantes diferentes — o operador
 * veria um ponto no dia 12 e uma agenda que não o conhece.
 */

function Contador({ n }: { n: number }) {
  // Contador é DADO, e dado mora dentro de caixa (staging neobrutalism-aria).
  return (
    <span className="ml-auto rounded-item border-2 px-1.5 font-mono text-[0.75rem] font-medium tabular-nums">
      {n}
    </span>
  )
}

function Calendario({
  mes,
  aoTrocarMes,
  eventos,
  carregando,
}: {
  mes: Mes
  aoTrocarMes: (novo: Mes) => void
  eventos: AgendaEventDto[]
  carregando: boolean
}) {
  const hoje = diaLocalISO()
  const celulas = gradeDoMes(mes)

  return (
    <FormBlock legend="Calendário">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => aoTrocarMes(mesDeslocado(mes, -1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft />
        </Button>
        {/* `first-letter`, nunca `capitalize`: o `Intl` devolve "agosto de
            2026" e o `capitalize` do Tailwind sobe TODA palavra — saía "Agosto
            De 2026", com a preposição em maiúscula. */}
        <span className="font-semibold first-letter:uppercase">{nomeDoMes(mes)}</span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => aoTrocarMes(mesDeslocado(mes, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS_DA_SEMANA.map((dia) => (
          <abbr
            key={dia.nome}
            title={dia.nome}
            className="pb-1 font-mono text-[0.75rem] font-medium uppercase no-underline text-muted-foreground"
          >
            {dia.inicial}
          </abbr>
        ))}

        {celulas.map((celula) => {
          const doDia = eventosDoDia(eventos, celula.iso)
          const ehHoje = celula.iso === hoje
          return (
            <div
              key={celula.iso}
              // Célula do calendário é ITEM: canto reto, encostada na vizinha.
              className={cn(
                'flex min-h-8 flex-col items-center justify-center gap-0.5 rounded-item py-1 text-sm tabular-nums',
                celula.deFora && 'text-muted-foreground opacity-60',
                // Hoje é o único estado FORTE da grade — violeta é a cor do que
                // está ativo no sistema (§Acentos).
                ehHoje && 'bg-primary font-bold text-primary-foreground',
              )}
              {...(ehHoje && { 'data-hoje': 'true' })}
            >
              <span>{celula.dia}</span>
              {/* Os pontos dizem QUANTOS e DE QUE TIPO sem abrir espaço para
                  texto: no máximo três, porque a partir daí a fileira estoura a
                  célula e vira borrão. O quarto compromisso continua na agenda. */}
              <span className="flex h-1.5 items-center gap-0.5">
                {doDia.slice(0, 3).map((evento) => (
                  <MarcaDeTipo key={evento.id} kind={evento.kind} className="size-1.5 border" />
                ))}
              </span>
            </div>
          )
        })}
      </div>

      {carregando ? (
        <Skeleton className="mt-2 h-4 w-full" />
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-1 border-t pt-2">
          {TIPOS_NA_ORDEM.map((kind) => (
            <li key={kind} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MarcaDeTipo kind={kind} className="size-2.5" />
              {TIPOS[kind].rotulo}
            </li>
          ))}
        </ul>
      )}
    </FormBlock>
  )
}

function Agenda({ eventos, carregando }: { eventos: AgendaEventDto[]; carregando: boolean }) {
  const doDia = eventosDoDia(eventos, diaLocalISO())

  return (
    <FormBlock legend="Agenda de hoje">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold">Compromissos</span>
        <Contador n={doDia.length} />
      </div>

      {carregando ? (
        <div className="flex flex-col gap-2">
          {['a1', 'a2', 'a3'].map((chave) => (
            <Skeleton key={chave} className="h-12 w-full" />
          ))}
        </div>
      ) : doDia.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum compromisso para hoje.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {doDia.map((evento) => (
            <li
              key={evento.id}
              className="flex items-center gap-3 rounded-card border-2 bg-card p-2"
            >
              <MarcaDeTipo kind={evento.kind} className="h-8 w-1.5" />
              <span className="font-mono text-sm font-semibold tabular-nums">
                {horaLocal(evento.startsAt)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{evento.title}</span>
                {evento.context ? (
                  <span className="block truncate text-sm text-muted-foreground">
                    {evento.context}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </FormBlock>
  )
}

function AFazer() {
  const query = useTodos()
  const marcar = useMarcarTodo()
  const itens = query.data ?? []
  const pendentes = itens.filter((item) => !item.done).length

  return (
    <FormBlock legend="A fazer">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold">Pendentes</span>
        <Contador n={pendentes} />
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          {['t1', 't2', 't3'].map((chave) => (
            <Skeleton key={chave} className="h-7 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <FalhaDoPainel
          titulo="A lista não carregou"
          erro={query.error}
          aoTentar={() => query.refetch()}
        />
      ) : itens.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nada anotado.</p>
      ) : (
        <ul className="flex flex-col">
          {itens.map((item) => (
            <li key={item.id} className="border-b py-1.5 last:border-b-0">
              {/* O rótulo é o próprio texto do item: clicar na frase marca, que
                  é o alvo que o dedo e o mouse procuram. */}
              <Checkbox
                isSelected={item.done}
                onChange={(feito) => marcar.mutate({ id: item.id, feito })}
                isDisabled={marcar.isPending}
              >
                <span className={cn(item.done && 'text-muted-foreground line-through')}>
                  {item.title}
                </span>
              </Checkbox>
            </li>
          ))}
        </ul>
      )}
    </FormBlock>
  )
}

export function LinhaDeHoje() {
  const [mes, setMes] = useState<Mes>(() => ({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  }))
  const { de, ate } = limitesDoMes(mes)
  const agenda = useAgenda(de, ate)
  const eventos = agenda.data ?? []

  if (agenda.isError) {
    return (
      <FalhaDoPainel
        titulo="A agenda não carregou"
        erro={agenda.error}
        aoTentar={() => agenda.refetch()}
      />
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(260px,320px)_1fr_1fr]">
      <Calendario mes={mes} aoTrocarMes={setMes} eventos={eventos} carregando={agenda.isPending} />
      <Agenda eventos={eventos} carregando={agenda.isPending} />
      <AFazer />
    </div>
  )
}
