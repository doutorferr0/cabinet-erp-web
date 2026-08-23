/**
 * PORTA DE ENTRADA do Schedule-X no repo — e o lugar onde a ordem é garantida.
 *
 * O `@schedule-x/calendar` usa o global `Temporal` mas NÃO o importa (issue
 * #230), então `./temporal` precisa rodar antes de o calendário rodar.
 * Enquanto o `import 'temporal-polyfill/global'` morava no `src/main.tsx`, essa
 * ordem saía de graça — o custo é que o polyfill entrava no chunk de ENTRADA e
 * era pago em toda página, inclusive na de login: **20.125 B gzip**, medidos na
 * #227, 68% de tudo que as três libs de planning custavam no primeiro
 * carregamento.
 *
 * Aqui o polyfill viaja junto do chunk da agenda, que é lazy. E a ordem deixa
 * de depender de o ordenador de imports não mexer: quem quiser o Schedule-X
 * importa DESTE módulo, e o polyfill está acima na mesma unidade. Importar
 * `@schedule-x/*` direto de uma tela volta a apostar na ordem alfabética —
 * `src/features/agenda/schedule-x.test.ts` é a guarda disso.
 *
 * O tema entra junto pelo mesmo motivo: CSS de lib importado no `main.tsx` é
 * folha única em toda página. Ele foi conferido antes de entrar (#227): sem
 * seletor de elemento, sem tocar `html`/`body`/`*`, e o único `:root` tem 30
 * propriedades todas prefixadas `--sx-`.
 */
import './temporal'
import '@schedule-x/theme-default/dist/index.css'

export { createViewMonthAgenda } from '@schedule-x/calendar'
export type { CalendarEventExternal, CalendarType } from '@schedule-x/calendar'
export { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
