import { boletim } from '@/data/boletim'
import { URL_PARCEIROS } from '@/data/parceiros-api'
import { URL_PRODUTOS } from '@/data/produtos-api'
import { orcamentos } from '@/mocks/orcamentos'
import { ordensCompra } from '@/mocks/ordens-compra'
import { instalarServidor, json } from '@/test/servidor'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Trava o contrato do boletim, como `provider.test.ts` trava o dos providers.
 * Toda grandeza tem que ser DERIVADA do mock — se um número aqui divergir da
 * contagem direta, alguém inventou métrica.
 *
 * As linhas de CADASTROS (Clientes, Fornecedores, Profissional Externo,
 * Produtos) pedem `data.<recurso>.list`, que é HTTP de verdade — por isso o
 * teste precisa do servidor falso (`docs/integracao.md`), não só dos arrays
 * de `src/mocks/`. `/api/partners` responde igual para os três papéis: o que
 * varia por papel é o FILTRO da consulta, não a resposta, e o boletim só soma
 * total/inativos — não precisa diferenciar quem é cliente de quem é fornecedor.
 */

function servidorDeCadastros() {
  return instalarServidor({
    [URL_PARCEIROS]: () =>
      json({
        rows: [
          { id: 'p1', active: true },
          { id: 'p2', active: false },
        ],
        total: 2,
      }),
    [URL_PRODUTOS]: () =>
      json({
        rows: [
          { id: 'pr1', active: true },
          { id: 'pr2', active: true },
          { id: 'pr3', active: false },
        ],
        total: 3,
      }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('boletim', () => {
  it('ancora na data mais recente dos documentos, não em hoje', async () => {
    servidorDeCadastros()
    const b = await boletim()
    const maisRecente = orcamentos
      .map((o) => o.dataEmissao)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1)

    expect(b.dataReferencia).toBe(maisRecente)
    // Formata pt-BR na borda; o dado continua ISO.
    expect(b.dataReferenciaBR).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('conta orçamentos do dia batendo com a contagem direta do mock', async () => {
    servidorDeCadastros()
    const b = await boletim()
    const esperado = orcamentos.filter((o) => o.dataEmissao === b.dataReferencia).length

    expect(b.orcamentosDoDia).toBe(esperado)
    expect(b.movimento.filter((m) => m.especie === 'Orçamento')).toHaveLength(esperado)
  })

  it('lista só ordens com Data Envio em branco, da mais parada para a menos', async () => {
    servidorDeCadastros()
    const b = await boletim()
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

  it('valores ficam em centavos (int), nunca float', async () => {
    servidorDeCadastros()
    const b = await boletim()

    expect(Number.isInteger(b.valorOrcadoCentavos)).toBe(true)
    expect(Number.isInteger(b.valorOrdenadoCentavos)).toBe(true)
    for (const linha of b.movimento) {
      expect(Number.isInteger(linha.valorCentavos)).toBe(true)
    }
  })

  it('cadastros de parceiro e produto contam pela MESMA fonte da listagem (HTTP)', async () => {
    servidorDeCadastros()
    const b = await boletim()

    expect(b.cadastros.length).toBeGreaterThan(0)
    for (const linha of b.cadastros) {
      expect(linha.total).toBeGreaterThan(0)
      expect(linha.inativos).toBeLessThanOrEqual(linha.total)
    }

    // Clientes, Fornecedores e Profissional Externo pedem `/api/partners`
    // (total: 2, 1 inativo no stub); Produtos pede `/api/products` (total: 3,
    // 1 inativo). Colaboradores segue mock (array direto), sem chamada HTTP.
    const porNome = Object.fromEntries(b.cadastros.map((l) => [l.nome, l]))
    expect(porNome.Clientes).toMatchObject({ total: 2, inativos: 1 })
    expect(porNome.Fornecedores).toMatchObject({ total: 2, inativos: 1 })
    expect(porNome['Profissional Externo']).toMatchObject({ total: 2, inativos: 1 })
    expect(porNome.Produtos).toMatchObject({ total: 3, inativos: 1 })
  })
})
