/**
 * A guarda MUDOU DE SINAL em vez de sumir (api#84, fase 3).
 *
 * Ela nasceu protegendo a COMPATIBILIDADE: enquanto o vínculo aceitava os dois
 * caminhos de atribuição, o que não podia acontecer era o contrato passar a
 * exigir "exatamente um dos dois" — regra que faria a tela escolher entre
 * mandar o id e mandar o slug, e errar em metade dos casos.
 *
 * A compatibilidade acabou: `employee_company.role` não existe no servidor
 * desde a migração `0054`, e `role` saiu dos dois schemas. Apagar o arquivo
 * deixaria a remoção sem quem a defenda — e o jeito de ela voltar não é alguém
 * decidir voltar atrás, é um `sync` trazendo um schema velho por cima. Então a
 * mesma guarda passa a cobrar a AUSÊNCIA, que é o estado que se quer manter.
 */
import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

const doc = contrato as unknown as {
  components: {
    schemas: Record<string, { description?: string; properties?: Record<string, unknown> }>
  }
}

describe('atribuição de papel — só por `roleId`', () => {
  it('o vínculo não publica mais o slug legado, e continua publicando o id', () => {
    const vinculo = doc.components.schemas.EmployeeLinkRequest?.properties ?? {}

    expect(Object.keys(vinculo)).not.toContain('role')
    expect(Object.keys(vinculo)).toContain('roleId')
  })

  it('a ficha do colaborador também não devolve o slug legado', () => {
    // Este era o lado MORTO do par: o servidor respondia `null` nele desde a
    // `0054`, e um campo que só sabe responder `null` ensina a tela a tratar um
    // caso que não existe.
    const ficha = doc.components.schemas.EmployeeDetailDto?.properties ?? {}

    expect(Object.keys(ficha)).not.toContain('role')
    expect(Object.keys(ficha)).toEqual(expect.arrayContaining(['roleId', 'roleName']))
  })

  it('a descrição diz qual é o único caminho, e não que há um vencedor entre dois', () => {
    const descricao = doc.components.schemas.EmployeeLinkRequest?.description ?? ''

    expect(descricao).toContain('`roleId`, e só por ele')
    // As duas frases da fase anterior. Qualquer uma de volta significa que o
    // contrato voltou a ter dois caminhos de atribuição.
    expect(descricao).not.toContain('`roleId` vence')
    expect(descricao).not.toContain('exatamente um dos dois')
  })
})
