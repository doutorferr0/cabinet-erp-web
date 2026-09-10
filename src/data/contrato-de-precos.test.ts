import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A METADE VENDA DO G9 — vigência e reajuste em massa (api#114).
 *
 * A #335 publicou a metade COMPRA (`/api/cost-profiles`) e a #338, os dois
 * fatores que faltavam para o preço de venda sair: o ÍNDICE por fornecedor e a
 * TABELA por variante. As duas deixaram o preço como COLUNA — a tabela nova
 * substituía a velha, e a venda de ontem perdia a explicação.
 *
 * O que este arquivo guarda não é "o caminho existe" — o codegen quebraria sem
 * ele. É a FORMA e o PORQUÊ de seis decisões que se desfazem sem ninguém ver,
 * porque desfazê-las deixa o contrato válido e a suíte verde:
 *
 * 1. **preço é HISTÓRICO**: a chave da linha inclui `effectiveFrom`;
 * 2. **a escala do índice é ×10.000** — `25600` = 2,5600, e não a de
 *    `discountPercent`, que é 4 casas sobre 100%;
 * 3. **a vigência ancora na TABELA, e não no índice** (decisão do user,
 *    26/08/2026) — e a costura que isso deixa está declarada, não escondida;
 * 4. **o reajuste é ou percentual OU lista**, nunca os dois;
 * 5. **`adjustmentId` é o que deixa a tela dizer de onde o preço veio**;
 * 6. **nada de DELETE**, em caminho nenhum do módulo — o que desfaz um reajuste
 *    é outro reajuste.
 *
 * O `cabinet-erp-api` lê o contrato, não este repositório: parágrafo apagado
 * aqui é decisão perdida lá.
 */

interface Propriedade {
  type?: string | string[]
  format?: string
  items?: { $ref?: string }
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
const problemType = schemas.ProblemType as unknown as { enum: string[]; description: string }

function operacao(caminho: string, verbo: string): Operacao {
  const op = doc.paths[caminho]?.[verbo]
  if (op === undefined) throw new Error(`${verbo.toUpperCase()} ${caminho} não existe no contrato`)
  return op
}

function propriedade(schema: string, campo: string): Propriedade {
  const p = schemas[schema]?.properties?.[campo]
  if (p === undefined) throw new Error(`${schema}.${campo} não existe no contrato`)
  return p
}

describe('1. preço é histórico, não coluna', () => {
  /**
   * O legado dizia isto de dois jeitos, e os dois foram medidos:
   * `Preco_Produto_Log` tem 3,1 milhões de linhas, e a tela de produto mostra
   * uma `Dt de Vigência` colada à grade de Fornecedor. Sem `effectiveFrom` na
   * CHAVE, a tabela nova sobrescreve a velha e some o porquê da venda passada.
   */
  it('a linha de tabela carrega a vigência, e ela é OBRIGATÓRIA', () => {
    expect(schemas.VariantTablePriceDto?.required).toEqual([
      'supplierId',
      'effectiveFrom',
      'tablePriceCents',
    ])
    expect(propriedade('VariantTablePriceDto', 'effectiveFrom')).toMatchObject({
      type: 'string',
      format: 'date',
    })
  })

  /**
   * Uma data por linha, não duas. Com `validFrom`+`validTo`, abrir vigência
   * são DUAS escritas — fechar a anterior e abrir a nova — e a que falhasse
   * deixaria buraco (dia sem preço) ou sobreposição (dois preços no mesmo dia,
   * com o vencedor decidido pela ordem da consulta).
   */
  it('não há `validTo` — a vigência seguinte é que fecha a anterior', () => {
    const props = schemas.VariantTablePriceDto?.properties ?? {}
    expect(Object.keys(props)).not.toContain('validTo')
    expect(propriedade('VariantTablePriceDto', 'effectiveFrom').description).toContain('validTo')
  })

  /**
   * O `PUT` deixou de ser "substitui a lista" e passou a ser "abre vigência".
   * A palavra importa: um servidor que leia a descrição velha apaga o histórico
   * a cada tabela nova, e o contrato continuaria válido.
   */
  it('o PUT de tabelas ABRE vigência em vez de apagar o passado', () => {
    const put = operacao('/api/table-prices/{variantId}', 'put')
    expect(put.description).toContain('Abre uma vigência')
    expect(put.description).toContain('não substitui o histórico')
    expect(propriedade('VariantTablePricesWriteRequest', 'effectiveFrom').type).toEqual([
      'string',
      'null',
    ])
  })

  /**
   * Ler o passado é uma pergunta diferente de ler o histórico, e as duas juntas
   * não têm resposta única — daí o 400 declarado em vez da escolha silenciosa.
   */
  it('a leitura publica `at` e `history`, e recusa os dois juntos', () => {
    const get = operacao('/api/table-prices/{variantId}', 'get')
    const nomes = (get.parameters ?? []).map((p) => p.name)
    expect(nomes).toContain('at')
    expect(nomes).toContain('history')
    const at = (get.parameters ?? []).find((p) => p.name === 'at')
    expect(at?.description).toContain('400')
  })
})

describe('2. a escala do índice é a do multiplicador, não a do percentual', () => {
  /**
   * DECISÃO DO USER (24/08, confirmada em 26/08): inteiro escalado por 10.000
   * sobre 1 — `25600` = 2,5600. É a mediana medida das 376 linhas de
   * `Indice_preco`. Trocar para `numeric` ou para a escala de `discountPercent`
   * (4 casas sobre 100%) muda o preço de venda por um fator 100 sem que nada
   * fique inválido.
   */
  it('`indexValue` é inteiro, e a descrição diz a escala com o exemplo', () => {
    const v = propriedade('PriceIndexDto', 'indexValue')
    expect(v.type).toBe('integer')
    expect(v.description).toContain('25600')
    expect(v.description).toContain('2,5600')
  })

  /** `10000` (1,0000) é válido de propósito: são 16 assim no legado, 11 de
   * fornecedores reais, e querem dizer vender pelo líquido de compra. */
  it('índice 1,0000 continua declarado como válido', () => {
    expect(propriedade('PriceIndexDto', 'indexValue').description).toContain('10000')
  })
})

describe('3. a vigência ancora na TABELA, e a costura é declarada', () => {
  /**
   * DECISÃO DO USER (26/08): só a tabela é versionada. O lastro é medido — a
   * `Dt de Vigência` da tela fica colada à grade de Fornecedor, e
   * `indice_preco.csv` não tem coluna de data: o legado nunca versionou índice.
   */
  it('o índice NÃO é versionado', () => {
    const props = schemas.PriceIndexDto?.properties ?? {}
    expect(Object.keys(props)).not.toContain('effectiveFrom')
  })

  /**
   * A consequência: `at=<dia>` reconstitui a TABELA daquele dia, não o preço de
   * venda daquele dia. Contrato que esconde isso convida a multiplicar tabela de
   * ontem por índice de hoje e chamar o resultado de "preço em D".
   */
  it('e o contrato DIZ que `at` não reconstitui preço de venda', () => {
    const d = propriedade('VariantTablePriceDto', 'effectiveFrom').description ?? ''
    expect(d).toContain('não é versionado')
    expect(d).toContain('misturando duas datas')
  })
})

describe('4. o reajuste em massa', () => {
  it('publica listagem e criação, e nada mais', () => {
    expect(Object.keys(doc.paths['/api/price-adjustments'] ?? {}).sort()).toEqual(['get', 'post'])
    expect(operacao('/api/price-adjustments', 'get').operationId).toBe('ListPriceAdjustments')
    expect(operacao('/api/price-adjustments', 'post').operationId).toBe('CreatePriceAdjustment')
  })

  /**
   * Os dois jeitos reais de a tabela nova chegar — "subiu 12% em tudo" e a
   * planilha por peça. Aceitar os dois na mesma requisição obrigaria a escolher
   * um vencedor em silêncio, e o erro apareceria como preço errado em centenas
   * de peças.
   */
  it('é OU percentual OU lista, e os dois juntos é 400', () => {
    const corpo = schemas.PriceAdjustmentWriteRequest
    expect(corpo?.required).toEqual(['supplierId', 'effectiveFrom'])
    expect(corpo?.description).toContain('exatamente um dos dois')
    expect(propriedade('PriceAdjustmentWriteRequest', 'percent').type).toEqual(['integer', 'null'])
    expect(propriedade('PriceAdjustmentWriteRequest', 'prices').items?.$ref).toBe(
      '#/components/schemas/PriceAdjustmentLineWriteRequest',
    )
  })

  /**
   * A vigência é obrigatória AQUI e opcional no `PUT` de uma variante. Não é
   * descuido: lá alguém digita um número olhando uma peça, e "hoje" é a leitura
   * honesta do gesto; aqui o gesto move centenas de preços, e a data é a decisão
   * inteira.
   */
  it('a vigência do reajuste é obrigatória e sem padrão', () => {
    expect(propriedade('PriceAdjustmentWriteRequest', 'effectiveFrom')).toMatchObject({
      type: 'string',
      format: 'date',
    })
  })

  /** `percent` sem nenhuma tabela vigente na data não tem o que multiplicar, e
   * responder 201 com zero linhas devolveria SUCESSO a quem não reajustou nada. */
  it('a recusa tem URN própria no vocabulário fechado', () => {
    expect(problemType.enum).toContain('urn:cabinet:erro:reajuste-sem-base')
    expect(problemType.description).toContain('`Reajuste sem base`')
    expect(operacao('/api/price-adjustments', 'post').responses).toHaveProperty('409')
  })

  /** Sem ele, 200 preços que mudaram no mesmo dia são 200 fatos soltos. */
  it('a linha aponta para o reajuste que a criou', () => {
    const a = propriedade('VariantTablePriceDto', 'adjustmentId')
    expect(a.type).toEqual(['string', 'null'])
    expect(a.format).toBe('uuid')
    expect(a.description).toContain('PriceAdjustmentDto.id')
  })

  /** O que desfaz um reajuste é outro reajuste: apagar a vigência criada faria
   * sumir a explicação dos preços que valeram entre a aplicação e o
   * arrependimento — que é o que o histórico existe para guardar. */
  it('não há DELETE em caminho nenhum do módulo', () => {
    const modulo = Object.entries(doc.paths).filter(
      ([caminho]) =>
        caminho.startsWith('/api/price-') ||
        caminho.startsWith('/api/table-prices') ||
        caminho.startsWith('/api/cost-profiles'),
    )
    expect(modulo.length).toBeGreaterThan(0)
    expect(modulo.filter(([, ops]) => 'delete' in ops).map(([c]) => c)).toEqual([])
  })
})
