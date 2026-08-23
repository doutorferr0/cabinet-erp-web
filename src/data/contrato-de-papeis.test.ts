import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

const doc = contrato as unknown as {
  components: { schemas: Record<string, { description?: string }> }
}

describe('compatibilidade da atribuição de papel', () => {
  it('roleId vence o slug legado quando os dois chegam', () => {
    const descricao = doc.components.schemas.EmployeeLinkRequest?.description ?? ''

    expect(descricao).toContain('`roleId` vence')
    expect(descricao).not.toContain('exatamente um dos dois')
  })
})
