import { contraste, paleta, razao, resolver, sobre } from '@/test/cor-do-css'
import { describe, expect, it } from 'vitest'
import { MODULOS_COR } from './modulo-cores'

/**
 * A MEDIÇÃO DE CONTRASTE DA COR DE MÓDULO (issue #99, reescrita em #469).
 *
 * O `DESIGN.md` diz, desde a troca das superfícies, que número colado à mão
 * apodrece — e já publicou três valores errados por isso. Aqui a medição não é
 * um número no doc: é um teste que lê `src/styles/tokens-2.0.css` e
 * `src/index.css`, calcula a razão WCAG e reprova.
 *
 * **O QUE MUDOU NA 2.0, e é mudança de EMPREGO antes de ser de cor.** Na 1.x a
 * cheia `/01` era um neon usado como FUNDO DE LEITURA (faixa de cabeçalho de
 * bloco, item de menu ativo), e daí a tabela `TINTA_DA_FAIXA`: texto sobre neon
 * era o pior par do repo — 1,33:1 no escuro, oito dos nove módulos reprovando.
 * A auditoria §3 corta isso: **`--modulo-01` só pinta o quadradinho do grupo, o
 * monograma e o traço, nunca uma faixa cheia**, e quem vira superfície é a
 * `/02`, agora um TINT (12% do matiz sobre a folha).
 *
 * Os casos abaixo seguem esse corte. A `/01` é medida como elemento GRÁFICO
 * (piso 3:1, WCAG 1.4.11) porque é isso que ela passou a ser; a `/02` continua
 * medida como superfície de leitura (4,5:1), agora nos dois temas de graça —
 * o tint pousa sobre `--folha`, que vira com o tema.
 *
 * A tabela paralela do escuro (`.dark [data-modulo=…]`) SUMIU, e o último caso
 * guarda que ela não volte: era ela que precisava ser mantida à mão em espelho
 * com a clara, e era ela que já tinha divergido.
 */

const { claro, escuro, modulo } = paleta()

/** Piso AA para texto normal; o rótulo dentro de um bloco é 13px. */
const PISO_TEXTO = 4.5
/** WCAG 1.4.11 para elemento não-textual que carrega informação. */
const PISO_GRAFICO = 3

describe('cor de módulo — os pares que o `[data-modulo]` introduz', () => {
  it('a tabela cobre todos os módulos que o index.css pinta, e só eles', () => {
    expect([...MODULOS_COR].sort()).toEqual([...modulo.keys()].sort())
  })

  it('nenhum módulo inventa cor: os dois lados vêm de `--mod-*` e `--tint-*`', () => {
    // O boletim é a exceção declarada — é o único módulo que não é operação, e
    // um nono matiz existiria só para ele.
    for (const [nome, tokens] of modulo) {
      const esperado = nome === 'boletim' ? /^var\(--n-\d+\)$/ : /^var\(--(mod|tint)-[a-z]+\)$/
      expect(tokens.get('modulo-01'), `${nome} /01`).toMatch(esperado)
      expect(tokens.get('modulo-02'), `${nome} /02`).toMatch(esperado)
    }
  })

  it.each(MODULOS_COR)('corpo de %s: tinta do tema sobre a /02 passa AA nos dois temas', (nome) => {
    const escopo = modulo.get(nome)
    expect(escopo, `módulo ${nome} não existe no CSS`).toBeDefined()
    expect(contraste(claro, 'foreground', 'modulo-02', escopo), 'claro').toBeGreaterThanOrEqual(
      PISO_TEXTO,
    )
    expect(contraste(escuro, 'foreground', 'modulo-02', escopo), 'escuro').toBeGreaterThanOrEqual(
      PISO_TEXTO,
    )
  })

  it.each(MODULOS_COR)('marca de %s: a cheia /01 se vê sobre a folha nos dois temas', (nome) => {
    // O quadradinho do grupo e o monograma são elementos gráficos: o piso é
    // 3:1, e ele vale nos dois temas porque `--mod-*` desce de degrau no escuro
    // (600 → 400) junto com a semântica.
    const escopo = modulo.get(nome)
    expect(contraste(claro, 'modulo-01', 'card', escopo), 'claro').toBeGreaterThanOrEqual(
      PISO_GRAFICO,
    )
    expect(contraste(escuro, 'modulo-01', 'card', escopo), 'escuro').toBeGreaterThanOrEqual(
      PISO_GRAFICO,
    )
  })

  it.each(MODULOS_COR)('a /02 de %s é superfície, não tinta: ela se distingue da folha', (nome) => {
    // Tint que empata com a folha não separa região nenhuma (§Separação,
    // ferramenta 3) — e é o defeito silencioso de uma paleta de tints: o
    // sistema continua compilando e a região deixa de existir.
    const escopo = modulo.get(nome)
    for (const [tema, mapa] of [
      ['claro', claro],
      ['escuro', escuro],
    ] as const) {
      const completo = new Map([...mapa, ...(escopo ?? [])])
      const tint = resolver('var(--modulo-02)', completo)
      const folha = resolver('var(--card)', completo)
      expect(razao(sobre(tint, folha), folha), `${nome} ${tema}`).toBeGreaterThan(1.02)
    }
  })

  it('o escuro não tem tabela própria — ele CAI da escala', () => {
    // Na 1.x havia um `.dark [data-modulo="x"]` por módulo, redefinindo a /02 à
    // mão. Nove blocos mantidos em espelho com os nove claros; foi lá que a
    // medição anotada no CSS envelheceu sem ninguém a invalidar. Na 2.0 a /02 é
    // um tint sobre `--folha` e a /01 desce de degrau em `tokens-2.0.css`: o
    // escuro cai sozinho, e ressuscitar a tabela é reabrir a divergência.
    const css = [...modulo.values()]
    expect(css).toHaveLength(MODULOS_COR.length)
    for (const [nome, tokens] of modulo) {
      expect([...tokens.keys()].sort(), `${nome} declara só o par`).toEqual([
        'modulo-01',
        'modulo-02',
      ])
    }
  })
})
