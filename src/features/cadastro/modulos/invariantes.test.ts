import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENTIDADES } from './entidades'
import {
  camposDe,
  colunasDe,
  filtrosDe,
  indicadoresSemOrigem,
  semConsulta,
  semLastro,
} from './tipos'

/**
 * AS INVARIANTES DO SCHEMA DE MÓDULOS — o ponto da issue #100.
 *
 * Sem elas o schema não vale nada: ele existe para impedir o drift que já
 * aconteceu uma vez (Fornecedor com 13 blocos, Profissional com 3), e uma
 * estrutura declarativa sem guarda é só um lugar novo para divergir.
 *
 * Todas rodam sobre TODAS as entidades — o `it.each` é de propósito: entidade
 * nova nasce coberta, sem ninguém lembrar de acrescentar caso de teste.
 */

interface PropriedadeDoContrato {
  oneOf?: readonly { $ref?: string }[]
}

interface SchemaDoContrato {
  properties?: Record<string, PropriedadeDoContrato | undefined>
}

const CONTRATO = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', '..', '..', '..', 'contracts', 'openapi-v1.json'),
    'utf8',
  ),
) as { components: { schemas: Record<string, SchemaDoContrato> } }

const SCHEMAS = CONTRATO.components.schemas

/**
 * O `dto` existe no contrato? Resolve caminho PONTUADO (`address.city`).
 *
 * Endereço viaja como objeto (`PartnerAddress`), então o nome do campo tem dois
 * níveis — e uma checagem só das chaves de topo diria que `address.city` foi
 * inventado. Segue o `$ref` do próprio contrato em vez de guardar uma lista: o
 * dia em que `city` for renomeado lá, quebra aqui.
 */
function existeNoContrato(dto: string): boolean {
  const partes = dto.split('.')
  const raiz = partes[0] ?? ''
  const aninhado = partes[1]
  const propriedade = SCHEMAS.PartnerDto?.properties?.[raiz]
  if (!propriedade) return false
  if (aninhado === undefined) return true
  const ref = propriedade.oneOf?.find((alternativa) => alternativa.$ref !== undefined)?.$ref
  const nome = ref?.split('/').pop()
  if (nome === undefined) return false
  return SCHEMAS[nome]?.properties?.[aninhado] !== undefined
}

const entidades = Object.entries(ENTIDADES)

describe('invariantes do schema de módulos', () => {
  it.each(entidades)('%s: obrigatório mora em módulo que nunca fecha', (_, entidade) => {
    // A invariante do FormBlock, do outro lado: campo `req` dentro de módulo
    // recolhível esconderia justamente o que impede de gravar.
    const foraDoLugar = entidade.modulos
      .filter((modulo) => !modulo.obrigatorio)
      .flatMap((modulo) =>
        modulo.campos.filter((campo) => campo.req).map((c) => `${modulo.id}.${c.k}`),
      )
    expect(foraDoLugar).toEqual([])
  })

  it.each(entidades)('%s: existe exatamente UM módulo obrigatório', (_, entidade) => {
    // Zero = nada trava o Gravar e o operador descobre o que falta pelo erro do
    // servidor. Dois = "o mínimo para gravar" deixa de ser um lugar só.
    const obrigatorios = entidade.modulos.filter((modulo) => modulo.obrigatorio)
    expect(obrigatorios.map((m) => m.id)).toHaveLength(1)
  })

  it.each(entidades)('%s: nenhum módulo é vazio', (_, entidade) => {
    const vazios = entidade.modulos.filter((modulo) => modulo.campos.length === 0)
    expect(vazios.map((m) => m.id)).toEqual([])
  })

  it.each(entidades)('%s: id de módulo é único', (_, entidade) => {
    const ids = entidade.modulos.map((modulo) => modulo.id)
    expect(ids).toHaveLength(new Set(ids).size)
  })

  it.each(entidades)('%s: chave de campo é única dentro do módulo', (_, entidade) => {
    // Entre módulos a repetição é legítima e acontece — `uf` mora no endereço do
    // cadastro E no da agência. Dentro do módulo ela quebraria a identidade do
    // campo, que é o que a ficha e a grade usam para casar valor com rótulo.
    for (const modulo of entidade.modulos) {
      const chaves = modulo.campos.map((campo) => campo.k)
      expect(chaves, `módulo ${modulo.id}`).toHaveLength(new Set(chaves).size)
    }
  })

  it.each(entidades)('%s: todo módulo entrega ao menos um campo', (_, entidade) => {
    expect(camposDe(entidade).length).toBeGreaterThanOrEqual(entidade.modulos.length)
  })
})

describe('invariantes da consulta — o que a grade pode PEDIR ao servidor', () => {
  it.each(entidades.filter(([, e]) => e.fonte === 'http'))(
    '%s: todo filtro derivado está na whitelist do contrato',
    (_, entidade) => {
      // É a invariante mais dura do arquivo, e a única que evita um 400 em
      // produção: `filters` com campo fora da whitelist é recusado pelo
      // servidor, e o operador veria a tela pedir um recorte que nunca chega.
      const fora = filtrosDe(entidade)
        .filter((campo) => !entidade.whitelist?.includes(campo.dto as string))
        .map((campo) => `${campo.k} → ${campo.dto}`)
      expect(fora).toEqual([])
    },
  )

  it.each(entidades.filter(([, e]) => e.fonte === 'http'))(
    '%s: todo `dto` declarado existe mesmo no PartnerDto',
    (_, entidade) => {
      // Lê o contrato de verdade, não uma cópia. Campo renomeado lá quebra aqui,
      // que é onde deve quebrar — e não na tela, em branco.
      const inventados = camposDe(entidade)
        .filter((campo) => campo.dto && !existeNoContrato(campo.dto))
        .map((campo) => `${campo.k} → ${campo.dto}`)
      expect(inventados).toEqual([])
    },
  )

  it.each(entidades.filter(([, e]) => e.fonte === 'mock'))(
    '%s: recurso mock não declara `dto` — não há contrato para citar',
    (_, entidade) => {
      expect(camposDe(entidade).filter((campo) => campo.dto)).toEqual([])
    },
  )

  it.each(entidades)('%s: a grade tem coluna, e o filtro tem campo', (_, entidade) => {
    // Piso, não teto: listagem sem nenhuma coluna derivável não é listagem.
    expect(colunasDe(entidade).length).toBeGreaterThan(0)
    expect(filtrosDe(entidade).length).toBeGreaterThan(0)
  })
})

