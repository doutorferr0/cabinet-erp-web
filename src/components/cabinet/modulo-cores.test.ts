import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLASSE_DA_TINTA, MODULOS_COR, type ModuloCor, TINTA_DA_FAIXA } from './modulo-cores'

/**
 * A MEDIÇÃO DE CONTRASTE DOS PARES QUE A COR DE BLOCO INTRODUZ (issue #99, DoD).
 *
 * O `DESIGN.md` §Medição diz, desde a troca das superfícies, que número colado à
 * mão apodrece — e já publicou três valores errados por isso. Aqui a medição não
 * é um número no doc: é um teste que lê o `src/index.css`, calcula a razão WCAG
 * e reprova. Se alguém trocar o neon de um módulo sem revisitar a tinta da
 * faixa, isto fica vermelho antes de ir para a tela.
 *
 * Duas superfícies novas por módulo:
 * - **corpo na `/02`** — pastel, com a tinta do TEMA (`--foreground`), que
 *   inverte no escuro junto com a `/02`. Ambos os temas medem.
 * - **faixa na `/01` cheia** — neon, e é aqui que mora o caso difícil. O
 *   `.dark [data-modulo=…]` NÃO redefine a `/01`: a faixa é a mesma cor nos dois
 *   temas, então a tinta em cima dela também não pode mudar de tema. É por isso
 *   que `TINTA_DA_FAIXA` existe, e é por isso que ela é escolhida por medição.
 */

const CSS = readFileSync(join(import.meta.dirname, '..', '..', 'index.css'), 'utf8')

/** Piso AA para texto normal. O rótulo da faixa é 12px negrito — "texto grande"
 *  pela WCAG só começa em 18,66px negrito, então o piso aqui é 4,5 e não 3. */
const PISO_AA = 4.5

const PRETO: [number, number, number] = [0, 0, 0]
const BRANCO: [number, number, number] = [0, 0, 1]

/** Blocos de primeiro nível do CSS, na ordem do arquivo. Mesmo parser do
 *  `docs/design/medir-contraste.py`, portado — o teste não roda python. */
function blocos(css: string): [string, string][] {
  const saida: [string, string][] = []
  let i = 0
  for (;;) {
    const abre = css.indexOf('{', i)
    if (abre === -1) return saida
    const linhas = css.slice(i, abre).trim().split('\n')
    const seletor = (linhas.at(-1) ?? '').trim()
    let nivel = 1
    let j = abre + 1
    while (nivel > 0 && j < css.length) {
      if (css[j] === '{') nivel++
      else if (css[j] === '}') nivel--
      j++
    }
    saida.push([seletor, css.slice(abre + 1, j - 1)])
    i = j
  }
}

/** `--nome: H S% L%` → HSL normalizado. Ignora o que não for triplete HSL. */
function tokensDoBloco(corpo: string): Map<string, [number, number, number]> {
  const achados = new Map<string, [number, number, number]>()
  for (const m of corpo.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const valor = (m[2] ?? '').split('/*')[0]?.trim() ?? ''
    const hsl = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(valor)
    if (!hsl) continue
    achados.set(
      m[1] as string,
      [Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100] as [number, number, number],
    )
  }
  return achados
}

