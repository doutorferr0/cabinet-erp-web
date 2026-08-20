import { useAgenda } from '@/data/dashboard-api'
import { type Mes, diaLocalISO, limitesDoMes } from '@/lib/datas'
import { createViewMonthAgenda } from '@schedule-x/calendar'
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
import { useMemo, useState } from 'react'
import { CALENDARIOS, paraEventoScheduleX } from './eventos'

/**
 * AGENDA — calendário mensal com a lista do dia embaixo, via Schedule-X.
 *
 * Substitui o painel caseiro "Hoje" do dashboard (issue #230). A visão escolhida
 * é `createViewMonthAgenda()` porque é a única do Schedule-X que funde o
 * mini-calendário do mês com a agenda do dia selecionado — o que o mockup pede
 * sem manter dois componentes separados.
 *
 * Cada tipo de compromisso (`delivery`, `quote`, `meeting`, `payment`) tem uma
 * cor fixa, igual à do dashboard, para que o operador reencontre o significado
 * da marca em qualquer tela.
 */
export function AgendaTela() {
  const [mes, setMes] = useState<Mes>(() => {
    const hoje = new Date()
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
  })

  const { de, ate } = limitesDoMes(mes)
  const agenda = useAgenda(de, ate)
  const eventos = agenda.data ?? []

  const eventosScheduleX = useMemo(() => eventos.map(paraEventoScheduleX), [eventos])

  const plugins = useMemo(
    () => [
      {
        name: 'sincroniza-mes',
        onRangeUpdate: (range: { start: Temporal.ZonedDateTime }) => {
          const ano = range.start.year
          const mesNumero = range.start.month
          setMes((atual) =>
            atual.ano === ano && atual.mes === mesNumero ? atual : { ano, mes: mesNumero },
          )
        },
      },
    ],
    [],
  )

  const calendarApp = useCalendarApp(
    {
      views: [createViewMonthAgenda()],
      selectedDate: Temporal.PlainDate.from(diaLocalISO()),
      locale: 'pt-BR',
      firstDayOfWeek: 1,
      calendars: CALENDARIOS,
      events: eventosScheduleX,
      monthAgendaOptions: {
        nEventIndicatorsPerDay: 3,
      },
    },
    plugins,
  )

  return (
    <div className="agenda-schedule-x flex h-[calc(100vh-12rem)] flex-col gap-4">
      <ScheduleXCalendar calendarApp={calendarApp} />
    </div>
  )
}
