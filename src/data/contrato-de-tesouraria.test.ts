import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * FASE A DO G7 — o contrato de TESOURARIA (api#112).
 *
 * O que este arquivo guarda não é "o caminho existe" — o codegen já quebraria
 * sem ele. É a FORMA e o PORQUÊ de cinco decisões que se desfazem sem ninguém
 * ver, porque desfazê-las deixa o contrato válido e a suíte verde:
 *
 * 1. **um recurso para pagar e receber**, discriminado por `direction`;
 * 2. **`dueDate` fora do `sortBy` do TÍTULO** e dentro do da PARCELA;
 * 3. **a baixa aponta a CONTA**, não só o meio de pagamento;
 * 4. **o lote é um ato só**, e o `batchId` é o que o prova;
 * 5. **nada de DELETE**, em caminho nenhum do módulo.
 *
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
  description?: string
  required?: string[]
  properties?: Record<string, Propriedade>
}
interface Parametro {
  name: string
  in: string
  description?: string
}
interface Operacao {
  operationId: string
  tags?: string[]
  description?: string
  parameters?: Parametro[]
  responses?: Record<string, unknown>
}

const doc = contrato as unknown as {
  paths: Record<string, Record<string, Operacao>>
  components: { schemas: Record<string, Schema> }
}
const schemas = doc.components.schemas

/** O vocabulário fechado de `type`, com o enum e a tabela de títulos canônicos. */
const problemType = schemas.ProblemType as unknown as { enum: string[]; description: string }

/** Os verbos que o caminho publica. */
function verbos(caminho: string): string[] {
  return Object.keys(doc.paths[caminho] ?? {})
}

/** Os doze caminhos que a FASE A publicou. */
const CAMINHOS = [
  '/api/financial-titles',
  '/api/financial-titles/{id}',
  '/api/financial-titles/{id}/cancel',
  '/api/financial-installments',
  '/api/financial-installments/{id}/settlements',
  '/api/financial-settlements/batch',
  '/api/cash-movements',
  '/api/cash-movements/{id}/reconcile',
  '/api/cash-transfers',
  '/api/bank-accounts',
  '/api/cash-registers',
  '/api/payment-modes',
] as const

function operacao(caminho: string, verbo: string): Operacao {
  const op = doc.paths[caminho]?.[verbo]
  if (op === undefined) throw new Error(`${verbo.toUpperCase()} ${caminho} não existe no contrato`)
  return op
}

function campo(schema: string, nome: string): Propriedade {
  const prop = schemas[schema]?.properties?.[nome]
  if (prop === undefined) throw new Error(`${schema}.${nome} não existe no contrato`)
  return prop
}

/** A whitelist que a operação documenta em `sortBy`, extraída dos crases. */
function ordenaveis(caminho: string): string[] {
  const p = operacao(caminho, 'get').parameters?.find((x) => x.name === 'sortBy')
  const descricao = p?.description ?? ''
  const lista = /Whitelist: (.+?)\. Campo fora dela/s.exec(descricao)?.[1] ?? ''
  return [...lista.matchAll(/`([a-zA-Z]+)`/g)].map((m) => m[1] ?? '')
}

describe('um recurso para as duas telas, discriminado por direction', () => {
  it('não existe caminho separado de pagar e de receber', () => {
    // A tentação é `/api/payables` + `/api/receivables`, que é como o legado
    // acabou: `contas_apagar` e `contas_receber` são a MESMA tabela com o
    // prefixo trocado, coluna a coluna, e a correção feita num lado só chegava
    // ao outro por cópia manual. Dois caminhos aqui duplicariam parcela, baixa,
    // lote e conciliação — que não têm uma diferença sequer entre os dois lados.
    const separados = Object.keys(doc.paths).filter((c) => /payable|receivable/i.test(c))
    expect(separados).toEqual([])
  })

  it('`direction` é publicado na leitura, na escrita e como FILTRO da listagem', () => {
    for (const enumerado of [
      campo('FinancialTitleDto', 'direction'),
      campo('FinancialTitleWriteRequest', 'direction'),
    ]) {
      expect(enumerado.enum).toEqual(['payable', 'receivable'])
    }
    const filtro = operacao('/api/financial-titles', 'get').parameters?.find(
      (p) => p.name === 'direction',
    )
    expect(filtro).toBeDefined()
  })

  it('a PARCELA ecoa `direction`, porque a linha do lote precisa dizer sozinha o sentido', () => {
    // A listagem de parcelas é o que a tela de quitação em lote consome, e ali
    // não há cabeçalho de título para consultar: sem o eco, a mesma grade
    // mistura dinheiro que entra e que sai sem marcação nenhuma.
    expect(campo('FinancialInstallmentDto', 'direction').enum).toEqual(['payable', 'receivable'])
  })
})

