import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENTIDADES } from './entidades'
import { camposDe, colunasDe, filtrosDe, semLastro } from './tipos'

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

const CONTRATO = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', '..', '..', '..', 'contracts', 'openapi-v1.json'),
    'utf8',
  ),
) as { components: { schemas: Record<string, { properties?: Record<string, unknown> }> } }

const CAMPOS_DO_PARTNER_DTO = Object.keys(CONTRATO.components.schemas.PartnerDto?.properties ?? {})

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
        .filter((campo) => campo.dto && !CAMPOS_DO_PARTNER_DTO.includes(campo.dto))
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
