import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * §Movimento da 2.0 (#498 D30, comentário Rodada 4 da #469) — a régua em teste.
 *
 * O corte da rodada não é "menos animação": é **entrada fora, reação dentro**.
 * Movimento que o operador não pediu (a tela subindo na montagem) atrasa a
 * primeira leitura de quem abre o mesmo documento vinte vezes por dia; movimento
 * que responde a um gesto (a tecla afundando sob o dedo) é retorno, e fica.
 *
 * Isto se afirma sobre o CSS-FONTE e não sobre um render: as três regras vivem
 * em `@utility`/`@media`, que o jsdom não resolve — `getComputedStyle` num teste
 * de componente devolveria vazio e passaria verde com o movimento de volta.
 */
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8')

function utility(nome: string) {
  const inicio = css.indexOf(`@utility ${nome} {`)
  expect(inicio, `utility ${nome} não existe`).toBeGreaterThan(-1)
  return css.slice(inicio, css.indexOf('\n}\n', inicio))
}

describe('§Movimento 2.0', () => {
  it('não anima a entrada de tela', () => {
    // A cascata `zona-sobe` levantava as zonas do documento em degraus de 60ms.
    expect(css).not.toContain('zona-sobe')
  })

  it('a peça lisa — item de menu, aba — não pula mais no hover', () => {
    const flat = utility('lift-flat')
    expect(flat).not.toContain('transform:')
    // O que sobrou é o canal que não desloca: sombra e traço.
    expect(flat).toContain('box-shadow: var(--shadow-el2)')
  })

  it('a tecla mantém o lift, que é resposta ao gesto', () => {
    const control = utility('lift-control')
    expect(control).toContain('transform: translate(-2px, -2px)')
    expect(control).toContain('transform: translate(2px, 2px)')
  })

  it('movimento reduzido é guarda do documento, não de cada peça', () => {
    const bloco = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
    expect(bloco).toMatch(/\*,\s*\*::before,\s*\*::after/)
    expect(bloco).toContain('animation-duration: 0.01ms !important')
    expect(bloco).toContain('transition-duration: 0.01ms !important')
    // `none` apagaria o quadro final de quem PINTA com keyframe (barra, fill).
    expect(bloco).not.toContain('animation: none')
  })
})
