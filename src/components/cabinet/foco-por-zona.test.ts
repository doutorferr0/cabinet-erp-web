import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * FOCO POR ZONA v2 (issue #234 · 2026-08-28) — a guarda da receita.
 *
 * A v1 mirava FILHO DIRETO de `[data-zonas]`, e o defeito ficou invisível por
 * estrutura: no orçamento as seções 01–03 moram dentro do `DocumentoBloco`,
 * que é UM filho — focar o Cliente não recuava nada que o operador visse na
 * dobra. Medido na tela demo em 2026-08-28. A v2 mira `[data-slot="secao"]` e
 * `[data-slot="form-block"]` em qualquer profundidade, e o gatilho é CAMPO
 * (`:has(input:focus)`), não `:focus-within` — tabular até o Gravar não é
 * digitar, e recuar a página durante um clique de botão é ruído.
 *
 * jsdom não computa estilo; a guarda casa a RECEITA no fonte, como a
 * `identidade-visual.test.ts`. Mudar os valores é decisão de design nova:
 * atualizar aqui junto, com racional e data.
 */
const CSS = readFileSync(join(import.meta.dirname, '..', '..', 'index.css'), 'utf-8')

describe('foco por zona v2 — a seção ativa fala, as outras recuam', () => {
  it('mira os slots, nunca filho direto (a regressão que escondia o efeito)', () => {
    expect(CSS).toContain(
      '[data-zonas]:has(:is(input, select, textarea):focus)\n  :is([data-slot="secao"], [data-slot="form-block"]):not(:has(:is(input, select, textarea):focus))',
    )
    // A forma v1 não pode voltar: filho direto engole seção aninhada.
    expect(CSS).not.toContain('[data-zonas]:focus-within > *')
  })

  it('o recuo é BEM leve — 0,78 de opacidade, pedido do user de 2026-08-28', () => {
    // A v1 usava 0,72 e lia como apagão sobre o creme.
    const recuo = CSS.split(':not(:has(:is(input, select, textarea):focus))')[1] ?? ''
    expect(recuo).toContain('opacity: 0.78')
    expect(recuo).toContain('saturate(0.8)')
  })

  it('o título da seção ativa escala por transform, nunca por font-size', () => {
    expect(CSS).toContain(
      '[data-zonas] [data-slot="secao"]:has(:is(input, select, textarea):focus) h2',
    )
    expect(CSS).toContain('transform: scale(1.06)')
  })

  it('as receitas novas bebem dos tokens de ritmo e têm rede de reduced-motion', () => {
    expect(CSS).toContain('--dur-media: 200ms')
    expect(CSS).toContain('animation: painel-entra var(--dur-media) var(--ease-saida)')
    // Duas redes: transições do foco por zona e animação do painel de aba.
    const redes = CSS.split('@media (prefers-reduced-motion: reduce)')
    expect(redes.length).toBeGreaterThanOrEqual(4)
  })
})
