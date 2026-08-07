import {
  diaDoInstante,
  diaLocalISO,
  gradeDoMes,
  limitesDoMes,
  mesDeslocado,
  nomeDoMes,
  saudacao,
} from '@/lib/datas'
import { describe, expect, it } from 'vitest'

describe('datas de calendário', () => {
  it('escreve o dia LOCAL, não o de UTC', () => {
    // 23h30 do dia 7 no fuso local. `toISOString().slice(0,10)` devolveria o
    // dia 8 em qualquer fuso a oeste de Greenwich — e a agenda de hoje
    // mostraria o compromisso de amanhã.
    const tarde_da_noite = new Date(2026, 7, 7, 23, 30)
    expect(diaLocalISO(tarde_da_noite)).toBe('2026-08-07')
    expect(diaDoInstante(tarde_da_noite.toISOString())).toBe('2026-08-07')
  })

  it('a grade do mês fecha semanas inteiras, de domingo a sábado', () => {
    // Agosto de 2026 começa num sábado e termina numa segunda.
    const celulas = gradeDoMes({ ano: 2026, mes: 8 })

    expect(celulas.length % 7).toBe(0)
    expect(celulas[0]?.iso).toBe('2026-07-26') // domingo anterior ao dia 1
    expect(celulas[celulas.length - 1]?.iso).toBe('2026-09-05') // sábado seguinte

    const doMes = celulas.filter((c) => !c.deFora)
    expect(doMes).toHaveLength(31)
    expect(doMes[0]?.dia).toBe(1)
    expect(doMes[30]?.dia).toBe(31)
  })

  it('fevereiro de ano bissexto não ganha semana de outro mês', () => {
    const celulas = gradeDoMes({ ano: 2032, mes: 2 })
    expect(celulas.filter((c) => !c.deFora)).toHaveLength(29)
  })

  it('o mês vizinho atravessa a virada do ano', () => {
    expect(mesDeslocado({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 })
    expect(mesDeslocado({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 })
  })

  it('os limites do mês são o primeiro e o último dia', () => {
    expect(limitesDoMes({ ano: 2026, mes: 2 })).toEqual({ de: '2026-02-01', ate: '2026-02-28' })
    expect(limitesDoMes({ ano: 2026, mes: 8 })).toEqual({ de: '2026-08-01', ate: '2026-08-31' })
  })

  it('nomeia o mês em português', () => {
    expect(nomeDoMes({ ano: 2026, mes: 8 })).toContain('agosto')
    expect(nomeDoMes({ ano: 2026, mes: 8 })).toContain('2026')
  })

  it('a saudação segue os cortes do português falado', () => {
    expect(saudacao(new Date(2026, 7, 7, 8))).toBe('Bom dia')
    expect(saudacao(new Date(2026, 7, 7, 12))).toBe('Boa tarde')
    expect(saudacao(new Date(2026, 7, 7, 18))).toBe('Boa noite')
  })
})
