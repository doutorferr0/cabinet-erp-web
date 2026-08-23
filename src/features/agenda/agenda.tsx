import { useAgenda } from '@/data/dashboard-api'
import { useTheme } from '@/hooks/use-theme'
import { type Mes, diaLocalISO, limitesDoMes } from '@/lib/datas'
import { useEffect, useMemo, useState } from 'react'
import { CALENDARIOS, paraEventoScheduleX } from './eventos'
// Schedule-X entra pela porta única (`./schedule-x`), nunca pelo pacote: é lá
// que o polyfill do Temporal roda antes da lib, e é lá que ele fica fora do
// chunk de entrada. Ver o cabeçalho daquele módulo.
import { ScheduleXCalendar, createViewMonthAgenda, useCalendarApp } from './schedule-x'

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
 *
 * O tema do calendário é AMARRADO ao do app: o Schedule-X guarda claro e escuro
 * em conjuntos separados e só troca quando alguém manda (`isDark` no início,
 * `setTheme` depois). Sem essa amarra, o botão de tema viraria a folha e a
 * agenda continuaria pastel, com a tinta lida contra o papel errado.
 */
export function AgendaTela() {
  const { resolved } = useTheme()
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
      isDark: resolved === 'dark',
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

  useEffect(() => {
    calendarApp?.setTheme(resolved)
  }, [calendarApp, resolved])

  return (
    <div className="agenda-schedule-x flex h-[calc(100vh-12rem)] flex-col gap-4">
      <ScheduleXCalendar calendarApp={calendarApp} />
    </div>
  )
}
