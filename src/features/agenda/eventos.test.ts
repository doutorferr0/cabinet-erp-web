import { AgendaEventDtoKind } from '@/api/gerado'
import { COLUNAS_POR_TIPO, ROTULOS_DO_TIPO, TOM_DO_TIPO } from '@/features/agenda/eventos'
import { describe, expect, it } from 'vitest'

/**
 * O contrato é quem manda nos tipos de compromisso.
 *
 * Estas três tabelas são traduções do enum do contrato, e o que este teste
 * vigia é o dia em que ele CRESCER: tipo novo sem tom cairia no calendário como
 * pílula cinza sem nome, e sem coluna sumiria do quadro inteiro — as duas
 * falhas são silenciosas, e é por isso que o teste existe.
 */
describe('tipos de compromisso da agenda', () => {
  const tipos = Object.values(AgendaEventDtoKind)

  it('todo tipo do contrato tem rótulo e tom', () => {
    for (const tipo of tipos) {
      expect(ROTULOS_DO_TIPO[tipo], `sem rótulo: ${tipo}`).toBeTruthy()
      expect(TOM_DO_TIPO[tipo], `sem tom: ${tipo}`).toBeTruthy()
    }
  })

  it('o quadro tem uma coluna por tipo, sem inventar nem perder nenhuma', () => {
    expect(COLUNAS_POR_TIPO.map((coluna) => coluna.id).sort()).toEqual([...tipos].sort())
  })
})
