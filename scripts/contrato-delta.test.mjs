import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compararContratos, operacoesDe, somaEsperada } from './contrato-delta.mjs'

/**
 * O que precisa ser provado aqui é a classe ALTERADA — as outras duas se veem a
 * olho. Uma comparação ingênua (contar operationId, ou `diff` do nó de `paths`)
 * passaria verde nos dois casos que mais importam: o schema de componente que
 * mudou atrás de um `$ref`, e o `security` que a operação herda sem declarar.
 * Cada caso abaixo existe porque falharia com a versão ingênua.
 */

const BASE = {
  openapi: '3.1.0',
  info: { title: 'teste', version: 'v1' },
  security: [{ sessao: [] }],
  paths: {
    '/api/coisas': {
      get: {
        operationId: 'ListCoisas',
        responses: { 200: { $ref: '#/components/responses/ListaDeCoisas' } },
      },
      post: {
        operationId: 'CreateCoisa',
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Coisa' } } },
        },
        responses: { 201: { description: 'criada' } },
      },
    },
  },
  components: {
    schemas: {
      Coisa: { type: 'object', properties: { nome: { type: 'string' } } },
      Lista: { type: 'array', items: { $ref: '#/components/schemas/Coisa' } },
    },
    responses: {
      ListaDeCoisas: {
        description: 'ok',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Lista' } } },
      },
    },
  },
}

/** Cópia profunda: cada caso mexe no seu documento sem contaminar o vizinho. */
const copia = (documento) => JSON.parse(JSON.stringify(documento))

describe('compararContratos', () => {
  it('não acusa mudança entre um documento e ele mesmo', () => {
    const delta = compararContratos(BASE, copia(BASE))
    expect(delta).toMatchObject({ totalBaseline: 2, totalVivo: 2 })
    expect([...delta.novas, ...delta.removidas, ...delta.alteradas]).toEqual([])
  })

  it('acusa a operação que o contrato vivo acrescentou', () => {
    const vivo = copia(BASE)
    vivo.paths['/api/coisas/{id}'] = {
      get: { operationId: 'GetCoisa', responses: { 200: { description: 'ok' } } },
    }
    const delta = compararContratos(BASE, vivo)
    expect(delta.novas.map((o) => o.id)).toEqual(['GetCoisa'])
    expect(delta.novas[0]).toMatchObject({ metodo: 'GET', caminho: '/api/coisas/{id}' })
    expect(delta.alteradas).toEqual([])
  })

  it('acusa a operação que saiu do contrato vivo', () => {
    const vivo = copia(BASE)
    const { post: _saiu, ...resto } = vivo.paths['/api/coisas']
    vivo.paths['/api/coisas'] = resto
    const delta = compararContratos(BASE, vivo)
    expect(delta.removidas.map((o) => o.id)).toEqual(['CreateCoisa'])
    expect(delta.novas).toEqual([])
  })

  it('acusa mudança DENTRO da operação, com o operationId intacto', () => {
    const vivo = copia(BASE)
    vivo.paths['/api/coisas'].get.parameters = [
      { name: 'q', in: 'query', schema: { type: 'string' } },
    ]
    const delta = compararContratos(BASE, vivo)
    expect(delta.alteradas.map((o) => o.id)).toEqual(['ListCoisas'])
  })

  it('acusa mudança no schema alcançado por DOIS saltos de $ref', () => {
    // `ListCoisas` -> responses/ListaDeCoisas -> schemas/Lista -> schemas/Coisa.
    // Nada dentro de `paths` muda: é o caso que a comparação ingênua perde.
    const vivo = copia(BASE)
    vivo.components.schemas.Coisa.properties.preco = { type: 'integer' }
    const delta = compararContratos(BASE, vivo)
    expect(delta.alteradas.map((o) => o.id)).toEqual(['CreateCoisa', 'ListCoisas'])
  })

  it('acusa mudança no security do TOPO, que a operação herda sem declarar', () => {
    const vivo = copia(BASE)
    vivo.security = [{ sessao: [] }, { chave: [] }]
    const delta = compararContratos(BASE, vivo)
    expect(delta.alteradas.map((o) => o.id)).toEqual(['CreateCoisa', 'ListCoisas'])
  })

  it('não confunde a operação que declara o próprio security com a que herda', () => {
    const comProprio = copia(BASE)
    comProprio.paths['/api/coisas'].get.security = []
    const vivo = copia(comProprio)
    vivo.security = [{ sessao: [] }, { chave: [] }]
    const delta = compararContratos(comProprio, vivo)
    expect(delta.alteradas.map((o) => o.id)).toEqual(['CreateCoisa'])
  })

  it('acusa mudança em parâmetro declarado no path item', () => {
    const vivo = copia(BASE)
    vivo.paths['/api/coisas'].parameters = [
      { name: 'tenant', in: 'header', schema: { type: 'string' } },
    ]
    const delta = compararContratos(BASE, vivo)
    expect(delta.alteradas.map((o) => o.id)).toEqual(['CreateCoisa', 'ListCoisas'])
  })

  it('ignora reordenação de chaves — o JSON é canonizado antes do hash', () => {
    // As mesmas chaves, escritas na ordem inversa. Um `diff` de texto acusaria
    // mudança; a canonização não, porque nada MUDOU para quem implementa.
    const vivo = copia(BASE)
    const { type, properties } = vivo.components.schemas.Coisa
    vivo.components.schemas.Coisa = { properties, type }
    const delta = compararContratos(BASE, vivo)
    expect(delta.alteradas).toEqual([])
  })
})

describe('a baseline versionada', () => {
  const CAMINHO = 'contracts/baseline/v1.0.0.json'
  const bruto = readFileSync(CAMINHO)
  const baseline = JSON.parse(bruto.toString())

  it('é o contrato inteiro, com operationId em toda operação', () => {
    const operacoes = operacoesDe(baseline)
    expect(operacoes.size).toBeGreaterThan(200)
    for (const id of operacoes.keys()) {
      expect(id, 'operação sem operationId cairia num nome montado por método+caminho').toMatch(
        /^[A-Za-z][A-Za-z0-9]*$/,
      )
    }
  })

  it('declara a versão que dá nome ao arquivo', () => {
    expect(baseline.info.version).toBe('1.0.0')
  })

  /**
   * A soma existe para o CI do Spring conferir de fora, e um `.sha256` que
   * descreve outro byte é pior que nenhum: passaria despercebido até o dia em
   * que alguém dependesse dele.
   */
  it('bate com a soma publicada em v1.0.0.sha256', () => {
    expect(createHash('sha256').update(bruto).digest('hex')).toBe(somaEsperada())
  })
})