describe('vencimento é da PARCELA, e a ordenação diz isso', () => {
  it('`dueDate` NÃO ordena a listagem de títulos', () => {
    // A decisão mais fácil de desfazer do módulo, e a que mais engana: um
    // título de cinco parcelas tem cinco vencimentos, e ordenar título por
    // vencimento obrigaria o servidor a escolher um deles em silêncio — a
    // menor, a maior, a próxima. Cada escolha produz uma lista diferente que
    // parece a mesma.
    expect(ordenaveis('/api/financial-titles')).not.toContain('dueDate')
  })

  it('`dueDate` ordena a listagem de PARCELAS, e é o padrão dela', () => {
    expect(ordenaveis('/api/financial-installments')).toContain('dueDate')
    expect(
      operacao('/api/financial-installments', 'get').parameters?.find((p) => p.name === 'sortBy')
        ?.description,
    ).toContain('O padrão é `dueDate`')
  })

  it('`overdue` vem do SERVIDOR, e não é campo de escrita', () => {
    // "Hoje" é o dia do servidor. Calculado no cliente, o relógio errado de uma
    // estação marca vencido o que não está — bem na coluna que decide o que
    // será pago.
    expect(campo('FinancialInstallmentDto', 'overdue').type).toBe('boolean')
    expect(schemas.FinancialInstallmentWriteRequest?.properties?.overdue).toBeUndefined()
  })
})

describe('a baixa aponta a CONTA, não só o meio', () => {
  it('o destino existe nos dois lados da baixa', () => {
    // É o elo que a api#112 registrou como ABERTO: o módulo financeiro grava
    // `payment_mode_id` (dinheiro, PIX, cheque) e saber que foi PIX não diz em
    // qual conta o dinheiro entrou. É a conta que o extrato lê e a conciliação
    // casa.
    for (const schema of ['SettlementWriteRequest', 'FinancialSettlementDto']) {
      expect(campo(schema, 'bankAccountId').format).toBe('uuid')
      expect(campo(schema, 'cashRegisterId').format).toBe('uuid')
    }
  })

  it('o meio de pagamento é OBRIGATÓRIO na escrita da baixa', () => {
    expect(schemas.SettlementWriteRequest?.required).toContain('paymentModeId')
  })

  it('a baixa vira MOVIMENTO de caixa, e o tipo de origem existe para isso', () => {
    // Sem `settlement` no vocabulário de origem, o movimento nascido de uma
    // baixa seria indistinguível de um lançamento manual — e o extrato não
    // saberia dizer qual título pagou aquela linha.
    expect(campo('CashMovementDto', 'sourceType').enum).toContain('settlement')
    expect(operacao('/api/financial-installments/{id}/settlements', 'post').description).toContain(
      'sourceType',
    )
  })

  it('quitação A MENOS é 403 (permissão), e ACIMA do saldo é 409 (engano)', () => {
    // As duas recusas parecem a mesma e não são: a de baixo depende de QUEM
    // pede — é a permissão especial nº 45 do legado —, a de cima não tem
    // alçada que a libere, porque o troco não teria onde ser lançado.
    const descricao = schemas.SettlementWriteRequest?.description ?? ''
    expect(descricao).toContain('403')
    expect(descricao).toContain('409')
    expect(problemType.enum).toContain('urn:cabinet:erro:valor-acima-do-saldo')
  })
})

describe('a quitação em lote é UM ato', () => {
  it('o lote responde um `batchId`, e a baixa o carrega', () => {
    // Sem o agrupador, conferir ou desfazer um pagamento em bloco exigiria
    // casar data, valor e meio — adivinhação assim que dois lotes saem no
    // mesmo dia. É o `LotePagCtRec` do legado.
    expect(schemas.SettlementBatchResultDto?.required).toContain('batchId')
    expect(campo('FinancialSettlementDto', 'batchId').format).toBe('uuid')
  })

  it('o item do lote pode omitir o valor — o padrão é quitar o saldo INTEIRO', () => {
    // Obrigar o cliente a repetir um número que o servidor já sabe faz a tela
    // pagar a mais quando o saldo muda entre a leitura e o envio.
    expect(schemas.SettlementBatchItem?.required).toEqual(['installmentId'])
    expect(campo('SettlementBatchItem', 'amountCents').type).toEqual(['integer', 'null'])
  })

  it('o lote é tudo ou nada, e a resposta de conflito diz isso', () => {
    const conflito = operacao('/api/financial-settlements/batch', 'post').responses?.['409'] as
      | { description?: string }
      | undefined
    expect(conflito?.description).toContain('Nenhuma baixa foi gravada')
  })
})

