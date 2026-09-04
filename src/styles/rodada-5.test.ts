import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Cor, blocos, contraste, paleta, resolver } from '@/test/cor-do-css'
import { describe, expect, it } from 'vitest'

/**
 * GUARDA DA RODADA 5 (#527) — OKLCH com fallback, bancada tonal, movimento.
 *
 * O que ela protege, e por que cada item é invisível sem teste:
 *
 * - **A paleta passou a existir DUAS vezes** — hex no `:root` e `oklch()`
 *   dentro de um `@supports`. Um degrau corrigido só de um lado publica cores
 *   diferentes conforme o navegador, e não quebra nada: a tela abre igual, com
 *   a cor errada.
 * - **A bancada tonal é escrita por seletor de atributo**, e seletor que não
 *   casa com nada passa verde para sempre. `[data-modulo="hoje"]` seria um
 *   desses: o shell emite `boletim`. Por isso o teste cruza com `modulo.ts`,
 *   que é quem produz os valores.
 * - **A folha não se move.** Tingir a bancada é a regra da rodada; tingir a
 *   folha seria tingir o dado.
 *
 * Os pares canônicos de contraste continuam em `identidade-visual.test.ts` e em
 * `docs/design/medir-contraste.py` — este arquivo mede só o que a Rodada 5
 * acrescentou: a tinta sobre cada bancada tonal.
 */

const RAIZ = join(import.meta.dirname, '..')
const CSS = readFileSync(join(RAIZ, 'styles/tokens-2.0.css'), 'utf8')
const MODULO_TS = readFileSync(join(RAIZ, 'app/modulo.ts'), 'utf8')
const DECL = /--([a-z0-9-]+)\s*:\s*([^;]+);/g
const OKLCH = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/

/**
 * OKLCH → OKLab. O resolvedor compartilhado (`cor-do-css.ts`) recusa `oklch()`
 * de propósito — ele levanta em vez de devolver preto —, e ensiná-lo a
 * entender a notação é zona de quem o escreveu. Aqui basta o espaço
 * perceptual: a comparação é entre DUAS notações da mesma cor, não medição de
 * contraste, e para isso a viagem até sRGB é desvio.
 */
function oklabDoOklch(valor: string): [number, number, number] | null {
  const m = OKLCH.exec(valor.trim())
  if (!m) return null
  const L = Number(m[1]) / (m[2] ? 100 : 1)
  const [C, H] = [Number(m[3]), Number(m[4])]
  const rad = (H * Math.PI) / 180
  return [L, C * Math.cos(rad), C * Math.sin(rad)]
}

