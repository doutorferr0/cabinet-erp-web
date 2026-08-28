import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * O CORTE MEIO-TERMO DO COLABORADOR (#403) — o que este arquivo guarda é a
 * DECISÃO, não a existência dos campos.
 *
 * O formulário tinha ~30 campos e o contrato publicava 17; os ~13 restantes
 * nasciam em branco e não gravavam. A decisão do user (2026-08-28) resolveu a
 * diferença pelos DOIS lados, e cada metade tem um jeito próprio de se desfazer
 * sem ninguém ver:
 *
 * 1. **Sexo e raça/cor SAÍRAM** — dado sensível (LGPD art. 5º II) sem finalidade
 *    nem regra de acesso no produto. O jeito de isso se desfazer é alguém
 *    reintroduzir os campos "porque o legado tem", em outra sessão, sem a
 *    discussão de base legal. Os testes de ausência abaixo são o que obriga a
 *    conversa a acontecer de novo antes do campo voltar.
 * 2. **O resto ENTROU**, e entrou em DOIS níveis: pessoal na ORGANIZAÇÃO,
 *    trabalhista na EMPRESA ATIVA. O jeito de isso se desfazer é alguém mover
 *    salário ou vínculo para `EmployeeWriteRequest` por parecer mais simples —
 *    e aí gravar a ficha numa empresa reescreve em silêncio o que a pessoa tem
 *    na outra, que é o defeito que já mantinha cargo e setor fora de lá.
 *
 * O `cabinet-erp-api` lê o contrato, não este repositório (espelho: api#250):
 * parágrafo apagado aqui é decisão perdida lá.
 */

interface Propriedade {
  type?: string | string[]
  format?: string
  description?: string
  pattern?: string
}
interface Schema {
  required?: string[]
  description?: string
  properties?: Record<string, Propriedade>
}

const doc = contrato as unknown as { components: { schemas: Record<string, Schema> } }
const schemas = doc.components.schemas

const LEITURA = 'EmployeeDetailDto'
const ESCRITA_PESSOA = 'EmployeeWriteRequest'
const ESCRITA_VINCULO = 'EmployeeLinkRequest'

function campo(schema: string, nome: string): Propriedade {
  const prop = schemas[schema]?.properties?.[nome]
  if (prop === undefined) throw new Error(`${schema}.${nome} não existe no contrato`)
  return prop
}

function tem(schema: string, nome: string): boolean {
  return schemas[schema]?.properties?.[nome] !== undefined
}

/** Nível ORGANIZAÇÃO: a pessoa é a mesma nas duas empresas do grupo. */
const PESSOAIS = [
  'birthDate',
  'maritalStatusId',
  'spouseName',
  'spouseBirthDate',
  'fatherName',
  'motherName',
  'birthCityCode',
  'birthCity',
  'birthState',
  'nationalityId',
  'arrivalYear',
  'educationLevelId',
  'occupationId',
] as const

/** Nível EMPRESA ATIVA: muda por empresa, como cargo e setor já mudavam. */
const DO_VINCULO = ['employmentTypeId', 'salaryCents'] as const

/** Os pares id + nome resolvido pelo servidor — a tela guarda o id, imprime o nome. */
const RESOLVIDOS: ReadonlyArray<[string, string]> = [
  ['maritalStatusId', 'maritalStatus'],
  ['nationalityId', 'nationality'],
  ['educationLevelId', 'educationLevel'],
  ['occupationId', 'occupation'],
  ['employmentTypeId', 'employmentType'],
]

describe('sexo e raça/cor ficaram FORA, e a ausência é decisão', () => {
  it.each(['gender', 'race', 'raceColor', 'ethnicity'])(
    '%s não existe em nenhum schema de colaborador',
    (nome) => {
      // Não é "ainda não foi feito": é dado sensível (LGPD art. 5º II) que o
      // produto não tem finalidade para coletar. Quem precisar deles abre a
      // discussão de finalidade e base legal ANTES, e o campo nasce depois.
      expect(tem(LEITURA, nome)).toBe(false)
      expect(tem(ESCRITA_PESSOA, nome)).toBe(false)
      expect(tem(ESCRITA_VINCULO, nome)).toBe(false)
    },
  )

  it('a decisão está ESCRITA na descrição, e não só na ausência', () => {
    // Campo que nunca existiu e campo removido por decisão são indistinguíveis
    // por ausência. O api lê o contrato; sem o parágrafo, quem for implementar
    // acha que faltou e acrescenta.
    const descricao = schemas[LEITURA]?.description ?? ''
    expect(descricao).toContain('LGPD')
    expect(descricao).toMatch(/sens[íi]vel/i)
  })

  it('`gender` continua existindo no PARCEIRO — a decisão foi sobre colaborador', () => {
    // O Cliente é pessoa física de fora, o campo está no print do legado e já
    // grava. Apagar lá seria estender uma decisão sobre relação de EMPREGO a um
    // cadastro que não é isso.
    expect(tem('PartnerDto', 'gender')).toBe(true)
  })
})

describe('o bloco pessoal entrou nos DOIS lados', () => {
  it.each(PESSOAIS)('%s é publicado na leitura E na escrita da pessoa', (nome) => {
    // Campo só na leitura é dado que a tela mostra e não consegue gravar — o
    // operador corrige, salva, e o valor volta como estava.
    expect(campo(LEITURA, nome)).toBeDefined()
    expect(campo(ESCRITA_PESSOA, nome)).toBeDefined()
  })

  it.each(PESSOAIS)('%s é anulável — ficha parcial é o caso NORMAL', (nome) => {
    expect(campo(LEITURA, nome).type).toContain('null')
    expect(campo(ESCRITA_PESSOA, nome).type).toContain('null')
  })

  it('nenhum campo pessoal vazou para o vínculo', () => {
    for (const nome of PESSOAIS) {
      expect(tem(ESCRITA_VINCULO, nome)).toBe(false)
    }
  })
})

describe('vínculo e salário são da EMPRESA ATIVA, não da pessoa', () => {
  it.each(DO_VINCULO)('%s é lido no detalhe e escrito pelo /link', (nome) => {
    expect(campo(LEITURA, nome)).toBeDefined()
    expect(campo(ESCRITA_VINCULO, nome)).toBeDefined()
  })

  it.each(DO_VINCULO)('%s NÃO entra em EmployeeWriteRequest', (nome) => {
    // Este é o teste que segura a decisão inteira. Mover um destes para a ficha
    // da pessoa faz gravar numa empresa reescrever em silêncio o que a pessoa
    // tem na outra — o mesmo motivo que já mantinha cargo e setor fora de lá.
    expect(tem(ESCRITA_PESSOA, nome)).toBe(false)
  })

  it('a demissão já morava no vínculo, e continua lá', () => {
    expect(campo(LEITURA, 'dismissedAt').format).toBe('date')
    expect(campo(ESCRITA_VINCULO, 'dismissedAt')).toBeDefined()
    expect(tem(ESCRITA_PESSOA, 'dismissedAt')).toBe(false)
  })
})

describe('salário: centavos inteiros e admin-only nas DUAS pontas', () => {
  it.each([LEITURA, ESCRITA_VINCULO])('%s.salaryCents é inteiro int64, nunca float', (schema) => {
    const prop = campo(schema, 'salaryCents')
    expect(prop.type).toContain('integer')
    expect(prop.type).toContain('null')
    expect(prop.format).toBe('int64')
  })

  it.each([LEITURA, ESCRITA_VINCULO])('%s.salaryCents declara admin-only na descrição', (schema) => {
    // A regra de acesso não tem onde morar no OpenAPI a não ser na descrição —
    // `security` é por operação, e a operação inteira não é admin-only, só este
    // campo. É por este parágrafo que o api#250 implementa a permissão.
    const desc = campo(schema, 'salaryCents').description ?? ''
    expect(desc).toContain('admin')
  })

  it('a descrição diz que a LEITURA omite o campo em vez de mandar null', () => {
    // A metade que se esquece. `null` já significa "não há salário registrado";
    // usar o mesmo valor para "você não pode ver" faria a tela imprimir um
    // branco idêntico nos dois casos, e ninguém descobriria a diferença.
    const desc = campo(LEITURA, 'salaryCents').description ?? ''
    expect(desc).toMatch(/OMIT[EA]/)
    expect(desc).toContain('urn:cabinet:erro:papel-insuficiente')
  })
})

describe('cada lista de apoio viaja como id, com o nome resolvido ao lado', () => {
  it.each(RESOLVIDOS)('%s é uuid e vem acompanhado de %s', (id, nome) => {
    // Mesma promessa que setor e cargo já cobravam. A tela GUARDA o id e
    // IMPRIME o nome: gravar o nome faria o combo abrir sem seleção.
    expect(campo(LEITURA, id).format).toBe('uuid')
    expect(campo(LEITURA, nome)).toBeDefined()
  })

  it.each(RESOLVIDOS)('%s nunca vai junto do nome %s na ESCRITA', (id, nome) => {
    // O nome é serviço do servidor para a tela ler, não campo que ela grava —
    // aceitá-lo na escrita abriria dois caminhos para o mesmo dado.
    const escrita = id === 'employmentTypeId' ? ESCRITA_VINCULO : ESCRITA_PESSOA
    expect(campo(escrita, id)).toBeDefined()
    expect(tem(escrita, nome)).toBe(false)
  })

  it('profissão e cargo são kinds DIFERENTES, e a descrição diz qual é qual', () => {
    // `occupationId` é da pessoa (kind PROFISSAO) e vai com ela para qualquer
    // empresa; `jobTitleId` é do vínculo (kind CARGO) e pode ser outro em cada.
    // Trocá-los daria um combo aberto na lista errada, com valores plausíveis.
    expect(campo(LEITURA, 'occupationId').description).toContain('PROFISSAO')
    expect(campo(LEITURA, 'jobTitleId').description).toContain('CARGO')
  })
})

describe('naturalidade e ano de chegada carregam a razão da forma escolhida', () => {
  it('o código da cidade se declara OPACO — não há recurso de cidades', () => {
    // Sem `/api/cities` o valor não tem para onde apontar. Ele existe só para o
    // dado sobreviver ao ida-e-volta; quem o ler como chave estrangeira vai
    // procurar um caminho que o contrato não publica.
    const desc = campo(LEITURA, 'birthCityCode').description ?? ''
    expect(desc).toMatch(/opac/i)
    expect(campo(LEITURA, 'birthCityCode').format).toBeUndefined()
  })

  it('o ano de chegada é texto de 4 dígitos, e não data nem inteiro', () => {
    const prop = campo(ESCRITA_PESSOA, 'arrivalYear')
    expect(prop.type).toContain('string')
    expect(prop.pattern).toBe('^[0-9]{4}$')
    expect(prop.format).toBeUndefined()
  })
})
