import './temporal'
import { describe, expect, it } from 'vitest'
import { CALENDARIOS, paraEventoScheduleX } from './eventos'

describe('paraEventoScheduleX', () => {
  it('converte início ISO em ZonedDateTime e dá duração de 1h', () => {
    const evento = {
      id: 'ev-0001',
      startsAt: '2026-08-20T09:00:00.000Z',
      title: 'Revisar orçamento',
      context: 'Residência Alphaville',
      kind: 'quote' as const,
    }

    const convertido = paraEventoScheduleX(evento)

    expect(convertido.id).toBe('ev-0001')
    expect(convertido.title).toBe('Revisar orçamento')
    expect(convertido.calendarId).toBe('quote')
    expect(convertido.description).toBe('Residência Alphaville')
    const inicio = convertido.start as Temporal.ZonedDateTime
    const fim = convertido.end as Temporal.ZonedDateTime

    expect(inicio).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(fim).toBeInstanceOf(Temporal.ZonedDateTime)
    expect(inicio.toInstant().toString()).toBe(
      Temporal.Instant.from('2026-08-20T09:00:00.000Z').toString(),
    )
    expect(fim.epochMilliseconds - inicio.epochMilliseconds).toBe(60 * 60 * 1000)
  })

  it('funciona sem contexto', () => {
    const evento = {
      id: 'ev-0002',
      startsAt: '2026-08-20T11:30:00.000Z',
      title: 'Reunião',
      kind: 'meeting' as const,
    }

    const convertido = paraEventoScheduleX(evento)

    expect(convertido.description).toBeUndefined()
  })
})

describe('CALENDARIOS', () => {
  it('tira do token o que é global e copia só o que é escopado', () => {
    // Dinheiro e tinta têm token na raiz — viram com o tema sozinhos, e por
    // isso claro e escuro são o MESMO valor.
    expect(CALENDARIOS.payment.lightColors?.main).toBe('hsl(var(--money))')
    expect(CALENDARIOS.payment.darkColors?.main).toBe('hsl(var(--money))')
    expect(CALENDARIOS.payment.lightColors?.container).toBe('hsl(var(--zone-money))')

    for (const calendario of Object.values(CALENDARIOS)) {
      expect(calendario.lightColors?.onContainer).toBe('hsl(var(--foreground))')
      expect(calendario.darkColors?.onContainer).toBe('hsl(var(--foreground))')
    }
  })

  it('mantém a cheia /01 e troca só a pastel /02 no escuro', () => {
    // A regra é do index.css: no escuro só `--modulo-02` muda.
    for (const kind of ['delivery', 'quote', 'meeting'] as const) {
      const { lightColors, darkColors } = CALENDARIOS[kind]
      expect(darkColors?.main).toBe(lightColors?.main)
      expect(darkColors?.container).not.toBe(lightColors?.container)
    }
  })
})
