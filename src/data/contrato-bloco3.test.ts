import { FILTRAVEIS, ORDENAVEIS } from '@/data/parceiros-api'
import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * BLOCO 3 DO COMPARATIVO — o que sobrou da aba `Principal` do cliente (#270).
 *
 * Os blocos 1 e 2 fecharam quatro das seis abas do Cliente. A `Principal` — a
 * ÚNICA de que existe captura — ficou pela metade: tipo de pessoa, RG (com
 * órgão e UF), sexo e data de nascimento estão no print e não estavam aqui.
 *
 * Como nos blocos anteriores, o que este arquivo guarda não é "o campo existe"
 * — é a FORMA e o PORQUÊ, que é por onde a decisão se desfaz sem ninguém ver.
 * O `cabinet-erp-api` lê o contrato, não este repositório: parágrafo apagado
 * aqui é decisão perdida lá.
 */

interface Propriedade {
  type?: string | string[]
  format?: string
  enum?: (string | null)[]
  $ref?: string
  description?: string
}
interface Schema {
  required?: string[]
  properties?: Record<string, Propriedade>
}

const doc = contrato as unknown as { components: { schemas: Record<string, Schema> } }
const schemas = doc.components.schemas

/** Os seis campos do bloco, na ordem em que a tela do legado os mostra. */
const CAMPOS = [
  'personType',
  'identityDocument',
  'identityIssuer',
  'identityIssuerState',
  'gender',
  'birthDate',
] as const

const LEITURA = 'PartnerDto'
const ESCRITA = 'PartnerWriteRequest'

function campo(schema: string, nome: string): Propriedade {
  const prop = schemas[schema]?.properties?.[nome]
  if (prop === undefined) throw new Error(`${schema}.${nome} não existe no contrato`)
  return prop
}

describe('os seis campos existem dos dois lados', () => {
  it.each(CAMPOS)('%s é publicado na leitura E na escrita', (nome) => {
    // Campo só na leitura é dado que a tela mostra e não consegue gravar —
    // o operador corrige, salva, e o valor volta como estava.
    expect(campo(LEITURA, nome)).toBeDefined()
    expect(campo(ESCRITA, nome)).toBeDefined()
  })

  it.each(CAMPOS)('%s é anulável — cadastro parcial é o caso NORMAL do legado', (nome) => {
    // Exigir qualquer um deles quebraria todo cadastro que já existe: a coluna
    // nasce vazia na migração, e o `PUT` do contrato substitui o registro inteiro.
    for (const schema of [LEITURA, ESCRITA]) {
      expect(campo(schema, nome).type, `${schema}.${nome}`).toContain('null')
      expect(schemas[schema]?.required ?? [], `${schema}.${nome}`).not.toContain(nome)
    }
  })
})

describe('publicar dado não é publicar consulta', () => {
  it.each(CAMPOS)('%s NÃO entra em sortBy nem em filters', (nome) => {
    // Regra herdada dos blocos 1 e 2. Ordenar clientes por RG ou por sexo não é
    // pergunta que alguém faz, e cada campo na whitelist é índice que o servidor
    // paga na escrita para consulta que ninguém pediu.
    expect(ORDENAVEIS, nome).not.toContain(nome)
    expect(FILTRAVEIS, nome).not.toContain(nome)
  })
})

describe('`personType` é campo, não inferência de `document`', () => {
  it('é conjunto fechado de dois, e aceita `null`', () => {
    for (const schema of [LEITURA, ESCRITA]) {
      expect(campo(schema, 'personType').enum, schema).toEqual(['individual', 'company', null])
    }
  })

  /**
   * A alternativa barata era adivinhar pelo tamanho de `document` — 11 dígitos
   * CPF, 14 CNPJ — e não ter campo nenhum. O motivo de NÃO fazer isso tem data
   * e precisa sobreviver a quem chegar depois achando que economizou um campo.
   */
  it('a descrição registra por que não se infere do documento', () => {
    const texto = campo(LEITURA, 'personType').description ?? ''
    expect(texto).toContain('31/07/2026')
    expect(texto).toContain('ALFANUMÉRICO')
  })
})

describe('nascimento não é fundação', () => {
  it('`birthDate` e `foundedOn` coexistem no mesmo schema', () => {
    // `foundedOn` entrou no bloco 2 e é a fundação da EMPRESA onde a pessoa
    // trabalha. Colapsar os dois faria a data da empregadora virar a data de
    // nascimento do cliente no primeiro cadastro que preenchesse os dois.
    for (const schema of [LEITURA, ESCRITA]) {
      expect(campo(schema, 'birthDate').format, schema).toBe('date')
      expect(campo(schema, 'foundedOn').format, schema).toBe('date')
    }
    expect(campo(LEITURA, 'birthDate').description).toContain('foundedOn')
  })
})

describe('o que a captura NÃO fixou continua texto livre', () => {
  it.each(['gender', 'identityIssuer'])('%s é string, não `$ref` de lista de apoio', (nome) => {
    // Mesmo caminho de `workType` no bloco 2: o print mostra o combo e NÃO os
    // valores dele. Promover a `catalog_lookups` agora obrigaria a inventar o
    // vocabulário — decisão que ninguém tomou. Vira lookup no dia em que a
    // lista for conhecida, e o campo não muda de nome quando isso acontecer.
    expect(campo(LEITURA, nome).$ref).toBeUndefined()
    expect(campo(LEITURA, nome).enum).toBeUndefined()
    expect(campo(LEITURA, nome).type).toContain('string')
  })

  it('`identityIssuerState` é campo PRÓPRIO, não a UF do endereço', () => {
    // Quem tirou o RG em Minas e mora em São Paulo tem as duas divergindo.
    expect(campo(LEITURA, 'identityIssuerState').description).toContain('endereço')
  })
})

describe('dado pessoal fica marcado no contrato', () => {
  it.each(['gender', 'birthDate'])('%s declara LGPD na descrição', (nome) => {
    // Não é enfeite: a decisão de LGPD do user está aberta, e é a tela que vai
    // decidir permissão. Ela decide a partir do que o contrato diz — se a marca
    // sumir daqui, some da única fonte que atravessa os dois repositórios.
    expect(campo(LEITURA, nome).description).toContain('LGPD')
  })
})
