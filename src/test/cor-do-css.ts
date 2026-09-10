import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * RESOLVEDOR DE COR DOS TOKENS — o que permite um teste MEDIR a 2.0.
 *
 * Existe porque a fundação 2.0 (#469) trocou a notação: os tokens deixaram de
 * ser triplets `h s% l%` e passaram a ser cor inteira — hex, `var()` encadeado
 * e `color-mix(in oklab, …)`. O parser anterior (`modulo-cores.test.ts`) casava
 * o triplet com uma regex e IGNORAVA o que não casasse; contra a 2.0 ele
 * passaria a não achar token nenhum, e um teste que não acha o que medir passa
 * verde sem medir nada.
 *
 * **É gêmeo de `docs/design/medir-contraste.py`, e a duplicação é deliberada.**
 * O script python é a ferramenta de quem desenha (roda à mão, imprime tabela,
 * mede 40 pares); este módulo é a guarda de quem commita, porque o CI roda
 * `pnpm test` e não roda python. Os dois leem os MESMOS dois arquivos, então
 * não há uma terceira fonte de cor — e é a fonte, não o algoritmo, que
 * envelhece calada.
 *
 * O que ele NÃO faz: `hsl()`, `rgb()`, gradiente, `calc()`. Se um deles voltar
 * a aparecer num token, o resolvedor levanta em vez de devolver preto — cor
 * silenciosamente errada é pior que teste vermelho.
 */

const RAIZ = join(import.meta.dirname, '..')
const DECL = /--([a-z0-9-]+)\s*:\s*([^;]+);/g

/** sRGB gama-codificado, 0..1, mais alfa. */
export type Cor = [number, number, number, number]

function semComentario(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** (seletor, corpo) de cada bloco de primeiro nível, na ordem do arquivo. */
export function blocos(css: string): [string, string][] {
  const saida: [string, string][] = []
  let i = 0
  for (;;) {
    const abre = css.indexOf('{', i)
    if (abre === -1) return saida
    const seletor = css.slice(i, abre).trim()
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

export interface Paleta {
  /** Tokens do tema claro, `tokens-2.0.css` e `index.css` somados. */
  claro: Map<string, string>
  /** O claro com o que `.dark` redefine por cima — a cascata do browser. */
  escuro: Map<string, string>
  /** Por módulo: o corpo de `[data-modulo="x"]`. */
  modulo: Map<string, Map<string, string>>
}

export function paleta(): Paleta {
  const claro = new Map<string, string>()
  const delta = new Map<string, string>()
  const modulo = new Map<string, Map<string, string>>()

  for (const nome of ['styles/tokens-2.0.css', 'index.css']) {
    const css = semComentario(readFileSync(join(RAIZ, nome), 'utf8'))
    for (const [seletor, corpo] of blocos(css)) {
      const pares = [...corpo.matchAll(DECL)].map(
        ([, k, v]) => [k as string, (v as string).trim()] as const,
      )
      if (pares.length === 0) continue
      const alvo = /\[data-modulo="([a-z]+)"\]/.exec(seletor)
      // O seletor de um bloco é tudo que vem depois do `}` anterior, e no
      // primeiro bloco de `index.css` isso inclui os `@import` e o
      // `@custom-variant` — casar o começo dessa fatia com `:root` daria falso
      // NEGATIVO, e o teste passaria medindo um mapa vazio. Cortar no último
      // `;` deixa só o seletor de verdade.
      const plano = (seletor.split(';').at(-1) ?? '').replace(/\s+/g, ' ').trim()
      if (alvo) {
        const chave = alvo[1] as string
        const destino = modulo.get(chave) ?? new Map<string, string>()
        for (const [k, v] of pares) destino.set(k, v)
        modulo.set(chave, destino)
      } else if (plano.startsWith(':root')) {
        for (const [k, v] of pares) claro.set(k, v)
      } else if (plano.startsWith('.dark')) {
        for (const [k, v] of pares) delta.set(k, v)
      }
    }
  }
  return { claro, escuro: new Map([...claro, ...delta]), modulo }
}

// ------------------------------------------------------------------ cor

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const VAR = /^var\(\s*(--[a-z0-9-]+)\s*\)$/
const MIX = /^color-mix\(\s*in\s+(\w+)\s*,\s*(.+)\s*\)$/

/** Separa por vírgula de TOPO — `color-mix` aninhado não conta. */
function fatias(texto: string): string[] {
  const saida: string[] = []
  let nivel = 0
  let atual = ''
  for (const c of texto) {
    if (c === '(') nivel++
    else if (c === ')') nivel--
    if (c === ',' && nivel === 0) {
      saida.push(atual.trim())
      atual = ''
    } else atual += c
  }
  saida.push(atual.trim())
  return saida
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const gama = (c: number) => {
  const v = Math.min(1, Math.max(0, c))
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}

function paraOklab([r, g, b]: number[]): [number, number, number] {
  const [R, G, B] = [linear(r as number), linear(g as number), linear(b as number)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function deOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    gama(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gama(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gama(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function misturar(a: Cor, pa: number, b: Cor, pb: number, espaco: string): Cor {
  const total = pa + pb || 1
  const [wa0, wb0] = [pa / total, pb / total]
  const alfa = a[3] * wa0 + b[3] * wb0
  if (alfa === 0) return [0, 0, 0, 0]
  const [wa, wb] = [(a[3] * wa0) / alfa, (b[3] * wb0) / alfa]
  if (espaco === 'oklab') {
    const [la, lb] = [paraOklab(a.slice(0, 3)), paraOklab(b.slice(0, 3))]
    const misto = la.map((v, i) => v * wa + (lb[i] as number) * wb) as [number, number, number]
    return [...deOklab(misto), alfa]
  }
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, alfa]
}

/** Um valor de token → sRGB + alfa. Levanta se a notação não for reconhecida. */
export function resolver(valor: string, mapa: Map<string, string>, nivel = 0): Cor {
  const v = valor.split('/*')[0]?.trim() ?? ''
  if (nivel > 12) throw new Error(`var() circular em ${valor}`)
  if (v === 'transparent') return [0, 0, 0, 0]

  const alias = VAR.exec(v)
  if (alias) {
    const nome = (alias[1] as string).slice(2)
    const alvo = mapa.get(nome)
    if (alvo === undefined) throw new Error(`token --${nome} não existe`)
    return resolver(alvo, mapa, nivel + 1)
  }

  const hex = HEX.exec(v)
  if (hex) {
    let h = hex[1] as string
    if (h.length === 3)
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    return [
      Number.parseInt(h.slice(0, 2), 16) / 255,
      Number.parseInt(h.slice(2, 4), 16) / 255,
      Number.parseInt(h.slice(4, 6), 16) / 255,
      1,
    ]
  }

  const mix = MIX.exec(v)
  if (mix) {
    const partes = fatias(mix[2] as string)
    if (partes.length !== 2) throw new Error(`color-mix com ${partes.length} cores: ${v}`)
    const cores: Cor[] = []
    const pesos: (number | null)[] = []
    for (const parte of partes) {
      const corte = parte.lastIndexOf(' ')
      const fim = parte.slice(corte + 1)
      if (corte > 0 && fim.endsWith('%')) {
        cores.push(resolver(parte.slice(0, corte), mapa, nivel + 1))
        pesos.push(Number(fim.slice(0, -1)) / 100)
      } else {
        cores.push(resolver(parte, mapa, nivel + 1))
        pesos.push(null)
      }
    }
    const pa = pesos[0] ?? 1 - (pesos[1] ?? 0)
    const pb = pesos[1] ?? 1 - pa
    return misturar(cores[0] as Cor, pa, cores[1] as Cor, pb, mix[1] as string)
  }

  throw new Error(`valor de cor não reconhecido: ${v}`)
}

/** Compõe em sRGB, que é onde o browser pinta. */
export function sobre(frente: Cor, fundo: Cor): Cor {
  if (frente[3] >= 1) return frente
  const a = frente[3]
  return [
    frente[0] * a + fundo[0] * (1 - a),
    frente[1] * a + fundo[1] * (1 - a),
    frente[2] * a + fundo[2] * (1 - a),
    1,
  ]
}

export function luminancia(cor: Cor): number {
  const [r, g, b] = [linear(cor[0]), linear(cor[1]), linear(cor[2])]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão WCAG entre duas cores OPACAS. Componha antes se houver alfa. */
export function razao(a: Cor, b: Cor): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

/**
 * Razão de `tinta` sobre `fundo`, no escopo dado — o gesto que todo caso quer.
 * `escopo` cai de volta no `mapa` para o que ele não redefinir, que é a cascata
 * do `[data-modulo]`.
 */
export function contraste(
  mapa: Map<string, string>,
  tinta: string,
  fundo: string,
  escopo?: Map<string, string>,
): number {
  const completo = escopo ? new Map([...mapa, ...escopo]) : mapa
  const atras = resolver(`var(--${fundo})`, completo)
  return razao(sobre(resolver(`var(--${tinta})`, completo), atras), atras)
}
