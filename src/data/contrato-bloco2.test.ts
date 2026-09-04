import {
  FILTRAVEIS as FILTRAVEIS_DO_PARCEIRO,
  ORDENAVEIS as ORDENAVEIS_DO_PARCEIRO,
} from '@/data/parceiros-api'
import { FILTRAVEIS, ORDENAVEIS } from '@/mocks/api/obras'
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
   * `sortBy` e `filters` da obra deixaram de ser a MESMA lista (#273/#280), e a
   * #273 fechou com elas divergindo dos DOIS lados, não de um. O que este bloco
   * guarda não é a decisão — é a CÓPIA dela no mock.
   *
   * O mock é quem responde em dev e no site público (100% mock). Whitelist que
   * diverge da publicada faz a tela ordenar em dev e tomar 400 contra o `:3000`,
   * e o modo de descobrir é o clique do cabeçalho na demo — não a suíte.
   *
   * A leitura da whitelist é a MESMA que `tests/filtros-do-contrato.test.ts` do
   * `cabinet-erp-api` faz nesta descrição, e o corte no travessão / no ponto / no
   * `**` não é enfeite: as descrições seguem falando de campos depois de terminar
   * a lista, e um parser guloso cobraria justamente o que a frase exclui. Escrever
   * a versão gulosa primeiro deu 7 campos onde havia 5.
   */
  describe('as duas whitelists da obra, e o mock copia as duas', () => {
    const parametro = (nome: string) =>
      doc.paths['/api/works']?.get?.parameters?.find((p) => p.name === nome)?.description ?? ''

    function whitelist(descricao: string): string[] {
      const texto = descricao.replace(/\s+/g, ' ')
      const rotulo = /Whitelist( deste recurso)?:/.exec(texto)
      if (rotulo === null) return []
      const resto = texto.slice(rotulo.index + rotulo[0].length)
      const fim = resto.search(/—|\.\s|\*\*/)
      return [...(fim === -1 ? resto : resto.slice(0, fim)).matchAll(/`([^`]+)`/g)].map(
        (m) => m[1] as string,
      )
    }

    it('a leitura acha as duas listas — piso, senão o resto mede lista vazia', () => {
      expect(whitelist(parametro('sortBy')).length).toBeGreaterThanOrEqual(4)
      expect(whitelist(parametro('filters')).length).toBeGreaterThanOrEqual(4)
    })

    it('a divergência é dos DOIS lados — não é subtração de uma lista só', () => {
      // `/api/crm/opportunities` subtrai `expectedValueCents` do filtro e nada
      // mais; aqui cada lista tem um campo que a outra não tem. `customerId`
      // filtra porque é assim que a tela pergunta "as obras deste cliente", e
      // não ordena porque ordem de uuid não significa nada para quem lê.
      // `customerName` faz as duas: é a coluna, e é por trecho dela que a janela
      // de busca procura quando não se tem o id.
      expect(whitelist(parametro('sortBy'))).toContain('customerName')
      expect(whitelist(parametro('sortBy'))).not.toContain('customerId')
      expect(whitelist(parametro('filters'))).toContain('customerName')
      expect(whitelist(parametro('filters'))).toContain('customerId')
    })

    it('o mock serve exatamente o que o contrato publica, nas duas listas', () => {
      expect([...ORDENAVEIS].sort()).toEqual(whitelist(parametro('sortBy')).sort())
      expect(Object.keys(FILTRAVEIS).sort()).toEqual(whitelist(parametro('filters')).sort())
    })
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

  it('DELETE só onde não há dado de negócio para preservar — desativação é lógica', () => {
    // §9 padrão 8. Contato que saiu da empresa vai a `active: false` e continua
    // legível no documento antigo que o citou; apagado, a linha do pedido
    // apontaria para ninguém.
    //
    // A REGRA VALE PARA DADO DE NEGÓCIO, e a D13 mostrou onde ela para: uma
    // CONSULTA SALVA é preferência do próprio usuário, e documento nenhum a
    // cita. Guardá-la com `favorite: false` deixaria um registro vazio que não
    // aparece em lugar nenhum e que ele não tem como limpar — lixo em nome de
    // uma regra escrita para outra coisa. Por isso a exceção é NOMEADA em vez de
    // a asserção ser afrouxada: `DELETE` novo em qualquer outro caminho continua
    // reprovando aqui, e quem o quiser precisa escrever o argumento nesta lista.
    const COM_DELETE = ['/api/me/views/{id}']
    const comDelete = Object.entries(doc.paths)
      .filter(([, p]) => 'delete' in p)
      .map(([caminho]) => caminho)
      .sort()
    expect(comDelete).toEqual(COM_DELETE)

    const outrosVerbos = new Set(
      Object.values(doc.paths).flatMap((p) => Object.keys(p).filter((v) => v !== 'delete')),
    )
    expect([...outrosVerbos].sort()).toEqual(['get', 'patch', 'post', 'put'])
    expect(schemas.PartnerContactWriteRequest?.required).toContain('active')
  })
})

/**
 * O ESPECIFICADOR APONTA PARA PARCEIRO — e a descrição do contrato já afirmou o
 * contrário (#258).
 *
 * A #250 escreveu "item da lista `PROFISSIONAL`" olhando o mock, que guardava
 * `idDeApoio('PROFISSIONAL', …)`. O backend, lendo a mesma issue, gravou
 * `specifier_id uuid REFERENCES partners (id)`. As duas fontes de verdade
 * conviveram por horas sem sintoma: contra o MOCK os dois formatos são string,
 * o teste passa verde, e o 400 só aparece no par local.
 *
 * É por isso que a guarda é sobre a DESCRIÇÃO. O `format: uuid` não distingue
 * lookup de parceiro — os dois são uuid —, então o único lugar onde a decisão
 * pode viver é a prosa que o backend lê. Guardá-la aqui é o que impede a frase
 * de voltar a dizer "lista" na próxima edição distraída.
 */
describe('especificador — parceiro, não item de lista', () => {
  it('a descrição diz `partners.id`, e não mais lista de apoio', () => {
    const dto = schemas.PartnerDto?.properties?.specifierId?.description ?? ''
    expect(dto).toContain('partners.id')
    // A negativa mira a AFIRMAÇÃO errada, não a palavra: a descrição cita o
    // engano anterior de propósito ("dizia que era item da lista … e estava
    // errada"), porque quem for implementar precisa saber que a frase mudou.
    // Proibir a palavra proibiria a explicação.
    expect(dto).not.toMatch(/é item da lista/)
  })

  it('e o corpo de escrita diz a mesma coisa — as duas pontas juntas', () => {
    // Divergir DTO e WriteRequest seria a mesma classe de defeito num tamanho
    // menor: quem lê a escrita para implementar mandaria o id errado.
    const escrita = schemas.PartnerWriteRequest?.properties?.specifierId?.description ?? ''
    expect(escrita).toContain('partners.id')
  })

  it('`specifierName` é razão social de parceiro, não rótulo de lookup', () => {
    expect(schemas.PartnerDto?.properties?.specifierName?.description ?? '').toContain('PARCEIRO')
  })

  it('continua distinto de `parentId` — são dois vínculos, não um', () => {
    // A correção não pode colapsar os dois: `parentId` liga o profissional ao
    // escritório; `specifierId` liga o cliente a quem o trouxe. Mesmo shape,
    // e é justamente por isso que a confusão é fácil.
    const dto = schemas.PartnerDto?.properties?.specifierId?.description ?? ''
    expect(dto).toContain('NÃO é `parentId`')
    expect(Object.keys(schemas.PartnerDto?.properties ?? {})).toContain('parentId')
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
      expect(ORDENAVEIS_DO_PARCEIRO, campo).not.toContain(campo)
      expect(FILTRAVEIS_DO_PARCEIRO, campo).not.toContain(campo)
    }
  })
})