/**
 * A DISTÂNCIA MEDIDA entre o cadastro que o user desenhou e o que o repo guarda.
 *
 * Estes números não são meta nem alerta: são o retrato de hoje, travado para que
 * mudá-lo seja um ato deliberado. Quem acrescentar campo ao schema Zod (ou ao
 * contrato) vê o número CAIR aqui e atualiza — quem apagar um campo do schema
 * para "limpar" vê subir, e tem de explicar.
 */
describe('a lacuna entre a espec e o que o repo guarda', () => {
  it('está medida, campo a campo', () => {
    const retrato = Object.fromEntries(
      entidades.map(([id, entidade]) => [id, semLastro(entidade).map((campo) => campo.k)]),
    )
    expect(retrato).toEqual({
      cliente: [
        'civil',
        'profissao',
        'com1tipo',
        'com1valor',
        'com2tipo',
        'com2valor',
        'contrib',
        'regime',
        'origem',
        'tabela',
        'limite',
        'ultima',
      ],
      colaborador: ['login', 'cel', 'perfil', 'comissaoInterna', 'comissaoExterna', 'meta'],
      fornecedor: ['regime', 'cnae', 'custo', 'indice', 'frete', 'minimo'],
      profissional: ['pix', 'pct', 'operador', 'indicados', 'gerado'],
    })
  })

  it('a lacuna de CONSULTA está medida: o contrato publica, a whitelist não alcança', () => {
    // Nasceu com #244: telefone e endereço passaram a existir no `PartnerDto` e
    // continuam fora de `sortBy`/`filters`. Sem este retrato, a diferença entre
    // "o servidor não guarda" e "o servidor guarda e não deixa consultar" ficaria
    // invisível — e é ela que decide se o conserto é uma coluna no banco ou um
    // parâmetro no contrato.
    const retrato = Object.fromEntries(
      entidades.map(([id, entidade]) => [id, semConsulta(entidade).map((campo) => campo.k)]),
    )
    expect(retrato).toEqual({
      // `indicou` e `categoria` entraram com o #250: o contrato passou a
      // publicar o especificador e a categoria do cliente, e nenhum dos dois
      // está na whitelist. O mockup pede coluna e filtro para os dois — é
      // exatamente a distância que este retrato existe para medir.
      cliente: ['cel', 'bairro', 'cidade', 'uf', 'indicou', 'categoria'],
      colaborador: [],
      // `fax` do fornecedor não aparece: publicado, mas não pede coluna nem
      // filtro no mockup — só entra aqui o que promete consulta e não a tem.
      fornecedor: ['tel', 'bairro', 'cidade', 'uf'],
      profissional: ['cel', 'bairro', 'cidade', 'uf'],
    })
  })

  it.each(entidades)('%s: os 4 indicadores do mockup estão declarados', (_, entidade) => {
    // A faixa do topo da ficha existia como prop `kpis` que tela nenhuma
    // passava — desenho aprovado que nenhum grep achava. Declarada no schema,
    // ela vira contável: some daqui e este teste cobra.
    expect(entidade.indicadores ?? []).toHaveLength(4)
  })

  it.each(entidades)('%s: indicador não promete coluna nem filtro', (_, entidade) => {
    // Mesma regra do campo sem lastro, e por um motivo mais forte: indicador
    // nenhum é atributo do registro. Coluna que ordenasse por "Comprado no ano"
    // pediria ao servidor um `sortBy` que não existe na whitelist — 400 no
    // primeiro clique.
    const prometendo = (entidade.indicadores ?? [])
      .filter((ind) => ind.col || ind.fil)
      .map((ind) => ind.k)
    expect(prometendo).toEqual([])
  })

  it('nenhum indicador tem origem hoje — a faixa inteira é lacuna declarada', () => {
    // Quando o contrato publicar o agregado, este teste cai junto com a linha
    // "Ainda não calculamos" — e cair é o sinal de que a faixa ganhou número.
    for (const [id, entidade] of entidades) {
      expect(indicadoresSemOrigem(entidade), id).toHaveLength((entidade.indicadores ?? []).length)
    }
  })

  it('nenhum campo sem lastro atravessa para a grade ou para o filtro', () => {
    // A regra que faz a lacuna ser inofensiva: o que não tem onde ser lido não
    // vira coluna nem filtro. `Limite de crédito` pede coluna no mockup e não a
    // ganha aqui — ganharia uma coluna sempre vazia, que é pior que nenhuma.
    for (const [id, entidade] of entidades) {
      const sem = new Set(semLastro(entidade).map((campo) => campo.k))
      expect(
        colunasDe(entidade)
          .filter((c) => sem.has(c.k))
          .map((c) => c.k),
        id,
      ).toEqual([])
      expect(
        filtrosDe(entidade)
          .filter((c) => sem.has(c.k))
          .map((c) => c.k),
        id,
      ).toEqual([])
    }
  })
})
