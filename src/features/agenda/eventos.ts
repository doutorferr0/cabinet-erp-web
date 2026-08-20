import type { AgendaEventDto, AgendaEventDtoKind } from '@/api/gerado'
import type { CalendarEventExternal, CalendarType } from '@schedule-x/calendar'

/**
 * Paleta de cada tipo de compromisso no Schedule-X.
 *
 * As cores são as MESMAS usadas pelo painel "hoje" do dashboard
 * (`features/dashboard/tipos-de-evento.tsx`): três tipos emprestam do módulo
 * dono e `payment` usa o verde de dinheiro. Manter a mesma paleta evita que a
 * agenda e o dashboard contem histórias diferentes sobre o mesmo tipo.
 *
 * `main` = cor do indicador/destaque, `container` = fundo do evento,
 * `onContainer` = texto sobre o fundo.
 */

export const CALENDARIOS: Record<AgendaEventDtoKind, CalendarType> = {
  delivery: {
    colorName: 'delivery',
    label: 'entrega',
    lightColors: { main: '#60A5FA', container: '#DBEAFE', onContainer: '#0f172a' },
    darkColors: { main: '#60A5FA', container: '#1e3a5f', onContainer: '#f8fafc' },
  },
  quote: {
    colorName: 'quote',
    label: 'orçamento',
    lightColors: { main: '#A78BFA', container: '#EDE9FE', onContainer: '#0f172a' },
    darkColors: { main: '#A78BFA', container: '#2e265e', onContainer: '#f8fafc' },
  },
  meeting: {
    colorName: 'meeting',
    label: 'reunião',
    lightColors: { main: '#F472B6', container: '#FCE7F3', onContainer: '#0f172a' },
    darkColors: { main: '#F472B6', container: '#4a1d39', onContainer: '#f8fafc' },
  },
  payment: {
    colorName: 'payment',
    label: 'pagamento',
    lightColors: { main: '#166534', container: '#dcfce7', onContainer: '#0f172a' },
    darkColors: { main: '#6de8b8', container: '#064e3b', onContainer: '#f8fafc' },
  },
}

/** Rótulos que a legenda da agenda exibe — mesma ordem do dashboard. */
export const ROTULOS_DO_TIPO: Record<AgendaEventDtoKind, string> = {
  delivery: 'entrega',
  quote: 'orçamento',
  meeting: 'reunião',
  payment: 'pagamento',
}

/** Duração padrão de um compromisso, em minutos. O contrato só manda o início. */
const DURACAO_PADRAO_EM_MINUTOS = 60

/**
 * Converte um compromisso do contrato em evento do Schedule-X.
 *
 * A lib exige `start` e `end` como `Temporal.ZonedDateTime`. O contrato traz
 * apenas `startsAt` (ISO 8601 com hora), então `end` é derivado com a duração
 * padrão — o bastante para o evento aparecer na agenda do dia.
 */
export function paraEventoScheduleX(evento: AgendaEventDto): CalendarEventExternal {
  const inicio = Temporal.Instant.from(evento.startsAt)
  const fim = inicio.add({ minutes: DURACAO_PADRAO_EM_MINUTOS })
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone

  return {
    id: evento.id,
    start: inicio.toZonedDateTimeISO(fuso),
    end: fim.toZonedDateTimeISO(fuso),
    title: evento.title,
    calendarId: evento.kind,
    ...(evento.context && { description: evento.context }),
  }
}
