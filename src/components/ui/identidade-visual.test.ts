import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A GUARDA DA UNIÃO POLARIS + CABINET (decisão do user, 2026-08-18).
 *
 * A leva Polaris trouxe superfícies, raios e densidade prontos — e no caminho
 * levou junto três peças que são a identidade deste sistema: o contorno preto,
 * o anel de foco amarelo e a receita que dá contraste ao anel. Nenhuma delas
 * caiu por decisão: caíram porque o valor de um token mudou e ninguém tinha
 * como saber que aquele valor era carregado.
 *
 * Por que ESTE teste existe, e não uma linha a mais no DESIGN.md: a regra já
 * estava escrita na página quando foi desfeita. Página não reprova build.
 *
 * O que este arquivo NÃO faz: medir contraste. jsdom não roda o Tailwind e
 * `getComputedStyle` devolveria string vazia. Número mora em
 * `docs/design/medir-contraste.py --conferir`, que é passo do CI.
 */

const CSS = readFileSync(join(import.meta.dirname, '..', '..', 'index.css'), 'utf-8')

/**
 * Lê o valor de um token dentro de um bloco. `:root` é o tema claro, `.dark` o
 * escuro e `@theme inline` é onde moram famílias, raios e sombras — que não
 * viram por tema.
 */
function token(bloco: ':root' | '.dark' | '@theme inline', nome: string): string {
  const corpo = CSS.split(`${bloco} {`)[1]?.split('\n}')[0] ?? ''
  const achado = corpo.match(new RegExp(`--${nome}\\s*:\\s*([^;]+);`))
  const valor = achado?.[1]
  if (valor === undefined) throw new Error(`token --${nome} não existe em ${bloco}`)
  return valor.trim()
}

describe('identidade visual — o que a próxima leva de UI não pode levar junto', () => {
  it('o traço é PRETO DE TINTA, não um cinza sutil', () => {
    // 18,76:1 sobre o cartão branco. A leva Polaris o deixou em `0 0% 55%`
    // (3,35:1) e a caixa desenhada a tinta — a identidade do Cabinet — virou
    // sugestão. Vale para TUDO que é caixa, inclusive a divisão entre linhas
    // da grade: `--border` tem um dono só de propósito.
    expect(token(':root', 'border')).toBe('0 0% 7%')
    expect(token(':root', 'input')).toBe('0 0% 7%')
  })

  it('quem NÃO é caixa continua no fio cinza', () => {
    // Separador de menu, trilho da sidebar, divisão interna de popover. Trocar
    // um pelo outro é o erro que transforma menu em grade.
    expect(token(':root', 'rule-hair')).toBe('0 0% 72%')
  })

  it('o anel de foco é AMARELO nos dois temas', () => {
    // O azul Polaris #005BD3 (`213 100% 41%`) ocupou este token e saiu: ele
    // passava sozinho e por isso pareceu equivalente, mas trocou a marca de
    // foco que o operador reconhece de longe por um anel de admin genérico.
    expect(token(':root', 'ring')).toBe('47 100% 50%')
    expect(token('.dark', 'ring')).toBe('47 100% 55%')
  })

  it('o anel amarelo anda com o fio preto que dá contraste a ele', () => {
    // Amarelo sozinho: 1,56:1 sobre o cartão — a WCAG 1.4.11 pede 3:1. Quem
    // cumpre é o `box-shadow` da tinta, por fora. Tirar o fio e manter o
    // amarelo é o mesmo defeito de acessibilidade, sem aviso nenhum.
    const receita = CSS.split('@utility focus-ring {')[1]?.split('}')[0] ?? ''
    expect(receita).toContain('outline: 3px solid hsl(var(--ring))')
    expect(receita).toContain('box-shadow: 0 0 0 4px hsl(var(--foreground))')
  })

  it('as quatro vozes tipográficas continuam de pé', () => {
    // Regra SEMÂNTICA, não decorativa: nome próprio em serifa, título em
    // display, corpo em sans, identificador e número em mono. Teto de 4
    // famílias — a quinta paga carga sem dizer nada novo.
    expect(token('@theme inline', 'font-nome')).toContain('Newsreader')
    expect(token('@theme inline', 'font-display')).toContain('Sora')
    expect(token('@theme inline', 'font-sans')).toContain('Inter')
    expect(token('@theme inline', 'font-mono')).toContain('PT Mono')
  })

  it('a sombra é hard-offset e nunca preta', () => {
    // Sombra preta vira buraco na tela; a família neutra-fria projeta como
    // papel sobre papel. Blur aqui seria a sombra de outro sistema.
    const el2 = token('@theme inline', 'shadow-el2')
    expect(el2).toBe('3px 3px 0 0 hsl(var(--shadow-2))')
    expect(token(':root', 'shadow-2')).not.toBe('0 0% 0%')
  })
})
