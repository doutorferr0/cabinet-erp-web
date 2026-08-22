import { ORDENAVEIS_ATIVIDADE } from '@/data/atividades-api'
import {
  FILTRAVEIS_OPORTUNIDADE,
  ORDENAVEIS_FUNIL,
  ORDENAVEIS_MOTIVO_DE_PERDA,
  ORDENAVEIS_OPORTUNIDADE,
} from '@/data/crm-api'
import {
  FILTRAVEIS as FILTRAVEIS_PARCEIRO,
  ORDENAVEIS as ORDENAVEIS_PARCEIRO,
} from '@/data/parceiros-api'
import {
  FILTRAVEIS as FILTRAVEIS_PRODUTO,
  ORDENAVEIS as ORDENAVEIS_PRODUTO,
} from '@/data/produtos-api'
import { FILTRAVEIS_ORCAMENTO, ORDENAVEIS_ORCAMENTO } from '@/data/quotes-api'
import { ORDENAVEIS_PAPEL as ORDENAVEIS_PAPEL_MOCK } from '@/mocks/api/acesso'
import { ORDENAVEIS as ORDENAVEIS_ATIVIDADE_MOCK } from '@/mocks/api/atividades'
import { ORDENAVEIS as ORDENAVEIS_CONTATO_MOCK } from '@/mocks/api/contatos'
import {
  FILTRAVEIS_OPORTUNIDADE as FILTRAVEIS_OPORTUNIDADE_MOCK,
  ORDENAVEIS_COLABORADOR as ORDENAVEIS_COLABORADOR_MOCK,
  ORDENAVEIS_FUNIL as ORDENAVEIS_FUNIL_MOCK,
  ORDENAVEIS_MOTIVO as ORDENAVEIS_MOTIVO_MOCK,
  ORDENAVEIS_OPORTUNIDADE as ORDENAVEIS_OPORTUNIDADE_MOCK,
} from '@/mocks/api/crm'
import { ORDENAVEIS_DEPOSITO, ORDENAVEIS_SALDO } from '@/mocks/api/depositos'
import {
  FILTRAVEIS_PARCEIRO as FILTRAVEIS_PARCEIRO_MOCK,
  FILTRAVEIS_PRODUTO as FILTRAVEIS_PRODUTO_MOCK,
  ORDENAVEIS_LOOKUPS as ORDENAVEIS_LOOKUPS_MOCK,
  ORDENAVEIS_MOVIMENTO as ORDENAVEIS_MOVIMENTO_MOCK,
  ORDENAVEIS_PARCEIRO as ORDENAVEIS_PARCEIRO_MOCK,
  ORDENAVEIS_PRODUTO as ORDENAVEIS_PRODUTO_MOCK,
} from '@/mocks/api/handlers'
import { FILTRAVEIS as FILTRAVEIS_OBRA, ORDENAVEIS as ORDENAVEIS_OBRA } from '@/mocks/api/obras'
import { ORDENAVEIS_CONDICAO } from '@/mocks/api/pagamento'
import {
  FILTRAVEIS as FILTRAVEIS_ORCAMENTO_MOCK,
  ORDENAVEIS as ORDENAVEIS_ORCAMENTO_MOCK,
} from '@/mocks/api/quotes'
import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * `sortBy` FORA DA WHITELIST É 400 — E A WHITELIST PRECISA ESTAR PUBLICADA.
 *
 * O padrão 1 do `CLAUDE.md` descreve o modo de falhar: coluna cujo `accessorKey`
 * o servidor não aceita "quebra a ordenação com 400 só ao clicar no cabeçalho".
 * O que faltava era o outro lado dessa frase — **onde está escrito o que o
 * servidor aceita**. Em 21/08 a resposta era: em lugar nenhum, para 11 das 13
 * listagens (#284). A lista existia duas vezes, em `src/data/*-api.ts` e no
 * `MapaDeCampos` de cada módulo do `cabinet-erp-api`, e as duas cópias não se
 * conheciam. Foi assim que a obra publicou um par `id`+`name` cuja metade legível
 * não ordenava (#273).
 *
 * ## O que este arquivo guarda
 *
 * 1. **Toda listagem que publica `sortBy` declara a whitelist na descrição** — o
 *    mesmo cobrado do `filters` em `tests/filtros-do-contrato.test.ts` do
 *    `cabinet-erp-api`. Parâmetro cujo valor válido não está escrito é 400 que
 *    ninguém consegue prever.
 * 2. **A lista do front é IGUAL à publicada**, onde o front guarda uma. Divergir
 *    faz a tela desenhar a coluna ordenável e o servidor recusar o clique.
 * 3. **Listagem sem lista no front é nomeada**, com motivo. Sem isso, a lista
 *    nova nasce sem ninguém conferindo e a guarda não percebe.
 *
 * A lista de listagens é DESCOBERTA no contrato, nunca escrita aqui: operação
 * nova entra na cobrança sozinha. E a leitura da whitelist é a MESMA dos outros
 * dois lugares que já a fazem (o corte no travessão, no ponto ou no `**`),
 * porque as descrições seguem falando de campos depois de terminar a lista.
 */

interface Parametro {
  name: string
  description?: string
}
interface Operacao {
  operationId?: string
  parameters?: Parametro[]
}
const doc = contrato as unknown as { paths: Record<string, Record<string, Operacao>> }

type Listagem = {
  operationId: string
  caminho: string
  sortBy: string[] | undefined
  filters: string[] | undefined
}

/**
 * "Listagem" = operação `GET` que publica `pageSize`. É o traço do contrato, e
 * não um nome mantido à mão — o mesmo critério do guarda do backend.
 */
function listagensDoContrato(): Listagem[] {
  const achadas: Listagem[] = []
  for (const [caminho, item] of Object.entries(doc.paths)) {
    const op = item.get
    if (op === undefined) continue
    const parametros = op.parameters ?? []
    if (!parametros.some((p) => p.name === 'pageSize')) continue
    achadas.push({
      operationId: op.operationId ?? `GET ${caminho}`,
      caminho,
      sortBy: whitelist(parametros.find((p) => p.name === 'sortBy')),
      filters: whitelist(parametros.find((p) => p.name === 'filters')),
    })
  }
  return achadas
}

/** `undefined` = o parâmetro não é publicado. `[]` = publicado e MUDO. */
function whitelist(parametro: Parametro | undefined): string[] | undefined {
  if (parametro === undefined) return undefined
  const texto = (parametro.description ?? '').replace(/\s+/g, ' ')
  const rotulo = /Whitelist( deste recurso)?:/.exec(texto)
  if (rotulo === null) return []
  const resto = texto.slice(rotulo.index + rotulo[0].length)
  const fim = resto.search(/—|\.\s|\*\*/)
  return [...(fim === -1 ? resto : resto.slice(0, fim)).matchAll(/`([^`]+)`/g)].map(
    (m) => m[1] as string,
  )
}

/** A REGRA, sobre dados — para os modos de reprovar serem exercíveis com listas de mentira. */
function publicamSemDeclarar(listagens: readonly Listagem[], qual: 'sortBy' | 'filters'): string[] {
  return listagens
    .filter((l) => l[qual] !== undefined && l[qual]?.length === 0)
    .map((l) => l.operationId)
    .sort()
}

/**
 * As listagens cujo `sortBy` o front NÃO guarda em lista própria, e por quê.
 *
 * Não é allowlist de conveniência: é o inventário do que ainda não tem tela. No
 * dia em que uma delas ganhar `ORDENAVEIS`, o caso "o inventário é o complemento"
 * reprova e cobra a entrada aqui — que é o mesmo que cobrar a conferência.
 */
const SEM_LISTA_NO_FRONT: Record<string, string> = {
  ListOrders: 'pedido de venda ainda não tem listagem própria na tela',
  ListCatalogLookups: 'o combo pede por `kind` e não ordena — não há cabeçalho para clicar',
  ListStockMovements: 'kardex desenha em ordem fixa (`occurredAt` desc), sem coluna ordenável',
  ListEmployees: 'colaborador ainda é provider de mock, com lista própria lá',
  ListPartnerContacts: 'a grade do parceiro é sub-recurso e não tem cabeçalho ordenável',
  ListRoles:
    'papéis nasceram no contrato antes da tela — a de checkboxes é trilho próprio, depois da fase 1 do api#84',
  ListStockLocations:
    'depósito ainda não tem tela — a lista existe no mock, e é lá que é conferida',
  ListStockBalances: 'saldo por depósito ainda não tem tela — idem, a lista é a do mock',
  ListPaymentTerms:
    'condição de pagamento ainda não tem tela — a lista existe no mock, e é lá que é conferida',
}

/** O `sortBy` publicado × a lista que o front manda. */
const ORDENAVEIS_DO_FRONT: Record<string, readonly string[]> = {
  ListProducts: ORDENAVEIS_PRODUTO,
  ListPartners: ORDENAVEIS_PARCEIRO,
  ListQuotes: ORDENAVEIS_ORCAMENTO,
  ListActivities: ORDENAVEIS_ATIVIDADE,
  ListCrmPipelines: ORDENAVEIS_FUNIL,
  ListCrmOpportunities: ORDENAVEIS_OPORTUNIDADE,
  ListCrmLostReasons: ORDENAVEIS_MOTIVO_DE_PERDA,
  ListWorks: ORDENAVEIS_OBRA,
}

/**
 * O `sortBy` publicado × a lista que O MOCK recusa fora dela.
 *
 * Duas cópias diferentes da mesma frase: `src/data/*-api.ts` é o que a TELA
 * manda, e estas são as que o MOCK aceita. As duas precisam bater com o
 * contrato, e por motivos diferentes — a primeira porque o servidor recusa, a
 * segunda porque **o site público é 100% mock** e ali quem recusa é ela.
 *
 * Três estavam menores que o contrato quando esta lista nasceu: `catalog-lookups`
 * sem `active`, o kardex só com `occurredAt`, e o parceiro sem `parentId` — este
 * com a TELA mandando `parentId`, ou seja, 400 garantido no clique do cabeçalho
 * em `cabinetonline.cc`.
 */
const ORDENAVEIS_DO_MOCK: Record<string, readonly string[]> = {
  ListProducts: ORDENAVEIS_PRODUTO_MOCK,
  ListPartners: ORDENAVEIS_PARCEIRO_MOCK,
  ListCatalogLookups: ORDENAVEIS_LOOKUPS_MOCK,
  ListStockMovements: ORDENAVEIS_MOVIMENTO_MOCK,
  ListPartnerContacts: ORDENAVEIS_CONTATO_MOCK,
  ListQuotes: ORDENAVEIS_ORCAMENTO_MOCK,
  ListActivities: ORDENAVEIS_ATIVIDADE_MOCK,
  ListCrmPipelines: ORDENAVEIS_FUNIL_MOCK,
  ListCrmLostReasons: ORDENAVEIS_MOTIVO_MOCK,
  ListCrmOpportunities: ORDENAVEIS_OPORTUNIDADE_MOCK,
  ListEmployees: ORDENAVEIS_COLABORADOR_MOCK,
  ListWorks: ORDENAVEIS_OBRA,
  ListRoles: ORDENAVEIS_PAPEL_MOCK,
  // Depósito e saldo nascem sem tela e COM mock (#291). É este eixo que os
  // mede, e não o de cima: quem recusa `sortBy` fora da whitelist, hoje, é o
  // handler — e o site público é 100% mock.
  ListStockLocations: ORDENAVEIS_DEPOSITO,
  ListStockBalances: ORDENAVEIS_SALDO,
  // Condição de pagamento nasce sem tela e COM mock (S4), como depósito: quem
  // recusa `sortBy` fora da whitelist, hoje, é o handler.
  ListPaymentTerms: ORDENAVEIS_CONDICAO,
}

/**
 * A listagem que o MOCK não serve, e por quê.
 *
 * `/api/orders` está no contrato e na passagem, e handler nenhum o responde: em
 * modo mock ele cai no fallback da SPA e volta `index.html` com 200, que é o
 * `urn:cabinet:erro:resposta-nao-json` do cliente. Hoje não morde porque tela
 * nenhuma o consome — quando alguma consumir, é o site público que quebra.
 */
const SEM_HANDLER_NO_MOCK: Record<string, string> = {
  ListOrders: 'pedido de venda não tem handler no mock — nenhuma tela o consome ainda',
}

/**
 * O `filters` publicado × o que O MOCK aplica.
 *
 * A régua da linha de cima mede a TELA; esta mede quem recorta em modo mock. O
 * pior caso deste eixo não é recusar demais, é **ignorar**: filtro descartado em
 * silêncio devolve a lista inteira com a condição desenhada no painel, e quem lê
 * conclui que ela não estreita nada. Era o caso do orçamento até 2026-08-22 — o
 * handler nunca olhou para `filters`.
 */
const FILTRAVEIS_DO_MOCK: Record<string, readonly string[]> = {
  ListProducts: Object.keys(FILTRAVEIS_PRODUTO_MOCK),
  ListPartners: Object.keys(FILTRAVEIS_PARCEIRO_MOCK),
  ListQuotes: Object.keys(FILTRAVEIS_ORCAMENTO_MOCK),
  ListCrmOpportunities: Object.keys(FILTRAVEIS_OPORTUNIDADE_MOCK),
  ListWorks: Object.keys(FILTRAVEIS_OBRA),
}

/** O `filters` publicado × a lista que o front manda, onde ele publica. */
const FILTRAVEIS_DO_FRONT: Record<string, readonly string[]> = {
  ListProducts: FILTRAVEIS_PRODUTO,
  ListPartners: FILTRAVEIS_PARCEIRO,
  ListQuotes: FILTRAVEIS_ORCAMENTO,
  ListCrmOpportunities: FILTRAVEIS_OPORTUNIDADE,
  ListWorks: Object.keys(FILTRAVEIS_OBRA),
}

const listagens = listagensDoContrato()

describe('1. o contrato é lido de verdade (a guarda se guarda)', () => {
  it('acha as listagens pelo traço `pageSize`, não por uma lista escrita aqui', () => {
    // Piso: se a leitura parar de casar, ela acha zero e todo o resto do arquivo
    // percorre lista vazia — verde para sempre, medindo nada.
    expect(listagens.length).toBeGreaterThanOrEqual(13)
    expect(listagens.every((l) => l.sortBy !== undefined)).toBe(true)
  })
})

describe('2. quem publica `sortBy` diz QUAIS campos', () => {
  it('nenhuma listagem publica o parâmetro e cala a whitelist', () => {
    expect(
      publicamSemDeclarar(listagens, 'sortBy'),
      'Operação publica `sortBy` e a descrição não diz a whitelist. O valor válido ' +
        'passa a existir só no código dos dois lados, e o 400 vira surpresa no clique.',
    ).toEqual([])
  })

  it('o mesmo vale para `filters`, onde ele é publicado', () => {
    expect(publicamSemDeclarar(listagens, 'filters')).toEqual([])
  })
})

describe('3. a lista do front é a publicada', () => {
  it.each(Object.keys(ORDENAVEIS_DO_FRONT))('%s ordena pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.sortBy
    expect(publicada, `${opid} sumiu do contrato`).toBeDefined()
    expect([...(ORDENAVEIS_DO_FRONT[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })

  it.each(Object.keys(FILTRAVEIS_DO_FRONT))('%s filtra pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.filters
    expect(publicada, `${opid} não publica filters`).toBeDefined()
    expect([...(FILTRAVEIS_DO_FRONT[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })
})

describe('3b. o MOCK aceita o que o contrato publica', () => {
  it.each(Object.keys(ORDENAVEIS_DO_MOCK))('%s ordena pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.sortBy
    expect(publicada, `${opid} sumiu do contrato`).toBeDefined()
    expect([...(ORDENAVEIS_DO_MOCK[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })

  it.each(Object.keys(FILTRAVEIS_DO_MOCK))('%s filtra pelo que o contrato aceita', (opid) => {
    const publicada = listagens.find((l) => l.operationId === opid)?.filters
    expect(publicada, `${opid} não publica filters`).toBeDefined()
    expect([...(FILTRAVEIS_DO_MOCK[opid] as string[])].sort()).toEqual(
      [...(publicada as string[])].sort(),
    )
  })

  it('quem publica `filters` tem mock que os APLICA — ignorar é pior que recusar', () => {
    // Filtro descartado em silêncio faz a tela mostrar a lista inteira com a
    // condição no painel. Se uma listagem publica `filters` e não aparece aqui,
    // ou ela ganhou um mapa no mock, ou o handler dela não existe (e aí está
    // nomeado no inventário abaixo).
    const semMapa = listagens
      .filter((l) => l.filters !== undefined)
      .map((l) => l.operationId)
      .filter((id) => FILTRAVEIS_DO_MOCK[id] === undefined && SEM_HANDLER_NO_MOCK[id] === undefined)
      .sort()

    expect(semMapa, 'publica `filters` e o mock não os aplica').toEqual([])
  })

  it('toda listagem tem handler no mock, ou está nomeada com o motivo', () => {
    const orfas = listagens
      .map((l) => l.operationId)
      .filter((id) => ORDENAVEIS_DO_MOCK[id] === undefined && SEM_HANDLER_NO_MOCK[id] === undefined)
      .sort()

    expect(
      orfas,
      'Listagem do contrato que o mock não serve e ninguém declarou: em modo mock ' +
        'ela devolve o `index.html` da SPA com 200, e o site público é 100% mock.',
    ).toEqual([])
  })
})

describe('4. o inventário é o complemento — nada fica sem dono em silêncio', () => {
  it('toda listagem ou tem lista no front, ou está nomeada com motivo', () => {
    const orfas = listagens
      .map((l) => l.operationId)
      .filter((id) => ORDENAVEIS_DO_FRONT[id] === undefined && SEM_LISTA_NO_FRONT[id] === undefined)
      .sort()

    expect(
      orfas,
      'Listagem do contrato que ninguém confere: ou ela ganha `ORDENAVEIS` no front ' +
        'e entra em ORDENAVEIS_DO_FRONT, ou entra em SEM_LISTA_NO_FRONT com o motivo.',
    ).toEqual([])
  })

  it('o inventário não guarda nome que o contrato não conhece', () => {
    const conhecidas = new Set(listagens.map((l) => l.operationId))
    const fantasmas = Object.keys(SEM_LISTA_NO_FRONT).filter((id) => !conhecidas.has(id))

    expect(fantasmas, 'nome no inventário que sumiu do contrato — lixo de renomeação').toEqual([])
  })
})

describe('5. a guarda sabe ficar vermelha', () => {
  const mudo: Listagem[] = [
    { operationId: 'ListFalsa', caminho: '/api/falsa', sortBy: [], filters: undefined },
    { operationId: 'ListOutra', caminho: '/api/outra', sortBy: ['a'], filters: [] },
  ]

  it('acusa quem publica o parâmetro sem declarar a whitelist', () => {
    expect(publicamSemDeclarar(mudo, 'sortBy')).toEqual(['ListFalsa'])
    expect(publicamSemDeclarar(mudo, 'filters')).toEqual(['ListOutra'])
  })

  it('a leitura corta no fim da FRASE, não engole o resto da descrição', () => {
    // `/api/crm/opportunities` continua falando de campos depois da lista, para
    // dizer o que ficou de FORA. Parser guloso cobraria o contrário da frase.
    const opp = listagens.find((l) => l.operationId === 'ListCrmOpportunities')

    expect(opp?.sortBy).toContain('expectedValueCents')
    expect(opp?.filters).not.toContain('expectedValueCents')
  })
})
