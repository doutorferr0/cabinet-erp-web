import type { PlanPhaseDto } from '@/api/gerado'
import { escalaDoPlano, faixaDoItem, periodoDaFase } from '@/features/planner/escala'
import { describe, expect, it } from 'vitest'

function fase(over: Partial<PlanPhaseDto> = {}): PlanPhaseDto {
  return {
    id: 'f1',
    name: 'Fase',
    startsOn: '2026-03-10',
    endsOn: '2026-05-20',
    items: [],
    ...over,
  }
}

describe('escala do gantt', () => {
  it('a grade fecha em mês inteiro nas duas pontas', () => {
    const escala = escalaDoPlano([fase()])
    expect(escala).not.toBeNull()
    if (!escala) return

    // Começa dia 10 de março e termina dia 20 de maio → a grade vai de 1º de
    // março a 31 de maio: coluna de mês tem de valer um mês inteiro, senão a
    // largura da primeira coluna mentiria sobre a duração.
    expect(escala.inicio.getMonth()).toBe(2)
    expect(escala.inicio.getDate()).toBe(1)
    expect(escala.fim.getMonth()).toBe(4)
    expect(escala.fim.getDate()).toBe(31)
    expect(escala.meses).toHaveLength(3)
    expect(escala.dias).toBe(31 + 30 + 31)
  })

  it('a grade atravessa a virada do ano', () => {
    const escala = escalaDoPlano([fase({ startsOn: '2026-11-05', endsOn: '2027-02-10' })])
    expect(escala?.meses).toHaveLength(4)
    expect(escala?.meses[0]).toMatchObject({ ano: 2026, mes: 11 })
    expect(escala?.meses[3]).toMatchObject({ ano: 2027, mes: 2 })
  })

  it('plano sem fase não tem escala', () => {
    expect(escalaDoPlano([])).toBeNull()
  })

  it('a barra começa e termina onde as datas mandam', () => {
    const escala = escalaDoPlano([fase({ startsOn: '2026-03-01', endsOn: '2026-03-31' })])
    if (!escala) throw new Error('escala esperada')

    // Março inteiro = 31 dias. Um item de 1 a 31 ocupa a grade toda.
    expect(faixaDoItem({ startsOn: '2026-03-01', endsOn: '2026-03-31' }, escala)).toEqual({
      esquerda: 0,
      largura: 100,
    })

    // Item do dia 16 ao 31: começa em 15/31 da grade.
    const meio = faixaDoItem({ startsOn: '2026-03-16', endsOn: '2026-03-31' }, escala)
    expect(meio.esquerda).toBeCloseTo((15 / 31) * 100, 5)
    expect(meio.largura).toBeCloseTo((16 / 31) * 100, 5)
  })

  it('item de um dia só continua visível', () => {
    const escala = escalaDoPlano([fase({ startsOn: '2026-03-01', endsOn: '2026-03-31' })])
    if (!escala) throw new Error('escala esperada')

    // Largura zero sumiria da tela, e o operador concluiria que a entrega não
    // está planejada.
    const umDia = faixaDoItem({ startsOn: '2026-03-10', endsOn: '2026-03-10' }, escala)
    expect(umDia.largura).toBeGreaterThan(0)
    expect(umDia.largura).toBeCloseTo((1 / 31) * 100, 5)
  })

  it('data ISO não é lida como UTC', () => {
    // `new Date('2026-03-01')` é meia-noite UTC — a oeste de Greenwich isso é
    // 28 de fevereiro, e a barra apareceria um dia (e às vezes um mês) antes.
    const escala = escalaDoPlano([fase({ startsOn: '2026-03-01', endsOn: '2026-03-31' })])
    expect(escala?.meses[0]).toMatchObject({ ano: 2026, mes: 3 })
  })

  it('o período da fase sai por extenso e curto', () => {
    expect(periodoDaFase(fase())).toMatch(/2026/)
  })
})
