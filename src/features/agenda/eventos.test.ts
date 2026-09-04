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
  it('tira tudo do token: não há mais cor copiada aqui', () => {
    // Na 2.0 a cor de módulo é GLOBAL (`--mod-*`) e o fundo é o tint da mesma
    // família — os dois resolvem na raiz, que é onde o Schedule-X escreve. A
    // cópia literal de seis valores que existia aqui morreu com o motivo dela.
    for (const calendario of Object.values(CALENDARIOS)) {
      for (const cor of [calendario.lightColors, calendario.darkColors]) {
        for (const valor of [cor?.main, cor?.container, cor?.onContainer]) {
          expect(valor).toMatch(/^var\(--[a-z0-9-]+\)$/)
        }
      }
    }
  })

  it('claro e escuro são o MESMO par — quem vira é o token', () => {
    // Era a regra do index.css que obrigava duas tabelas ("no escuro só a /02
    // muda"). Agora `--mod-*` desce do degrau 600 para o 400 em tokens-2.0.css e
    // o tint pousa sobre a folha do tema: duas tabelas não teriam o que dizer de
    // diferente, e teriam o que divergir.
    for (const calendario of Object.values(CALENDARIOS)) {
      expect(calendario.darkColors).toEqual(calendario.lightColors)
    }
  })

  it('cada tipo empresta do módulo dono, e dinheiro tem token próprio', () => {
    expect(CALENDARIOS.delivery.lightColors?.main).toBe('var(--mod-estoque)')
    expect(CALENDARIOS.quote.lightColors?.main).toBe('var(--mod-vendas)')
    expect(CALENDARIOS.meeting.lightColors?.main).toBe('var(--mod-compras)')
    expect(CALENDARIOS.payment.lightColors?.main).toBe('var(--money)')
  })
})