function luminancia([h, s, l]: [number, number, number]): number {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const seg = Math.floor(h / 60) % 6
  const rgb = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg] as [number, number, number]
  const canal = (v: number) => {
    const t = v + m
    return t <= 0.04045 ? t / 12.92 : ((t + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = rgb.map(canal) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function razao(a: [number, number, number], b: [number, number, number]): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

/** Tokens por escopo. `.dark [data-modulo=x]` só redefine a `/02`: a `/01` do
 *  bloco claro continua na cascata e é ELA que pinta no escuro — herdar aqui
 *  reproduz o CSS, e não herdar mediria um token que não existe. */
function paleta() {
  const raiz = new Map<string, [number, number, number]>()
  const escura = new Map<string, [number, number, number]>()
  const mod: Record<string, Map<string, [number, number, number]>> = {}
  const modEscuro: Record<string, Map<string, [number, number, number]>> = {}

  for (const [seletor, corpo] of blocos(CSS)) {
    const pares = tokensDoBloco(corpo)
    const alvo = /\[data-modulo="([a-z]+)"\]/.exec(seletor)
    const escuro = seletor.startsWith('.dark') || seletor.includes(' .dark')
    if (alvo) {
      const chave = alvo[1] as string
      const destino = escuro ? modEscuro : mod
      destino[chave] = new Map([...(destino[chave] ?? []), ...pares])
      if (!escuro) modEscuro[chave] = new Map([...(modEscuro[chave] ?? []), ...pares])
    } else if (seletor === ':root') {
      for (const [k, v] of pares) raiz.set(k, v)
    } else if (seletor === '.dark') {
      for (const [k, v] of pares) escura.set(k, v)
    }
  }
  return { raiz, escura, mod, modEscuro }
}

const { raiz, escura, mod, modEscuro } = paleta()

function cor(escopo: Map<string, [number, number, number]>, nome: string) {
  const achado = escopo.get(nome)
  if (!achado) throw new Error(`token --${nome} não existe no escopo medido`)
  return achado
}

describe('cor de bloco — os pares que a issue #99 introduz', () => {
  it('a tabela cobre todos os módulos que o index.css pinta, e só eles', () => {
    expect([...MODULOS_COR].sort()).toEqual(Object.keys(mod).sort())
    expect(Object.keys(TINTA_DA_FAIXA).sort()).toEqual([...MODULOS_COR].sort())
  })

  it.each(MODULOS_COR)('corpo de %s: tinta do tema sobre a /02 passa AA nos dois temas', (cor_) => {
    const claro = razao(cor(raiz, 'foreground'), cor(mod[cor_] as never, 'modulo-02'))
    const escuro = razao(cor(escura, 'foreground'), cor(modEscuro[cor_] as never, 'modulo-02'))
    expect(claro, `corpo ${cor_} claro`).toBeGreaterThanOrEqual(PISO_AA)
    expect(escuro, `corpo ${cor_} escuro`).toBeGreaterThanOrEqual(PISO_AA)
  })

  it.each(MODULOS_COR)('faixa de %s: a tinta escolhida passa AA sobre a cheia /01', (cor_) => {
    const cheia = cor(mod[cor_] as never, 'modulo-01')
    const tinta = TINTA_DA_FAIXA[cor_ as ModuloCor] === 'preta' ? PRETO : BRANCO
    expect(razao(tinta, cheia), `faixa ${cor_}`).toBeGreaterThanOrEqual(PISO_AA)
  })

  it.each(MODULOS_COR)('faixa de %s: a escolha é a MELHOR das duas, não a preferida', (cor_) => {
    // Sem isto, alguém "consertaria" um módulo reprovado trocando a tinta para
    // a que passa por pouco, e a tabela deixaria de ser derivada de medição.
    const cheia = cor(mod[cor_] as never, 'modulo-01')
    const escolhida = TINTA_DA_FAIXA[cor_ as ModuloCor]
    const melhor = razao(PRETO, cheia) >= razao(BRANCO, cheia) ? 'preta' : 'clara'
    expect(escolhida, `faixa ${cor_}`).toBe(melhor)
  })

  it('a faixa NÃO usa a tinta do tema — ela é invariante como a cheia /01', () => {
    // O mecanismo em uma linha: `.dark [data-modulo]` redefine a /02 e não a
    // /01. Se a tinta seguisse o tema, o par do escuro seria claro-sobre-neon —
    // exatamente a pior reprovação do repo (item de menu ativo, 1,33:1).
    for (const c of MODULOS_COR) {
      expect(mod[c]?.has('modulo-01')).toBe(true)
      expect(modEscuro[c]?.get('modulo-01')).toEqual(mod[c]?.get('modulo-01'))
    }
    expect(Object.values(CLASSE_DA_TINTA)).not.toContain('text-foreground')
  })
})