describe('o que o módulo NÃO tem, e a ausência é decisão', () => {
  it('nenhum caminho de tesouraria publica DELETE', () => {
    // Título que some é dinheiro que o sistema esqueceu de dever; movimento que
    // some é extrato que não concilia. Desistir é `cancel`; corrigir movimento
    // é lançar o contrário.
    const comDelete = CAMINHOS.filter((c) => verbos(c).includes('delete'))
    expect(comDelete).toEqual([])
  })

  it('o movimento não tem PUT — extrato que se reescreve não concilia', () => {
    expect(doc.paths['/api/cash-movements/{id}']).toBeUndefined()
    expect(schemas.CashMovementWriteRequest?.description).toContain('lançamento contrário')
  })

  it('as contas, os caixas e os modos de pagamento são SÓ LEITURA nesta fase', () => {
    // O cadastro é o menu `Tabelas → Financeiro` do legado, trilho próprio —
    // publicar a escrita aqui traria junto banco e agência, que são cadastro
    // nacional. O que o lançamento precisa é escolher a conta, e escolher é ler.
    for (const caminho of ['/api/bank-accounts', '/api/cash-registers', '/api/payment-modes']) {
      expect(verbos(caminho)).toEqual(['get'])
    }
  })
})

describe('as URNs novas existem e são EMITIDAS por alguém', () => {
  const NOVAS = [
    'urn:cabinet:erro:periodo-fechado',
    'urn:cabinet:erro:titulo-com-baixa',
    'urn:cabinet:erro:parcela-ja-quitada',
    'urn:cabinet:erro:valor-acima-do-saldo',
    'urn:cabinet:erro:movimento-ja-conciliado',
  ] as const

  it.each(NOVAS)('%s está no vocabulário fechado e na tabela de títulos', (urn) => {
    expect(problemType.enum).toContain(urn)
    // A tabela do `ProblemType` é onde mora o `title` canônico: URN no enum e
    // fora da tabela deixa o servidor escolher o cabeçalho caso a caso, e o
    // mesmo erro aparece com dois textos.
    expect(problemType.description).toContain(`| \`${urn}\` |`)
  })

  it.each(NOVAS)(
    '%s é citada por alguma operação — URN órfã é vocabulário que ninguém emite',
    (urn) => {
      const texto = JSON.stringify(doc.paths)
      expect(texto).toContain(urn)
    },
  )
})

describe('as quinze operações são de domínio e paginam como o resto do contrato', () => {
  const OPERACOES = CAMINHOS.flatMap((c) => verbos(c).map((verbo) => [c, verbo] as const))

  it('são quinze, na tag `financeiro`', () => {
    expect(OPERACOES).toHaveLength(15)
    for (const [caminho, verbo] of OPERACOES) {
      expect(operacao(caminho, verbo).tags).toEqual(['financeiro'])
    }
  })

  it.each(OPERACOES)('%s %s declara 401 e 403 por $ref', (caminho, verbo) => {
    // Nunca copiando a descrição: 50 cópias da mesma frase divergem uma a uma.
    const respostas = operacao(caminho, verbo).responses as Record<string, { $ref?: string }>
    expect(respostas['401']?.$ref).toBe('#/components/responses/NaoAutenticado')
    expect(respostas['403']?.$ref).toBe('#/components/responses/SemPermissao')
  })

  /** As LISTAGENS — caminho sem parâmetro, cujo GET devolve `{rows, total}`. */
  const LISTAGENS = CAMINHOS.filter((c) => !c.includes('{') && verbos(c).includes('get'))

  it.each(LISTAGENS)('%s publica a paginação inteira', (caminho) => {
    const nomes = (operacao(caminho, 'get').parameters ?? []).map((p) => p.name)
    for (const esperado of ['q', 'sortBy', 'sortDesc', 'page', 'pageSize']) {
      expect(nomes).toContain(esperado)
    }
  })

  it.each(LISTAGENS)('%s devolve lista vazia sem empresa ativa, e não erro', (caminho) => {
    // Semântica inegociável do contrato: a empresa vem da SESSÃO, então "sem
    // empresa" é operador recém-criado, não requisição malformada. Detalhe
    // por id e escrita são 409.
    expect(operacao(caminho, 'get').description).toContain('{rows: [], total: 0}')
  })
})
