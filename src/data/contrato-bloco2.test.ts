import { FILTRAVEIS, ORDENAVEIS } from '@/data/parceiros-api'
import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * BLOCO 2 DO COMPARATIVO — obra, contatos N e os endereços do cliente (#255).
 *
 * Três estruturas que o legado tem, o operador usa e o contrato não conhecia.
 * O que este arquivo guarda não é "a operação existe" — é a FORMA dela, que é
 * onde as decisões moram e por onde elas se desfazem sem ninguém perceber.
 */

interface Schema {
  description?: string
  required?: string[]
  properties?: Record<string, { $ref?: string; oneOf?: { $ref?: string }[]; description?: string }>
}
interface Operacao {
  operationId: string
  parameters?: { name: string; description?: string }[]
  responses: Record<string, unknown>
}

const doc = contrato as unknown as {
  paths: Record<string, Record<string, Operacao>>
  components: { schemas: Record<string, Schema> }
}
const schemas = doc.components.schemas

/** O `$ref` de um campo, seja direto ou dentro do `oneOf` do anulável. */
function refDoCampo(schema: string, campo: string): string | undefined {
  const prop = schemas[schema]?.properties?.[campo]
  return prop?.$ref ?? prop?.oneOf?.find((parte) => parte.$ref)?.$ref
}

describe('obra — coleção própria, e a camada está escrita', () => {
  it('publica listagem, inclusão, leitura por id e alteração', () => {
    expect(doc.paths['/api/works']?.get?.operationId).toBe('ListWorks')
    expect(doc.paths['/api/works']?.post?.operationId).toBe('CreateWork')
    expect(doc.paths['/api/works/{id}']?.get?.operationId).toBe('GetWork')
    expect(doc.paths['/api/works/{id}']?.put?.operationId).toBe('UpdateWork')
  })

  it('NÃO existe caminho aninhado em parceiro — as obras do cliente saem de `filters`', () => {
    // A decisão que o contrato já tomou uma vez, na hierarquia pai/filho: um
    // caminho aninhado seria uma segunda forma de perguntar a mesma coisa, com
    // paginação, ordenação e filtro próprios para manter.
    expect(doc.paths['/api/partners/{partnerId}/works']).toBeUndefined()
    const filters = doc.paths['/api/works']?.get?.parameters?.find((p) => p.name === 'filters')
    expect(filters?.description).toContain('customerId')
  })

  /**
   * **A camada é a pergunta que o backend precisa responder para escrever a
   * RLS**, e a issue pediu que ela ficasse escrita no schema, com o porquê.
   * Este teste existe porque a descrição é a única coisa que viaja até lá — o
   * `cabinet-erp-api` lê o contrato, não este repositório. Apagar o parágrafo
   * deixaria a decisão sem dono e a próxima migração escolheria de novo, no
   * escuro.
   */
  it('a obra é dado de EMPRESA, e a descrição diz por quê', () => {
    const descricao = schemas.WorkDto?.description ?? ''
    expect(descricao).toContain('EMPRESA')
    expect(descricao).toContain('Emp_codigo')
  })

  it('o contato é dado de ORGANIZAÇÃO, e a descrição diz por quê', () => {
    const descricao = schemas.PartnerContactDto?.description ?? ''
    expect(descricao).toContain('ORGANIZAÇÃO')
    // A prova é a ausência da coluna no legado, não a opinião de quem escreveu.
    expect(descricao).toContain('Emp_codigo')
  })

  it('o endereço da obra REUSA `PartnerAddress` — não há um segundo endereço', () => {
    // Duas definições do mesmo endereço divergem na primeira mudança, e a que
    // diverge é sempre a que ninguém está lendo.
    expect(refDoCampo('WorkDto', 'address')).toBe('#/components/schemas/PartnerAddress')
    expect(refDoCampo('WorkWriteRequest', 'address')).toBe('#/components/schemas/PartnerAddress')
  })

  it('obra sem cliente não existe: `customerId` e `description` são obrigatórios', () => {
    expect(schemas.WorkWriteRequest?.required).toContain('customerId')
    expect(schemas.WorkWriteRequest?.required).toContain('description')
  })
})

describe('contatos — sub-recurso, e não uma lista dentro do parceiro', () => {
  it('publica a coleção do parceiro e a alteração de um contato', () => {
    expect(doc.paths['/api/partners/{partnerId}/contacts']?.get?.operationId).toBe(
      'ListPartnerContacts',
    )
    expect(doc.paths['/api/partners/{partnerId}/contacts']?.post?.operationId).toBe(
      'CreatePartnerContact',
    )
    expect(doc.paths['/api/partners/{partnerId}/contacts/{contactId}']?.put?.operationId).toBe(
      'UpdatePartnerContact',
    )
  })

  it('`contacts` NÃO entra no `PartnerDto` nem no corpo de escrita', () => {
    // `PUT /api/partners/{id}` é INTEGRAL. Uma coleção dentro dele obrigaria
    // toda tela a devolver as N linhas que não mostra, e a regra "ausente ≠
    // nulo" resolve escalar, não coleção: a primeira leitura velha venceria e
    // apagaria o contato que outra tela acabou de incluir.
    expect(Object.keys(schemas.PartnerDto?.properties ?? {})).not.toContain('contacts')
    expect(Object.keys(schemas.PartnerWriteRequest?.properties ?? {})).not.toContain('contacts')
  })

  it('não existe DELETE em lugar nenhum do contrato — desativação é lógica', () => {
    // §9 padrão 8. Contato que saiu da empresa vai a `active: false` e continua
    // legível no documento antigo que o citou; apagado, a linha do pedido
    // apontaria para ninguém.
    const verbos = new Set(Object.values(doc.paths).flatMap((p) => Object.keys(p)))
    expect([...verbos].sort()).toEqual(['get', 'patch', 'post', 'put'])
    expect(schemas.PartnerContactWriteRequest?.required).toContain('active')
  })
})

describe('cobrança e comercial — publicados, e fora da consulta', () => {
  const NOVOS = [
    'billingAddress',
    'businessAddress',
    'businessName',
    'businessRole',
    'businessDocument',
    'foundedOn',
  ]

  it('os seis existem nos dois lados do parceiro', () => {
    for (const campo of NOVOS) {
      expect(Object.keys(schemas.PartnerDto?.properties ?? {}), campo).toContain(campo)
      expect(Object.keys(schemas.PartnerWriteRequest?.properties ?? {}), campo).toContain(campo)
    }
  })

  it('os dois endereços reusam `PartnerAddress`', () => {
    expect(refDoCampo('PartnerDto', 'billingAddress')).toBe('#/components/schemas/PartnerAddress')
    expect(refDoCampo('PartnerDto', 'businessAddress')).toBe('#/components/schemas/PartnerAddress')
  })

  it('nenhum deles entra na whitelist de `sortBy`/`filters` do parceiro', () => {
    // Publicar o dado não é publicar a consulta (regra herdada da #244/#246):
    // campo fora da whitelist do servidor responde 400 ao primeiro clique no
    // cabeçalho. Filtrar por cidade de cobrança pede coluna indexada, e isso é
    // decisão própria — não carona nesta PR.
    for (const campo of NOVOS) {
      expect(ORDENAVEIS, campo).not.toContain(campo)
      expect(FILTRAVEIS, campo).not.toContain(campo)
    }
  })
})
