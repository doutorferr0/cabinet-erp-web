import { boletim } from '@/data/boletim'
import { orcamentos } from '@/mocks/orcamentos'
import { ordensCompra } from '@/mocks/ordens-compra'
import { describe, expect, it } from 'vitest'

/**
 * Trava o contrato do boletim, como `provider.test.ts` trava o dos providers.
 * Toda grandeza tem que ser DERIVADA do mock — se um número aqui divergir da
 * contagem direta, alguém inventou métrica.
 */
describe('boletim', () => {
  it('ancora na data mais recente dos documentos, não em hoje', () => {
    const b = boletim()
    const maisRecente = orcamentos
      .map((o) => o.dataEmissao)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1)

    expect(b.dataReferencia).toBe(maisRecente)
    // Formata pt-BR na borda; o dado continua ISO.
    expect(b.dataReferenciaBR).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('conta orçamentos do dia batendo com a contagem direta do mock', () => {
    const b = boletim()
    const esperado = orcamentos.filter((o) => o.dataEmissao === b.dataReferencia).length

    expect(b.orcamentosDoDia).toBe(esperado)
    expect(b.movimento.filter((m) => m.especie === 'Orçamento')).toHaveLength(esperado)
  })

  it('lista só ordens com Data Envio em branco, da mais parada para a menos', () => {
    const b = boletim()
    const esperado = ordensCompra.filter((o) => !o.dataEnvio).length

    expect(b.ordensSemEnvio).toBe(esperado)
    expect(b.semEnvio).toHaveLength(esperado)

    const dias = b.semEnvio.map((l) => l.diasParado)
    expect(dias).toEqual([...dias].sort((a, c) => c - a))
    // Derivação, não enumeração: nenhuma linha carrega nome de situação.
    for (const linha of b.semEnvio) {
      expect(linha.dataOrdem).not.toBe(null)
    }
  })

  it('valores ficam em centavos (int), nunca float', () => {
    const b = boletim()

    expect(Number.isInteger(b.valorOrcadoCentavos)).toBe(true)
    expect(Number.isInteger(b.valorOrdenadoCentavos)).toBe(true)
    for (const linha of b.movimento) {
      expect(Number.isInteger(linha.valorCentavos)).toBe(true)
    }
  })

  it('cadastros contam desativados, nunca excluídos (§9 padrão 8)', () => {
    const b = boletim()

    expect(b.cadastros.length).toBeGreaterThan(0)
    for (const linha of b.cadastros) {
      expect(linha.total).toBeGreaterThan(0)
      expect(linha.inativos).toBeLessThanOrEqual(linha.total)
    }
  })
})
