import type { AgendaEventDto, AgendaEventDtoKind } from '@/api/gerado'
// Este módulo usa `Temporal` em runtime (`Temporal.Instant.from`, abaixo) e
// não pode contar com quem o importou tê-lo carregado — o polyfill saiu da
// entrada da aplicação na #227. Ver `./temporal`.
import './temporal'
import type { CalendarEventExternal, CalendarType } from './schedule-x'

/**
 * Paleta de cada tipo de compromisso no Schedule-X — a MESMA do painel "hoje"
 * (`features/dashboard/tipos-de-evento.tsx`): três tipos emprestam do módulo
 * dono (entrega=estoque, orçamento=vendas, reunião=compras) e `payment` usa o
 * verde de dinheiro, que tem dono por regra (DESIGN.md §Acentos).
 *
 * **Por que dois tipos de valor aqui.** O Schedule-X grava estas cores como
 * custom properties na RAIZ (`document.documentElement.style.setProperty`), e é
 * isso que decide o que pode ser token e o que precisa ser cópia:
 *
 * - `--money`, `--zone-money` e `--foreground` são globais → entram como
 *   `hsl(var(…))` e viram sozinhos com o tema. Uma fonte só.
 * - `--modulo-01`/`--modulo-02` são ESCOPADOS por `[data-modulo]`. Na raiz eles
 *   valem o par PADRÃO (roxo), então `var()` pintaria entrega, orçamento e
 *   reunião todos da mesma cor. Os três vêm copiados de `src/index.css`, com o
 *   seletor de origem ao lado — e o `dark` respeita a regra de lá: **só a /02
 *   muda no escuro**, a cheia /01 já é clara e continua servindo de tinta.
 *
 * A cor é reforço, nunca a informação sozinha (WCAG 1.4.1): a linha traz o
 * texto do compromisso e a legenda nomeia o tipo.
 */

/** Tinta sobre o fundo do evento — token global, vira com o tema. */
const TINTA = 'hsl(var(--foreground))'

export const CALENDARIOS: Record<AgendaEventDtoKind, CalendarType> = {
  // [data-modulo="estoque"] · .dark → --modulo-02: 205 35% 20%
  delivery: {
    colorName: 'delivery',
    label: 'entrega',
    lightColors: { main: 'hsl(213 94% 68%)', container: 'hsl(214 95% 93%)', onContainer: TINTA },
    darkColors: { main: 'hsl(213 94% 68%)', container: 'hsl(205 35% 20%)', onContainer: TINTA },
  },
  // [data-modulo="vendas"] · .dark → --modulo-02: 251 35% 20%
  quote: {
    colorName: 'quote',
    label: 'orçamento',
    lightColors: { main: 'hsl(255 92% 76%)', container: 'hsl(251 91% 95%)', onContainer: TINTA },
    darkColors: { main: 'hsl(255 92% 76%)', container: 'hsl(251 35% 20%)', onContainer: TINTA },
  },
  // [data-modulo="compras"] · .dark → --modulo-02: 287 35% 20%
  meeting: {
    colorName: 'meeting',
    label: 'reunião',
    lightColors: { main: 'hsl(329 86% 70%)', container: 'hsl(326 78% 95%)', onContainer: TINTA },
    darkColors: { main: 'hsl(329 86% 70%)', container: 'hsl(287 35% 20%)', onContainer: TINTA },
  },
  // Dinheiro tem token global nos dois temas — nada a copiar.
  payment: {
    colorName: 'payment',
    label: 'pagamento',
    lightColors: {
      main: 'hsl(var(--money))',
      container: 'hsl(var(--zone-money))',
      onContainer: TINTA,
    },
    darkColors: {
      main: 'hsl(var(--money))',
      container: 'hsl(var(--zone-money))',
      onContainer: TINTA,
    },
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
