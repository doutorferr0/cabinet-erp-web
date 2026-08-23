import { readFileSync, readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * GUARDA DA PORTA ÚNICA — e o que ela protege é uma ORDEM, não um estilo.
 *
 * O `@schedule-x/calendar` usa o global `Temporal` sem importá-lo (#230). Quem
 * carrega o polyfill é `features/agenda/schedule-x.ts`, ACIMA da lib e na mesma
 * unidade. Uma tela que importe `@schedule-x/*` direto do pacote volta a
 * depender de o ordenador de imports deixar o polyfill em cima — e o Biome
 * ordena por especificador, onde `@schedule-x/…` vem ANTES de `temporal-…`.
 *
 * A falha desse caso é do tipo que passa no CI: hoje o Temporal só é tocado no
 * mount, então um import direto continuaria verde até a lib passar a usá-lo na
 * avaliação do módulo — aí quebra em produção, não aqui. Por isso a guarda é
 * sobre o TEXTO do import, e não sobre o comportamento.
 *
 * O segundo caso é o motivo de a #227 ter mexido nisso: com o polyfill no
 * `src/main.tsx` ele entrava no chunk de ENTRADA e era pago em toda página,
 * inclusive na de login — 20.125 B gzip, 68% do que as três libs de planning
 * custavam no primeiro carregamento. Devolvê-lo ao `main.tsx` não quebra tela
 * nenhuma; só desfaz a economia em silêncio.
 */

const RAIZ = join(process.cwd(), 'src') + sep
const PORTA = 'features/agenda/schedule-x.ts'
const DONO_DO_POLYFILL = 'features/agenda/temporal.ts'

function arquivosDeFonte(dir: string): string[] {
  const achados: string[] = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      if (entrada.name === 'gerado') continue
      achados.push(...arquivosDeFonte(caminho))
      continue
    }
    if (/\.(ts|tsx)$/.test(entrada.name)) achados.push(caminho)
  }
  return achados
}

/** Comentário citando `Temporal.X` não é uso — só o código conta. */
function semComentarios(arquivo: string): string {
  return readFileSync(join(RAIZ, arquivo), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

function importadores(agulha: RegExp): string[] {
  return arquivosDeFonte(RAIZ)
    .filter((caminho) => {
      const texto = readFileSync(caminho, 'utf8')
      return texto
        .split('\n')
        .some((linha) => /^\s*(import|export)\b/.test(linha) && agulha.test(linha))
    })
    .map((caminho) => caminho.slice(RAIZ.length))
    .sort()
}

describe('porta única do Schedule-X', () => {
  it('só a porta importa `@schedule-x/*` — tela que importa direto perde a ordem do polyfill', () => {
    expect(importadores(/from '@schedule-x\//)).toEqual([PORTA])
  })

  it('o `temporal-polyfill` tem um dono só — no `main.tsx` ele volta ao chunk de entrada', () => {
    expect(importadores(/'temporal-polyfill/)).toEqual([DONO_DO_POLYFILL])
  })

  it('a porta carrega o polyfill ANTES da lib, que é a razão de ela existir', () => {
    const linhas = readFileSync(join(RAIZ, PORTA), 'utf8').split('\n')
    const polyfill = linhas.findIndex((l) => l.includes("'./temporal'"))
    const lib = linhas.findIndex((l) => /'@schedule-x\/(calendar|react)'/.test(l))
    expect(polyfill).toBeGreaterThanOrEqual(0)
    expect(lib).toBeGreaterThan(polyfill)
  })

  it('quem usa `Temporal` em runtime carrega o polyfill, sem depender de quem o importou', () => {
    const usaTemporal = arquivosDeFonte(RAIZ)
      .map((caminho) => caminho.slice(RAIZ.length))
      .filter((arquivo) => arquivo !== DONO_DO_POLYFILL)
      .filter((arquivo) => /\bTemporal\.[A-Z]/.test(semComentarios(arquivo)))
      .sort()
    for (const arquivo of usaTemporal) {
      const carrega = /'\.\/(schedule-x|temporal)'/.test(readFileSync(join(RAIZ, arquivo), 'utf8'))
      expect(carrega, `${arquivo} usa Temporal sem carregar o polyfill`).toBe(true)
    }
    expect(usaTemporal.length).toBeGreaterThan(0)
  })

  it('o CSS de lib não volta para a entrada — folha em toda página por causa de uma tela', () => {
    const main = readFileSync(join(RAIZ, 'main.tsx'), 'utf8')
    expect(main).not.toMatch(/@schedule-x/)
    expect(main).not.toMatch(/@svar-ui/)
    expect(main).not.toMatch(/temporal-polyfill/)
  })
})