/** sRGB → OKLab, a volta do mesmo caminho, para comparar com o hex. */
function oklabDaCor([r, g, b]: Cor): [number, number, number] {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function distancia(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** As declarações de dentro do `@supports`, separadas por tema. */
function emOklch(): { claro: Map<string, string>; escuro: Map<string, string> } {
  const saida = { claro: new Map<string, string>(), escuro: new Map<string, string>() }
  for (const [seletor, corpo] of blocos(CSS)) {
    if (!seletor.includes('@supports')) continue
    for (const [interno, dentro] of blocos(corpo)) {
      const chave = (interno.split(';').at(-1) ?? '').trim()
      const destino = chave.startsWith(':root') ? saida.claro : saida.escuro
      for (const [, k, v] of dentro.matchAll(DECL)) {
        destino.set(k as string, (v as string).split('/*')[0]?.trim() ?? '')
      }
    }
  }
  return saida
}

describe('a paleta em OKLCH', () => {
  const { claro, escuro } = paleta()
  const oklch = emOklch()

  it('declara os 57 tokens da rampa e dos neutros', () => {
    // 48 = 8 matizes × 6 degraus; 9 = a escala de neutros.
    expect(oklch.claro.size).toBe(57)
    expect(oklch.escuro.size).toBe(9)
  })

  it('todo token em oklch tem hex de fallback declarado', () => {
    for (const nome of oklch.claro.keys()) {
      expect(claro.has(nome), `--${nome} sem fallback hex`).toBe(true)
    }
    for (const nome of oklch.escuro.keys()) {
      expect(escuro.has(nome), `--${nome} (escuro) sem fallback hex`).toBe(true)
    }
  })

  it('as duas metades publicam a mesma cor', () => {
    // 0,06 em OKLab separa "a mesma cor, arredondada" de "outro degrau": os
    // degraus vizinhos de uma rampa estão a 0,10 ou mais, e o pior par de hoje
    // (`--violet-200`) está a 0,053.
    for (const [tema, pares, mapa] of [
      ['claro', oklch.claro, claro],
      ['escuro', oklch.escuro, escuro],
    ] as const) {
      for (const [nome, valor] of pares) {
        const emLab = oklabDoOklch(valor)
        expect(emLab, `--${nome} não é oklch(): ${valor}`).not.toBeNull()
        const hex = mapa.get(nome) ?? ''
        const d = distancia(emLab as [number, number, number], oklabDaCor(resolver(hex, mapa)))
        expect(d, `--${nome} (${tema}): ${valor} × ${hex}`).toBeLessThan(0.06)
      }
    }
  })

  it('o escuro redefine os neutros DENTRO do @supports', () => {
    // Sem estas nove linhas o `:root` do `@supports` — que vem depois no
    // arquivo e tem a mesma especificidade — venceria o `.dark` de cima, e o
    // tema escuro voltaria ao papel claro em todo navegador com `oklch()`.
    for (const nome of [
      'n-0',
      'n-50',
      'n-100',
      'n-200',
      'n-300',
      'n-400',
      'n-500',
      'n-700',
      'n-900',
    ]) {
      expect(oklch.escuro.has(nome), `--${nome} sem contraparte escura em oklch`).toBe(true)
    }
  })
})

describe('bancada tonal por módulo', () => {
  const { claro, escuro, modulo } = paleta()

  /** Os valores que `moduloDaRota` devolve — a lista que o CSS tem de cobrir. */
  const doShell = [...(MODULO_TS.match(/^\s*\|\s*'([a-z]+)'$/gm) ?? [])].map((linha) =>
    linha.replace(/[^a-z]/g, ''),
  )

  it('todo módulo que o shell emite tem bancada própria', () => {
    expect(doShell.length).toBeGreaterThan(0)
    for (const chave of doShell) {
      const tokens = modulo.get(chave)
      expect(tokens?.get('bancada'), `[data-modulo="${chave}"] sem --bancada`).toMatch(/color-mix/)
      // O alias 1.x anda junto: quem a utility `bg-paper-grid` lê é
      // `--background`. Sem ele a bancada tonal não pinta nada.
      expect(tokens?.get('background'), `[data-modulo="${chave}"] sem --background`).toBe(
        'var(--bancada)',
      )
    }
  })

  it('a folha continua neutra em todo módulo', () => {
    for (const [chave, tokens] of modulo) {
      for (const nome of ['folha', 'folha-2', 'n-0', 'n-50', 'card']) {
        expect(tokens.has(nome), `[data-modulo="${chave}"] mexe em --${nome}`).toBe(false)
      }
    }
  })

  it('a tinta continua legível sobre a bancada tingida, nos dois temas', () => {
    for (const [chave, tokens] of modulo) {
      const bancada = tokens.get('bancada')
      if (bancada === undefined) continue
      for (const [tema, mapa] of [
        ['claro', claro],
        ['escuro', escuro],
      ] as const) {
        const razao = contraste(mapa, 'n-900', 'bancada', tokens)
        expect(razao, `tinta sobre a bancada de ${chave} (${tema})`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('movimento', () => {
  it('publica duração, curva e mola como token', () => {
    const { claro } = paleta()
    for (const nome of ['dur-1', 'dur-2', 'dur-3', 'ease', 'ease-out', 'spring']) {
      expect(claro.has(nome), `--${nome} ausente`).toBe(true)
    }
    expect(claro.get('spring')).toMatch(/^linear\(/)
  })

  it('a saída da troca de rota é mais rápida que a entrada', () => {
    // A regra do movimento de artesão, escrita como número: quem sai já foi
    // decidido pelo operador; quem entra precisa ser lido.
    const saida = /::view-transition-old\(root\)\s*{[^}]*?(\d+)ms/.exec(CSS)
    const entrada = /::view-transition-new\(root\)\s*{[^}]*?(\d+)ms/.exec(CSS)
    expect(Number(saida?.[1])).toBe(90)
    expect(Number(entrada?.[1])).toBe(160)
    expect(Number(saida?.[1])).toBeLessThan(Number(entrada?.[1]))
  })

  it('os seis keyframes cab-* existem', () => {
    for (const nome of ['rise', 'draw', 'fill', 'pulse', 'fade', 'pop']) {
      expect(CSS).toContain(`@keyframes cab-${nome}`)
    }
  })

  it('o grão desliga com prefers-reduced-transparency', () => {
    expect(CSS).toMatch(/@media \(prefers-reduced-transparency: reduce\)/)
  })
})
