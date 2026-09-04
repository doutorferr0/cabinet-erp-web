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
 * **A CÓPIA DE COR MORREU AQUI (2.0, #469), e o motivo dela morreu junto.** O
 * Schedule-X grava estas cores como custom properties na RAIZ
 * (`document.documentElement.style.setProperty`), e enquanto a cor de módulo só
 * existisse dentro de `[data-modulo]` a raiz devolvia o par PADRÃO para os três
 * — então entrega, orçamento e reunião viriam da mesma cor. A saída era copiar
 * seis valores literais daqui, com o seletor de origem anotado ao lado, e mantê-los
 * em dia à mão.
 *
 * Na 2.0 cada módulo tem um token GLOBAL (`--mod-estoque`, `--mod-vendas`,
 * `--mod-compras`) e o fundo é o tint da mesma família. Os dois são globais,
 * então `var()` na raiz resolve certo e o escuro cai sozinho — o token de módulo
 * desce do degrau 600 para o 400 em `tokens-2.0.css`, e o tint pousa sobre a
 * folha do tema. `lightColors` e `darkColors` passam a ser o MESMO par: não há
 * mais duas tabelas para divergir.
 *
 * A cor é reforço, nunca a informação sozinha (WCAG 1.4.1): a linha traz o
 * texto do compromisso e a legenda nomeia o tipo.
 */

/** Tinta sobre o fundo do evento — token global, vira com o tema. */
const TINTA = 'var(--foreground)'

export const CALENDARIOS: Record<AgendaEventDtoKind, CalendarType> = {
  // entrega ← estoque · o par (cor do módulo, tint da família) é o mesmo nos dois temas
  delivery: {
    colorName: 'delivery',
    label: 'entrega',
    lightColors: { main: 'var(--mod-estoque)', container: 'var(--tint-mint)', onContainer: TINTA },
    darkColors: { main: 'var(--mod-estoque)', container: 'var(--tint-mint)', onContainer: TINTA },
  },
  // orçamento ← vendas
  quote: {
    colorName: 'quote',
    label: 'orçamento',
    lightColors: { main: 'var(--mod-vendas)', container: 'var(--tint-sky)', onContainer: TINTA },
    darkColors: { main: 'var(--mod-vendas)', container: 'var(--tint-sky)', onContainer: TINTA },
  },
  // reunião ← compras
  meeting: {
    colorName: 'meeting',
    label: 'reunião',
    lightColors: { main: 'var(--mod-compras)', container: 'var(--tint-lilac)', onContainer: TINTA },
    darkColors: { main: 'var(--mod-compras)', container: 'var(--tint-lilac)', onContainer: TINTA },
  },
  // Dinheiro tem dono por regra (DESIGN.md §Acentos) e token global nos dois temas.
  payment: {
    colorName: 'payment',
    label: 'pagamento',
    lightColors: {
      main: 'var(--money)',
      container: 'var(--zone-money)',
      onContainer: TINTA,
    },
    darkColors: {
      main: 'var(--money)',
      container: 'var(--zone-money)',
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
