import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A ESCRITA DE LISTA DE APOIO, no contrato (#250).
 *
 * Todo combo do legado tem um `+...` ao lado, e o contrato só publicava
 * `ListCatalogLookups`: cadastrar produto ou cliente novo travava no primeiro
 * combo vazio, e o operador tinha de sair da tela para voltar depois.
 *
 * As três invariantes abaixo são as que um leitor distraído desfaz sem
 * perceber. Nenhuma delas é sobre "existe a operação" — é sobre o que a forma
 * dela PROMETE ao backend que vai implementá-la.
 */

const doc = contrato as unknown as {
  paths: Record<string, Record<string, { operationId: string; responses: Record<string, unknown> }>>
  components: {
    schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }>
  }
}

describe('contrato — escrita de listas de apoio', () => {
  it('publica o cadastro e a edição, com os operationIds que o codegen exporta', () => {
    expect(doc.paths['/api/catalog-lookups']?.post?.operationId).toBe('CreateCatalogLookup')
    expect(doc.paths['/api/catalog-lookups/{id}']?.put?.operationId).toBe('UpdateCatalogLookup')
  })

  it('o `kind` entra no cadastro e NÃO na edição — item não muda de lista', () => {
    // Mover um item de lista mudaria o significado de todo registro que já
    // aponta para ele: um `CARGO` que vira `SETOR` deixa para trás fichas de
    // colaborador dizendo o que ninguém escreveu. Trocar de lista é desativar
    // aqui e cadastrar lá — e é por isso que o campo não existe no corpo do PUT.
    expect(
      Object.keys(doc.components.schemas.CatalogLookupCreateRequest?.properties ?? {}),
    ).toEqual(['kind', 'name', 'active'])
    expect(
      Object.keys(doc.components.schemas.CatalogLookupUpdateRequest?.properties ?? {}),
    ).toEqual(['name', 'active'])
  })

  it('as duas escritas declaram 409 — nome repetido dentro do kind', () => {
    // Sem o 409 declarado o cliente gerado não tipa a resposta, e a tela cai no
    // ramo de erro genérico: "algo deu errado" no lugar de "essa já existe".
    // Nome repetido no mesmo kind faz o combo mostrar duas linhas iguais, e a
    // escolha entre elas vira sorteio — dois ids que o operador leu como um.
    expect(doc.paths['/api/catalog-lookups']?.post?.responses['409']).toBeDefined()
    expect(doc.paths['/api/catalog-lookups/{id}']?.put?.responses['409']).toBeDefined()
  })

  it('o cadastro exige os três campos: sem `kind`, o item nasce fora de qualquer lista', () => {
    expect(doc.components.schemas.CatalogLookupCreateRequest?.required).toEqual([
      'kind',
      'name',
      'active',
    ])
  })
})
